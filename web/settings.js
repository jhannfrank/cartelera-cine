const TEMA_KEY = "pref_tema";
const FUENTE_KEY = "pref_fuente";

function leerPreferencia(key, porDefecto) {
  try {
    return localStorage.getItem(key) || porDefecto;
  } catch (e) {
    return porDefecto;
  }
}

function guardarPreferencia(key, valor) {
  try {
    localStorage.setItem(key, valor);
  } catch (e) {
    // almacenamiento no disponible (modo privado, etc.); la app sigue funcionando
  }
}

function aplicarTema(valor) {
  const root = document.documentElement;
  if (valor === "light" || valor === "oled") {
    root.setAttribute("data-theme", valor);
  } else {
    root.removeAttribute("data-theme");
  }
}

function sincronizarTemaSistema() {
  const preferencia = leerPreferencia(TEMA_KEY, "sistema");
  if (preferencia !== "sistema") return;
  document.documentElement.removeAttribute("data-theme");
}

window.aplicarTema = aplicarTema;
window.guardarPreferencia = guardarPreferencia;
window.TEMA_KEY = TEMA_KEY;

function aplicarFuente(valor) {
  const root = document.documentElement;
  if (valor === "estandar") {
    root.setAttribute("data-font", "estandar");
  } else {
    root.removeAttribute("data-font");
  }
}

function marcarActivo(grupo, valorActivo) {
  grupo.querySelectorAll(".segmented-opt").forEach((btn) => {
    const activo = btn.dataset.valor === valorActivo;
    btn.classList.toggle("is-active", activo);
    btn.setAttribute("aria-checked", String(activo));
  });
}

function initSettings() {
  const temaGrupo = document.querySelector("#temaSegmented");
  const fuenteGrupo = document.querySelector("#fuenteSegmented");
  const toggleBtn = document.querySelector("#toggleSettingsBtn");
  const panel = document.querySelector("#settingsPanel");

  let temaGuardado = leerPreferencia(TEMA_KEY, "sistema");
  if (temaGuardado === "dark") {
    temaGuardado = "oled";
    guardarPreferencia(TEMA_KEY, "oled");
  }
  const fuenteGuardada = leerPreferencia(FUENTE_KEY, "mono");

  if (temaGuardado === "sistema") {
    sincronizarTemaSistema();
  } else if (temaGuardado === "light" || temaGuardado === "oled") {
    aplicarTema(temaGuardado);
  }

  if (window.matchMedia) {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const cambiarTemaSistema = () => {
      if (leerPreferencia(TEMA_KEY, "sistema") === "sistema") {
        sincronizarTemaSistema();
      }
    };
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", cambiarTemaSistema);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(cambiarTemaSistema);
    }
  }

  if (temaGrupo) {
    marcarActivo(temaGrupo, temaGuardado);
    temaGrupo.addEventListener("click", (event) => {
      const btn = event.target.closest(".segmented-opt");
      if (!btn) return;
      const valor = btn.dataset.valor;
      if (valor === "sistema") {
        sincronizarTemaSistema();
      } else {
        aplicarTema(valor);
      }
      guardarPreferencia(TEMA_KEY, valor);
      marcarActivo(temaGrupo, valor);
    });
  }

  if (fuenteGrupo) {
    marcarActivo(fuenteGrupo, fuenteGuardada);
    fuenteGrupo.addEventListener("click", (event) => {
      const btn = event.target.closest(".segmented-opt");
      if (!btn) return;
      const valor = btn.dataset.valor;
      aplicarFuente(valor);
      guardarPreferencia(FUENTE_KEY, valor);
      marcarActivo(fuenteGrupo, valor);
    });
  }

  if (toggleBtn && panel) {
    toggleBtn.addEventListener("click", () => {
      const abierto = !panel.hidden;
      panel.hidden = abierto;
      toggleBtn.setAttribute("aria-expanded", String(!abierto));
    });
  }
}

document.addEventListener("DOMContentLoaded", initSettings);
