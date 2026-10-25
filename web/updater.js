const UPDATE_ENDPOINT = "/api/actualizar";
const STOP_ENDPOINT = "/api/detener";
const UPDATE_POLL_MS = 2000;

let updatePollTimer = null;

function formatUpdateTimestamp(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes <= 0) return `${remaining}s`;
  return `${minutes}m ${remaining}s`;
}

function setUpdateButtonState(running) {
  const btn = document.querySelector("#updateDataBtn");
  const stopBtn = document.querySelector("#stopUpdateBtn");
  if (btn) {
    btn.disabled = running;
    btn.textContent = running ? "Actualizando..." : "Actualizar datos";
  }
  if (stopBtn) {
    stopBtn.hidden = !running;
    stopBtn.disabled = false;
    stopBtn.textContent = "Detener";
  }
}

function setUpdateStatusMessage(text, tone) {
  const el = document.querySelector("#updateStatus");
  if (!el) return;
  if (!text) {
    el.hidden = true;
    el.textContent = "";
    return;
  }
  el.hidden = false;
  el.textContent = text;
  el.dataset.tone = tone || "info";
}

function setUpdateProgress(visible, porcentaje, iniciadoISO) {
  const wrap = document.querySelector("#updateProgress");
  const fill = document.querySelector("#updateProgressFill");
  const percentEl = document.querySelector("#updateProgressPercent");
  const timeEl = document.querySelector("#updateProgressTime");
  if (!wrap || !fill || !percentEl || !timeEl) return;

  if (!visible) {
    wrap.hidden = true;
    return;
  }

  wrap.hidden = false;
  const pct = Math.max(0, Math.min(100, porcentaje || 0));
  fill.style.width = `${pct}%`;
  percentEl.textContent = `${pct.toFixed(0)}%`;

  if (iniciadoISO) {
    const inicio = new Date(iniciadoISO).getTime();
    const ahora = Date.now();
    if (!Number.isNaN(inicio)) {
      const transcurridoSeg = (ahora - inicio) / 1000;
      let texto = `Transcurrido: ${formatDuration(transcurridoSeg)}`;
      if (pct > 3 && pct < 100) {
        const restanteSeg = (transcurridoSeg / pct) * (100 - pct);
        texto += ` | Restante estimado: ~${formatDuration(restanteSeg)}`;
      }
      timeEl.textContent = texto;
      return;
    }
  }
  timeEl.textContent = "";
}

async function pollUpdateStatus() {
  try {
    const response = await fetch(UPDATE_ENDPOINT, { cache: "no-store" });
    const estado = await response.json();

    if (estado.en_progreso) {
      setUpdateButtonState(true);
      const etapa = estado.etapa || "Consultando cines, esto puede tardar unos minutos...";
      setUpdateStatusMessage(etapa, "info");
      setUpdateProgress(true, estado.porcentaje, estado.iniciado);
      if (!updatePollTimer) {
        updatePollTimer = setInterval(pollUpdateStatus, UPDATE_POLL_MS);
      }
      return;
    }

    clearInterval(updatePollTimer);
    updatePollTimer = null;
    setUpdateButtonState(false);
    setUpdateProgress(false);

    if (estado.cancelado) {
      setUpdateStatusMessage("Actualizacion detenida. Los datos anteriores no se modificaron.", "info");
      return;
    }

    if (estado.error) {
      setUpdateStatusMessage(`No se pudo actualizar: ${estado.error.slice(0, 160)}`, "error");
      return;
    }

    if (estado.finalizado) {
      setUpdateStatusMessage(`Datos actualizados: ${formatUpdateTimestamp(estado.finalizado)}`, "success");
      if (typeof loadData === "function") {
        await loadData();
      }
    } else {
      setUpdateStatusMessage("", "info");
    }
  } catch (error) {
    clearInterval(updatePollTimer);
    updatePollTimer = null;
    setUpdateButtonState(false);
    setUpdateProgress(false);
    setUpdateStatusMessage(`Error consultando el estado: ${error.message}`, "error");
  }
}

const esc = (v) => (typeof escapeHTML === "function" ? escapeHTML(v) : v);

let ubicacionesCache = { ciudades: [], sedes: [] };
let sedesSeleccionadasSet = new Set();

function renderSedesFiltradas() {
  const selProvincia = document.querySelector("#updateProvincia");
  const provinciaInfo = document.querySelector("#updateProvinciaInfo");
  const sedesCount = document.querySelector("#updateSedesCount");
  const customList = document.querySelector("#customSedesList");
  const selSedesHidden = document.querySelector("#updateSedes");
  const searchInput = document.querySelector("#customSedesSearch");
  const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : "";

  const provincia = selProvincia ? selProvincia.value.trim() : "";
  const provNorm = provincia.toLowerCase();

  // 1. Filtrar sedes por provincia
  let sedesFiltradas = ubicacionesCache.sedes || [];
  if (provincia) {
    sedesFiltradas = sedesFiltradas.filter((s) => {
      const c = (s.ciudad || "").toLowerCase().trim();
      return c === provNorm || (provNorm === "lima" && c === "callao");
    });
  }

  // 2. Actualizar banner explicativo
  if (provinciaInfo) {
    if (provincia) {
      provinciaInfo.className = "update-provincia-banner is-active";
      provinciaInfo.innerHTML = `
        <span class="banner-icon">💡</span>
        <div>
          <strong>Alcance configurado: ${esc(provincia)}</strong>
          <p>Se sincronizarán automáticamente todas las <strong>${sedesFiltradas.length} sedes</strong> de esta provincia en las 6 cadenas sin requerir selección manual. Usa el selector inferior solo si deseas limitar la extracción a sedes específicas.</p>
        </div>
      `;
    } else {
      provinciaInfo.className = "update-provincia-banner is-national";
      provinciaInfo.innerHTML = `
        <span class="banner-icon">🌎</span>
        <div>
          <strong>Alcance Nacional:</strong> Se extraerán todas las sedes del país (${(ubicacionesCache.sedes || []).length} sedes en ${(ubicacionesCache.ciudades || []).length} ciudades).
        </div>
      `;
    }
  }

  // 3. Limpiar selecciones que no pertenezcan a la provincia actual
  const nombresValidos = new Set(sedesFiltradas.map((s) => s.nombre));
  for (const sName of Array.from(sedesSeleccionadasSet)) {
    if (!nombresValidos.has(sName)) {
      sedesSeleccionadasSet.delete(sName);
    }
  }

  // 4. Actualizar contador
  if (sedesCount) {
    if (sedesSeleccionadasSet.size > 0) {
      sedesCount.textContent = `${sedesSeleccionadasSet.size} sede(s) específica(s) seleccionada(s)`;
      sedesCount.className = "update-sedes-counter is-customized";
    } else {
      sedesCount.textContent = provincia
        ? `Todas las de ${provincia} (${sedesFiltradas.length} sedes)`
        : `Todas las del país (${sedesFiltradas.length} sedes)`;
      sedesCount.className = "update-sedes-counter";
    }
  }

  // 5. Renderizar lista de sedes con checkboxes y buscador
  if (customList) {
    let sedesParaMostrar = sedesFiltradas;
    if (searchVal) {
      sedesParaMostrar = sedesParaMostrar.filter((s) =>
        (s.nombre || "").toLowerCase().includes(searchVal) ||
        (s.cadena || "").toLowerCase().includes(searchVal) ||
        (s.ciudad || "").toLowerCase().includes(searchVal)
      );
    }

    if (!sedesParaMostrar.length) {
      customList.innerHTML = `<p class="custom-sedes-empty">No se encontraron sedes que coincidan con la búsqueda.</p>`;
    } else {
      customList.innerHTML = sedesParaMostrar.map((s) => {
        const isChecked = sedesSeleccionadasSet.has(s.nombre);
        const cadClass = (s.cadena || "").toLowerCase().replace(/\s+/g, "");
        return `
          <label class="custom-sede-item ${isChecked ? "is-checked" : ""}">
            <input type="checkbox" class="custom-sede-cb" value="${esc(s.nombre)}" ${isChecked ? "checked" : ""}>
            <div class="custom-sede-info">
              <span class="custom-sede-name">${esc(s.nombre)}</span>
              <div class="custom-sede-meta">
                <span class="chain-badge chain-badge-${cadClass}">${esc(s.cadena)}</span>
                <span class="custom-sede-city">${esc(s.ciudad)}</span>
              </div>
            </div>
          </label>
        `;
      }).join("");
    }
  }

  // 6. Sincronizar select oculto para el request POST /api/actualizar
  if (selSedesHidden) {
    selSedesHidden.innerHTML = sedesFiltradas
      .map((s) => `<option value="${esc(s.nombre)}" ${sedesSeleccionadasSet.has(s.nombre) ? "selected" : ""}>${esc(s.nombre)}</option>`)
      .join("");
  }
}

function aplicarUbicaciones(datos) {
  ubicacionesCache = datos || { ciudades: [], sedes: [] };
  const selProvincia = document.querySelector("#updateProvincia");

  if (selProvincia && ubicacionesCache.ciudades) {
    const seleccionActual = selProvincia.value;
    const primeraOpcion = '<option value="">País completo (todas las provincias)</option>';
    const opcionesHTML = ubicacionesCache.ciudades
      .map((ciudad) => `<option value="${esc(ciudad)}">${esc(ciudad)}</option>`)
      .join("");
    selProvincia.innerHTML = `${primeraOpcion}${opcionesHTML}`;
    if (ubicacionesCache.ciudades.includes(seleccionActual)) {
      selProvincia.value = seleccionActual;
    }
  }

  renderSedesFiltradas();
}

async function cargarUbicaciones(forzar) {
  try {
    const response = await fetch(`/api/ubicaciones${forzar ? "?forzar=1" : ""}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const datos = await response.json();
    aplicarUbicaciones(datos);
  } catch (error) {
    // Si falla, se mantiene la opción país completo
  }
}

async function iniciarActualizacion() {
  const provinciaSel = document.querySelector("#updateProvincia");
  const disponibilidadCheck = document.querySelector("#updateDisponibilidad");
  const diasInput = document.querySelector("#updateDias");
  
  // Si sedesSeleccionadasSet tiene elementos, solo se envían esas sedes específicas.
  // Si está vacío, se envía [] y el backend extrae automáticamente TODAS las sedes de la provincia seleccionada.
  const sedesArray = Array.from(sedesSeleccionadasSet);

  const opciones = {
    provincia: provinciaSel ? provinciaSel.value.trim() : "",
    sedes: sedesArray,
    disponibilidad: disponibilidadCheck ? disponibilidadCheck.checked : true,
    dias: diasInput && diasInput.value ? Number(diasInput.value) : null,
  };

  setUpdateButtonState(true);
  setUpdateStatusMessage("Iniciando actualizacion...", "info");
  setUpdateProgress(true, 0, null);
  try {
    const response = await fetch(UPDATE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opciones),
    });
    if (response.status === 409) {
      setUpdateStatusMessage("Ya hay una actualizacion en curso.", "info");
    } else if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    if (updatePollTimer) clearInterval(updatePollTimer);
    updatePollTimer = setInterval(pollUpdateStatus, UPDATE_POLL_MS);
    pollUpdateStatus();
  } catch (error) {
    setUpdateButtonState(false);
    setUpdateProgress(false);
    setUpdateStatusMessage(`No se pudo iniciar la actualizacion (${error.message}). Usa server.py para levantar el sitio.`, "error");
  }
}

async function detenerActualizacion() {
  const stopBtn = document.querySelector("#stopUpdateBtn");
  if (stopBtn) {
    stopBtn.disabled = true;
    stopBtn.textContent = "Deteniendo...";
  }
  try {
    const response = await fetch(STOP_ENDPOINT, { method: "POST" });
    if (!response.ok && response.status !== 400) {
      throw new Error(`HTTP ${response.status}`);
    }
    pollUpdateStatus();
  } catch (error) {
    setUpdateStatusMessage(`No se pudo detener (${error.message}).`, "error");
    if (stopBtn) {
      stopBtn.disabled = false;
      stopBtn.textContent = "Detener";
    }
  }
}

function initUpdater() {
  const btn = document.querySelector("#updateDataBtn");
  const stopBtn = document.querySelector("#stopUpdateBtn");
  const toggleOptionsBtn = document.querySelector("#toggleUpdateOptionsBtn");
  const optionsPanel = document.querySelector("#updateOptionsPanel");
  const selProvincia = document.querySelector("#updateProvincia");
  const toggleCustomSedesBtn = document.querySelector("#toggleCustomSedesBtn");
  const customSedesPanel = document.querySelector("#customSedesPanel");
  const customSedesSearch = document.querySelector("#customSedesSearch");
  const customSedesSearchClear = document.querySelector("#customSedesSearchClear");
  const btnSelectAllSedes = document.querySelector("#btnSelectAllSedes");
  const btnClearAllSedes = document.querySelector("#btnClearAllSedes");
  const customSedesList = document.querySelector("#customSedesList");

  if (!btn) return;
  btn.addEventListener("click", iniciarActualizacion);
  if (stopBtn) {
    stopBtn.addEventListener("click", detenerActualizacion);
  }
  if (toggleOptionsBtn && optionsPanel) {
    toggleOptionsBtn.addEventListener("click", () => {
      const abierto = !optionsPanel.hidden;
      optionsPanel.hidden = abierto;
      toggleOptionsBtn.setAttribute("aria-expanded", String(!abierto));
    });
  }

  // Cambio reactivo de provincia -> filtra automáticamente sedes correspondientes
  if (selProvincia) {
    selProvincia.addEventListener("change", () => {
      sedesSeleccionadasSet.clear();
      renderSedesFiltradas();
    });
  }

  // Desplegar panel opcional de selección de sedes específicas
  if (toggleCustomSedesBtn && customSedesPanel) {
    toggleCustomSedesBtn.addEventListener("click", () => {
      const abierto = !customSedesPanel.hidden;
      customSedesPanel.hidden = abierto;
      toggleCustomSedesBtn.setAttribute("aria-expanded", String(!abierto));
      toggleCustomSedesBtn.querySelector("span").textContent = abierto
        ? "Filtrar sedes específicas ▾"
        : "Ocultar sedes específicas ▴";
      if (!abierto && customSedesSearch) {
        customSedesSearch.focus();
      }
    });
  }

  // Buscador de sedes en vivo
  if (customSedesSearch) {
    customSedesSearch.addEventListener("input", (e) => {
      const q = e.target.value;
      if (customSedesSearchClear) customSedesSearchClear.hidden = !q;
      renderSedesFiltradas();
    });
  }

  if (customSedesSearchClear && customSedesSearch) {
    customSedesSearchClear.addEventListener("click", () => {
      customSedesSearch.value = "";
      customSedesSearchClear.hidden = true;
      renderSedesFiltradas();
      customSedesSearch.focus();
    });
  }

  // Botón: Seleccionar todas las sedes visibles de la provincia
  if (btnSelectAllSedes) {
    btnSelectAllSedes.addEventListener("click", () => {
      const checkboxes = document.querySelectorAll("#customSedesList .custom-sede-cb");
      checkboxes.forEach((cb) => {
        sedesSeleccionadasSet.add(cb.value);
      });
      renderSedesFiltradas();
    });
  }

  // Botón: Desmarcar todas
  if (btnClearAllSedes) {
    btnClearAllSedes.addEventListener("click", () => {
      sedesSeleccionadasSet.clear();
      renderSedesFiltradas();
    });
  }

  // Checkboxes de sedes individuales
  if (customSedesList) {
    customSedesList.addEventListener("change", (e) => {
      const cb = e.target.closest(".custom-sede-cb");
      if (!cb) return;
      if (cb.checked) {
        sedesSeleccionadasSet.add(cb.value);
      } else {
        sedesSeleccionadasSet.delete(cb.value);
      }
      renderSedesFiltradas();
    });
  }

  const refrescarBtn = document.querySelector("#refrescarUbicacionesBtn");
  if (refrescarBtn) {
    refrescarBtn.addEventListener("click", async () => {
      refrescarBtn.disabled = true;
      refrescarBtn.textContent = "Actualizando...";
      await cargarUbicaciones(true);
      refrescarBtn.disabled = false;
      refrescarBtn.textContent = "↻ actualizar lista";
    });
  }

  pollUpdateStatus();
  cargarUbicaciones(false);
}

document.addEventListener("DOMContentLoaded", initUpdater);
