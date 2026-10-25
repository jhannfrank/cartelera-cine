const state = {
  peliculas: [],
  filtered: [],
  filters: {},
  viewMode: "cinematic",
  scrapedAt: null,
  tableSort: { key: "default", dir: 1 },
  tableFilterText: "",
  groupByFormato: false,
};

const VIEWS_SIN_AGRUPAR = new Set(["calendar", "heatmap", "cinematic"]);

const els = {
  searchInput: document.querySelector("#searchInput"),
  genreFilter: document.querySelector("#genreFilter"),
  languageFilter: document.querySelector("#languageFilter"),
  formatFilter: document.querySelector("#formatFilter"),
  chainFilter: document.querySelector("#chainFilter"),
  cityFilter: document.querySelector("#cityFilter"),
  venueFilter: document.querySelector("#venueFilter"),
  dayFilter: document.querySelector("#dayFilter"),
  timeFromFilter: document.querySelector("#timeFromFilter"),
  timeToFilter: document.querySelector("#timeToFilter"),
  sortBy: document.querySelector("#sortBy"),
  viewMode: document.querySelector("#viewMode"),
  viewModeExtra: document.querySelector("#viewModeExtra"),
  openReportBtn: document.querySelector("#openReportBtn"),
  openReportBtnFilters: document.querySelector("#openReportBtnFilters"),
  exportMenuBtn: document.querySelector("#exportMenuBtn"),
  exportDropdownMenu: document.querySelector("#exportDropdownMenu"),
  reportModal: document.querySelector("#reportModal"),
  closeReportBtn: document.querySelector("#closeReportBtn"),
  printReportBtn: document.querySelector("#printReportBtn"),
  downloadReportPdfBtn: document.querySelector("#downloadReportPdfBtn"),
  shareReportMobileBtn: document.querySelector("#shareReportMobileBtn"),
  copySummaryBtn: document.querySelector("#copySummaryBtn"),
  reportModalBody: document.querySelector("#reportModalBody"),
  reportMeta: document.querySelector("#reportMeta"),
  shareReportImageBtn: document.querySelector("#shareReportImageBtn"),
  exportPdfBtn: document.querySelector("#exportPdfBtn"),
  exportCsvBtn: document.querySelector("#exportCsvBtn"),
  exportXlsxBtn: document.querySelector("#exportXlsxBtn"),
  captureBtn: document.querySelector("#captureBtn"),
  shareMobileBtn: document.querySelector("#shareMobileBtn"),
  clearFiltersBtn: document.querySelector("#clearFiltersBtn"),
  activeFilters: document.querySelector("#activeFilters"),
  results: document.querySelector("#results"),
  resultSummary: document.querySelector("#resultSummary"),
  movieTemplate: document.querySelector("#movieTemplate"),
  scrapedAt: document.querySelector("#scrapedAt"),
  quickPillsBar: document.querySelector("#quickPillsBar"),
  pillChainAll: document.querySelector("#pillChainAll"),
  pillToday: document.querySelector("#pillToday"),
  pillTomorrow: document.querySelector("#pillTomorrow"),
  pillMatine: document.querySelector("#pillMatine"),
  pillNoche: document.querySelector("#pillNoche"),
  pillDubbed: document.querySelector("#pillDubbed"),
  pillSubbed: document.querySelector("#pillSubbed"),
  pillImax: document.querySelector("#pillImax"),
  pillCineplanet: document.querySelector("#pillCineplanet"),
  pillCinemark: document.querySelector("#pillCinemark"),
  pillCinepolis: document.querySelector("#pillCinepolis"),
  pillCineStar: document.querySelector("#pillCineStar"),
  pillMovieTime: document.querySelector("#pillMovieTime"),
  pillUVK: document.querySelector("#pillUVK"),
  pillClear: document.querySelector("#pillClear"),
  searchClearBtn: document.querySelector("#searchClearBtn"),
  scrollTopBtn: document.querySelector("#scrollTopBtn"),
  mobileStickyNav: document.querySelector("#mobileStickyNav"),
  mobileToggleFiltersBtn: document.querySelector("#mobileToggleFiltersBtn"),
  mobileTodayNavBtn: document.querySelector("#mobileTodayNavBtn"),
  mobileReportNavBtn: document.querySelector("#mobileReportNavBtn"),
  mobileTopNavBtn: document.querySelector("#mobileTopNavBtn"),
  mobileFilterBadge: document.querySelector("#mobileFilterBadge"),
  toggleFiltersBtn: document.querySelector("#toggleFiltersBtn"),
  filtersPanel: document.querySelector("#filtersPanel"),
};

function formatScrapedAt(isoString) {
  if (!isoString) return "Hora no disponible";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function renderDataFreshnessBadge(isoString) {
  if (!els.scrapedAt) return;
  if (!isoString) {
    els.scrapedAt.className = "hero-timestamp freshness-box freshness-unknown";
    els.scrapedAt.innerHTML = `
      <span class="freshness-dot"></span>
      <span class="freshness-meta">Fecha de sincronización no registrada</span>
    `;
    return;
  }

  const scrapedDate = new Date(isoString);
  if (Number.isNaN(scrapedDate.getTime())) {
    els.scrapedAt.className = "hero-timestamp";
    els.scrapedAt.textContent = `Datos obtenidos: ${isoString}`;
    return;
  }

  const now = new Date();
  const isToday =
    scrapedDate.getFullYear() === now.getFullYear() &&
    scrapedDate.getMonth() === now.getMonth() &&
    scrapedDate.getDate() === now.getDate();

  const startScraped = new Date(scrapedDate.getFullYear(), scrapedDate.getMonth(), scrapedDate.getDate());
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((startNow - startScraped) / (1000 * 60 * 60 * 24));

  const timeFormatted = new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(scrapedDate);

  const dateFormatted = new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
  }).format(scrapedDate);

  if (isToday) {
    els.scrapedAt.className = "hero-timestamp freshness-box is-fresh";
    els.scrapedAt.setAttribute("title", `Cartelera sincronizada el día de hoy (${dateFormatted} a las ${timeFormatted}).`);
    els.scrapedAt.innerHTML = `
      <span class="freshness-dot pulse-green" aria-hidden="true"></span>
      <div class="freshness-details">
        <span class="freshness-status-title">DATA DEL DÍA DE HOY</span>
        <span class="freshness-meta">${dateFormatted} • ${timeFormatted}</span>
      </div>
      <span class="freshness-pill-badge pill-fresh">🟢 Cartelera al día</span>
    `;
  } else {
    const diffLabel = diffDays === 1 ? "Ayer" : (diffDays > 1 ? `Hace ${diffDays} días` : "Fecha anterior");
    els.scrapedAt.className = "hero-timestamp freshness-box is-stale";
    els.scrapedAt.setAttribute("title", `Atención: La cartelera guardada es de otra fecha (${dateFormatted} • ${diffLabel}). Se recomienda actualizar.`);
    els.scrapedAt.innerHTML = `
      <span class="freshness-dot pulse-amber" aria-hidden="true"></span>
      <div class="freshness-details">
        <span class="freshness-status-title status-warning">DATA DE OTRA FECHA (${diffLabel.toUpperCase()})</span>
        <span class="freshness-meta">${dateFormatted} • ${timeFormatted}</span>
      </div>
      <span class="freshness-pill-badge pill-stale">⚠️ Desactualizada</span>
      <button type="button" class="btn-freshness-refresh" id="quickFreshnessBtn" title="Actualizar datos a hoy">
        ⚡ Actualizar a hoy
      </button>
    `;
    const qBtn = els.scrapedAt.querySelector("#quickFreshnessBtn");
    if (qBtn) {
      qBtn.addEventListener("click", () => {
        if (els.updateDataBtn) els.updateDataBtn.click();
      });
    }
  }
}

const norm = (value) =>
  (value ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const uniqueSorted = (values) =>
  [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));

const escapeHTML = (value) =>
  (value ?? "")
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

function safeUrl(url) {
  if (!url || typeof url !== "string") return "#";
  let trimmed = url.trim();
  if (window.location.protocol === "https:" && trimmed.startsWith("http://")) {
    trimmed = "https://" + trimmed.slice(7);
  }
  if (/^(?:https?:\/\/|\/|#|data:image\/)/i.test(trimmed)) {
    return escapeHTML(trimmed);
  }
  return "#";
}

function announceToScreenReader(message) {
  let announcer = document.getElementById("aria-announcer");
  if (!announcer) {
    announcer = document.createElement("div");
    announcer.id = "aria-announcer";
    announcer.className = "sr-only";
    announcer.setAttribute("aria-live", "polite");
    announcer.setAttribute("aria-atomic", "true");
    document.body.appendChild(announcer);
  }
  announcer.textContent = "";
  // Pequeño timeout para forzar al sintetizador de accesibilidad a re-anunciar
  setTimeout(() => {
    announcer.textContent = message;
  }, 50);
}

function highlightText(text, query) {
  if (!text) return "";
  if (!query || !query.trim()) return escapeHTML(text);
  const cleanQuery = norm(query.trim());
  if (!cleanQuery) return escapeHTML(text);

  const normalizedText = norm(text);
  const index = normalizedText.indexOf(cleanQuery);
  if (index === -1) return escapeHTML(text);

  const matchLength = cleanQuery.length;
  const before = text.slice(0, index);
  const matched = text.slice(index, index + matchLength);
  const after = text.slice(index + matchLength);

  return `${escapeHTML(before)}<mark class="search-highlight">${escapeHTML(matched)}</mark>${highlightText(after, query)}`;
}

function getMovieChain(movie) {
  if (movie.cadena) return movie.cadena;
  const url = (movie.url || "").toLowerCase();
  if (url.includes("cinemark")) return "Cinemark";
  if (url.includes("cinepolis")) return "Cinépolis";
  if (url.includes("cinestar")) return "Cine Star";
  if (url.includes("movietime")) return "Movie Time";
  if (url.includes("uvk")) return "UVK";
  return "Cineplanet";
}

function getMovieShowtimesCount(movie) {
  return (movie.sedes || []).reduce((sum, sede) => sum + (sede.funciones || []).length, 0);
}

function getMovieAllFunciones(movie) {
  return (movie.sedes || []).flatMap((sede) => sede.funciones || []);
}

function getMovieNextShowtimeKey(movie) {
  const keys = getMovieAllFunciones(movie)
    .filter((fn) => fn.dia && fn.hora)
    .map((fn) => `${fn.dia} ${fn.hora}`);
  if (!keys.length) return "9999-99-99 99:99";
  return keys.sort()[0];
}

function getMovieAvailabilityRatio(movie) {
  const ratios = getMovieAllFunciones(movie)
    .map((fn) => fn.disponibilidad)
    .filter((disp) => disp && disp.capacidad)
    .map((disp) => disp.asientos_disponibles / disp.capacidad);
  if (!ratios.length) return -1;
  return ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
}

function getFiltersFromUI() {
  const selectedChains = Array.from(els.chainFilter.selectedOptions)
    .map((opt) => opt.value)
    .filter((value) => value);
  const selectedCities = Array.from(els.cityFilter.selectedOptions)
    .map((opt) => opt.value)
    .filter((value) => value);
  const selectedVenues = Array.from(els.venueFilter.selectedOptions)
    .map((opt) => opt.value)
    .filter((value) => value);

  return {
    text: norm(els.searchInput.value),
    genre: els.genreFilter.value,
    language: els.languageFilter.value,
    format: els.formatFilter.value,
    chains: selectedChains,
    cities: selectedCities,
    venues: selectedVenues,
    day: els.dayFilter.value,
    timeFrom: els.timeFromFilter.value,
    timeTo: els.timeToFilter.value,
    sortBy: els.sortBy.value || "title_asc",
  };
}

function sortMovies(movies, sortBy) {
  const items = [...movies];
  if (sortBy === "title_desc") {
    items.sort((a, b) => (b.titulo || "").localeCompare(a.titulo || "", "es"));
    return items;
  }
  if (sortBy === "showtimes_desc") {
    items.sort((a, b) => getMovieShowtimesCount(b) - getMovieShowtimesCount(a));
    return items;
  }
  if (sortBy === "venues_desc") {
    items.sort((a, b) => (b.sedes || []).length - (a.sedes || []).length);
    return items;
  }
  if (sortBy === "next_showtime_asc") {
    items.sort((a, b) => getMovieNextShowtimeKey(a).localeCompare(getMovieNextShowtimeKey(b)));
    return items;
  }
  if (sortBy === "availability_desc") {
    items.sort((a, b) => getMovieAvailabilityRatio(b) - getMovieAvailabilityRatio(a));
    return items;
  }
  if (sortBy === "genre_asc") {
    items.sort((a, b) => (a.genero || "").localeCompare(b.genero || "", "es") || (a.titulo || "").localeCompare(b.titulo || "", "es"));
    return items;
  }
  items.sort((a, b) => (a.titulo || "").localeCompare(b.titulo || "", "es"));
  return items;
}

function formatDateLabel(dateISO) {
  if (!dateISO) return "Fecha no disponible";
  const date = new Date(`${dateISO}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateISO;
  return new Intl.DateTimeFormat("es-PE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function saveUserPreferences() {
  try {
    localStorage.setItem("pref_viewMode", els.viewMode.value);
    localStorage.setItem("pref_sortBy", els.sortBy.value);
    const selectedCities = Array.from(els.cityFilter.selectedOptions).map((o) => o.value).filter(Boolean);
    if (selectedCities.length) {
      localStorage.setItem("pref_cities", JSON.stringify(selectedCities));
    } else {
      localStorage.removeItem("pref_cities");
    }
  } catch (e) {}
}

function detectDeviceType() {
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w <= 1024) return "tablet";
  return "desktop";
}

function updateSegmentedViewBar(view) {
  const bar = document.querySelector("#viewSegmentedBar");
  if (!bar) return;
  const extraSelect = document.querySelector("#viewModeExtra");

  bar.querySelectorAll(".view-segmented-btn").forEach((btn) => {
    const isAct = btn.dataset.view === view;
    btn.classList.toggle("is-active", isAct);
    btn.setAttribute("aria-selected", isAct ? "true" : "false");
  });

  if (extraSelect) {
    const extraOptions = ["calendar", "kanban", "heatmap"];
    if (extraOptions.includes(view)) {
      extraSelect.value = view;
      extraSelect.classList.add("is-active");
    } else {
      extraSelect.value = "";
      extraSelect.classList.remove("is-active");
    }
  }
}

function restoreUserPreferences() {
  try {
    const savedView = localStorage.getItem("pref_viewMode");
    if (savedView && els.viewMode.querySelector(`option[value="${savedView}"]`)) {
      els.viewMode.value = savedView;
      state.viewMode = savedView;
    } else {
      // Detección adaptativa inicial según dispositivo
      const device = detectDeviceType();
      const defaultView = device === "mobile" ? "cinematic" : "cinematic";
      els.viewMode.value = defaultView;
      state.viewMode = defaultView;
    }
    updateSegmentedViewBar(state.viewMode);

    const savedSort = localStorage.getItem("pref_sortBy");
    if (savedSort && els.sortBy.querySelector(`option[value="${savedSort}"]`)) {
      els.sortBy.value = savedSort;
    }
    const savedCitiesStr = localStorage.getItem("pref_cities");
    if (savedCitiesStr) {
      const cities = JSON.parse(savedCitiesStr);
      if (Array.isArray(cities) && cities.length) {
        Array.from(els.cityFilter.options).forEach((opt) => {
          if (cities.includes(opt.value)) opt.selected = true;
        });
      }
    }
  } catch (e) {}
}

async function loadData() {
  try {
    const response = await fetch(`../data/peliculas.json?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}`);
    }
    const payload = await response.json();
    const isLegacyArray = Array.isArray(payload);
    state.peliculas = isLegacyArray ? payload : payload.peliculas || [];
    state.scrapedAt = isLegacyArray ? null : payload.scraped_at || null;
    renderDataFreshnessBadge(state.scrapedAt);
    hydrateFilters();
    restoreUserPreferences();
    syncChecklistsFromSelects();
    applyFilters();
  } catch (error) {
    els.results.innerHTML = `<p class="empty">No se pudo cargar data/peliculas.json (${error.message}).</p>`;
    els.resultSummary.textContent = "Error de carga";
  }
}

function hydrateFilters() {
  const chains = uniqueSorted(
    state.peliculas.map((p) => getMovieChain(p))
  );
  const genres = uniqueSorted(state.peliculas.map((p) => p.genero));
  const languages = uniqueSorted(state.peliculas.flatMap((p) => p.idiomas || []));
  const formats = uniqueSorted(state.peliculas.flatMap((p) => p.formatos || []));
  const cities = uniqueSorted(
    state.peliculas.flatMap((p) => (p.ciudades?.length ? p.ciudades : (p.sedes || []).map((s) => s.ciudad)))
  );
  const venues = uniqueSorted(state.peliculas.flatMap((p) => (p.sedes || []).map((s) => s.nombre)));
  const days = uniqueSorted(state.peliculas.flatMap((p) => (p.sedes || []).flatMap((s) => s.dias || [])));
  populateSelect(els.chainFilter, chains);
  populateSelect(els.genreFilter, genres);
  populateSelect(els.languageFilter, languages);
  populateSelect(els.formatFilter, formats);
  populateSelect(els.cityFilter, cities);
  populateSelect(els.venueFilter, venues);
  populateSelect(els.dayFilter, days, formatDateLabel);

  hydrateCustomChecklists(cities, venues, chains);
}

function syncVenueChecklistForCities() {
  const venueContainer = document.querySelector("#venueChecklistOptions");
  if (!venueContainer) return;

  const selectedCities = new Set(
    Array.from(els.cityFilter.selectedOptions)
      .map((o) => (o.value || "").trim().toLowerCase())
      .filter(Boolean)
  );

  const venueCounts = new Map();
  const sedesValidas = new Set();

  state.peliculas.forEach((p) => {
    (p.sedes || []).forEach((s) => {
      if (s.nombre) {
        const ciudadSede = (s.ciudad || "").trim().toLowerCase();
        // Si no hay ciudades seleccionadas, se incluyen todas las sedes del país.
        // Si hay ciudades seleccionadas (ej. Lima), solo se incluyen las sedes de esa ciudad (o Callao con Lima).
        const pertenece =
          selectedCities.size === 0 ||
          selectedCities.has(ciudadSede) ||
          (selectedCities.has("lima") && ciudadSede === "callao");

        if (pertenece) {
          sedesValidas.add(s.nombre);
          venueCounts.set(s.nombre, (venueCounts.get(s.nombre) || 0) + (s.funciones || []).length);
        }
      }
    });
  });

  // Desmarcar sedes seleccionadas que no pertenezcan a las ciudades activas
  Array.from(els.venueFilter.options).forEach((opt) => {
    if (opt.selected && !sedesValidas.has(opt.value)) {
      opt.selected = false;
    }
  });

  const venuesParaMostrar = uniqueSorted(Array.from(sedesValidas));
  const selectedVenues = new Set(Array.from(els.venueFilter.selectedOptions).map((o) => o.value));

  if (!venuesParaMostrar.length) {
    venueContainer.innerHTML = `<p class="custom-sedes-empty" style="padding: 1rem; font-size: 0.8rem; color: var(--muted); text-align: center;">No hay sedes disponibles para las ciudades seleccionadas.</p>`;
  } else {
    venueContainer.innerHTML = venuesParaMostrar
      .map((venue) => {
        const count = venueCounts.get(venue) || 0;
        const isChecked = selectedVenues.has(venue);
        return `
          <label class="checklist-item ${isChecked ? "is-selected" : ""}">
            <div class="checklist-item-left">
              <input type="checkbox" class="venue-checkbox" value="${escapeHTML(venue)}" ${isChecked ? "checked" : ""}>
              <span>${escapeHTML(shortVenueName(venue))}</span>
            </div>
            <span class="checklist-count-tag">${count} fns</span>
          </label>
        `;
      })
      .join("");
  }

  updateVenueSelectionCount();
}

function hydrateCustomChecklists(cities, venues, chains) {
  // 1. City checklist
  const cityContainer = document.querySelector("#cityChecklistOptions");
  if (cityContainer) {
    const cityCounts = new Map();
    state.peliculas.forEach((p) => {
      const cList = p.ciudades?.length ? p.ciudades : (p.sedes || []).map((s) => s.ciudad);
      new Set(cList.filter(Boolean)).forEach((c) => {
        cityCounts.set(c, (cityCounts.get(c) || 0) + 1);
      });
    });

    const selectedCities = new Set(Array.from(els.cityFilter.selectedOptions).map((o) => o.value));
    cityContainer.innerHTML = cities
      .map((city) => {
        const count = cityCounts.get(city) || 0;
        const isChecked = selectedCities.has(city);
        return `
          <label class="checklist-item ${isChecked ? "is-selected" : ""}">
            <div class="checklist-item-left">
              <input type="checkbox" class="city-checkbox" value="${escapeHTML(city)}" ${isChecked ? "checked" : ""}>
              <span>${escapeHTML(city)}</span>
            </div>
            <span class="checklist-count-tag">${count} pelis</span>
          </label>
        `;
      })
      .join("");

    updateCitySelectionCount();
  }

  // 2. Venue checklist (sincronizada y filtrada en cascada con las ciudades)
  syncVenueChecklistForCities();

  // 3. Chain segmented pills
  updateChainPillsSelection();
}

function updateCitySelectionCount() {
  const badge = document.querySelector("#citySelectedCount");
  if (!badge) return;
  const count = Array.from(els.cityFilter.selectedOptions).filter((o) => o.value).length;
  badge.textContent = count === 0 ? "Todas" : `${count} elegida${count > 1 ? "s" : ""}`;
}

function updateVenueSelectionCount() {
  const badge = document.querySelector("#venueSelectedCount");
  if (!badge) return;
  const count = Array.from(els.venueFilter.selectedOptions).filter((o) => o.value).length;
  badge.textContent = count === 0 ? "Todos" : `${count} elegido${count > 1 ? "s" : ""}`;
}

function updateChainPillsSelection() {
  const container = document.querySelector("#chainPillsSelector");
  if (!container) return;
  const selected = new Set(Array.from(els.chainFilter.selectedOptions).map((o) => o.value).filter(Boolean));
  container.querySelectorAll(".chain-select-pill").forEach((pill) => {
    const chain = pill.dataset.chain;
    if (!chain) {
      pill.classList.toggle("is-active", selected.size === 0);
    } else {
      pill.classList.toggle("is-active", selected.has(chain));
    }
  });
}

function syncChecklistsFromSelects() {
  const selectedCities = new Set(Array.from(els.cityFilter.selectedOptions).map((o) => o.value).filter(Boolean));
  document.querySelectorAll("#cityChecklistOptions .checklist-item").forEach((item) => {
    const cb = item.querySelector(".city-checkbox");
    if (cb) {
      cb.checked = selectedCities.has(cb.value);
      item.classList.toggle("is-selected", cb.checked);
    }
  });
  updateCitySelectionCount();

  const selectedVenues = new Set(Array.from(els.venueFilter.selectedOptions).map((o) => o.value).filter(Boolean));
  document.querySelectorAll("#venueChecklistOptions .checklist-item").forEach((item) => {
    const cb = item.querySelector(".venue-checkbox");
    if (cb) {
      cb.checked = selectedVenues.has(cb.value);
      item.classList.toggle("is-selected", cb.checked);
    }
  });
  updateVenueSelectionCount();

  updateChainPillsSelection();
}

function populateSelect(select, values, labeler = (value) => value) {
  const firstOption = select.querySelector("option");
  const optionsHTML = values
    .map((value) => `<option value="${escapeHTML(value)}">${escapeHTML(labeler(value))}</option>`)
    .join("");
  select.innerHTML = `${firstOption.outerHTML}${optionsHTML}`;
}

function matchFormat(movie, formatFilter) {
  if (!formatFilter) return true;
  const inMovieFormats = (movie.formatos || []).includes(formatFilter);
  if (inMovieFormats) return true;

  return (movie.sedes || []).some((sede) =>
    (sede.funciones || []).some((fn) => (fn.formato || "").includes(formatFilter))
  );
}

function inTimeRange(hourValue, fromValue, toValue) {
  let hour = (hourValue || "").trim();
  const m12 = hour.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (m12) {
    let hr = parseInt(m12[1], 10);
    const mn = m12[2];
    const mer = (m12[3] || "").toUpperCase();
    if (mer === "PM" && hr < 12) hr += 12;
    else if (mer === "AM" && hr === 12) hr = 0;
    hour = `${String(hr).padStart(2, "0")}:${mn}`;
  } else {
    hour = hour.slice(0, 5);
  }
  const from = (fromValue || "").slice(0, 5);
  const to = (toValue || "").slice(0, 5);

  if (!hour) return false;
  if (from && hour < from) return false;
  if (to && hour > to) return false;
  return true;
}

function buildVisibleMovie(movie, filters) {
  const chain = getMovieChain(movie);
  const title = norm(movie.titulo);
  const genre = movie.genero || "";
  const languages = movie.idiomas || [];

  if (filters.text && !title.includes(filters.text)) return null;
  if (filters.chains?.length && !filters.chains.includes(chain)) return null;
  if (filters.genre && genre !== filters.genre) return null;
  if (filters.language && !languages.includes(filters.language)) return null;
  if (!matchFormat(movie, filters.format)) return null;

  const filteredSedes = (movie.sedes || [])
    .filter((sede) => !filters.cities?.length || filters.cities.includes(sede.ciudad))
    .filter((sede) => !filters.venues?.length || filters.venues.includes(sede.nombre))
    .filter((sede) => !filters.day || (sede.dias || []).includes(filters.day))
    .map((sede) => {
      const filteredFunciones = (sede.funciones || []).filter(
        (fn) =>
          (!filters.format || (fn.formato || "").includes(filters.format)) &&
          inTimeRange(fn.hora, filters.timeFrom, filters.timeTo) &&
          (!filters.day || fn.dia === filters.day)
      );
      return {
        ...sede,
        funciones: filteredFunciones,
      };
    })
    .filter((sede) => (sede.funciones || []).length > 0);

  const hasScheduleFilter = Boolean(
    filters.cities?.length ||
      filters.venues?.length ||
      filters.day ||
      filters.format ||
      filters.timeFrom ||
      filters.timeTo
  );
  if (hasScheduleFilter && filteredSedes.length === 0) return null;

  return {
    ...movie,
    sedes: filteredSedes,
  };
}

function applyFilters() {
  const filters = getFiltersFromUI();
  state.filters = filters;

  const filteredMovies = state.peliculas
    .map((movie) => buildVisibleMovie(movie, filters))
    .filter(Boolean);

  const conFunciones = filteredMovies.filter((movie) => getMovieShowtimesCount(movie) > 0);
  state.ocultasSinFunciones = filteredMovies.length - conFunciones.length;
  state.filtered = sortMovies(conFunciones, filters.sortBy);

  renderActiveFilters(filters);
  renderResults();

  const drawerApplyBtn = document.querySelector("#drawerApplyBtn");
  if (drawerApplyBtn) {
    drawerApplyBtn.textContent = `Ver resultados (${numberFormatter.format(conFunciones.length)})`;
  }
}

function renderActiveFilters(filters) {
  const chips = [];
  const pushChip = (key, label, value) => {
    if (!value) return;
    chips.push(`
      <button type="button" class="filter-chip" data-filter-key="${escapeHTML(key)}">
        ${escapeHTML(label)}: ${escapeHTML(value)} <span aria-hidden="true">x</span>
      </button>
    `);
  };

  pushChip("text", "Titulo", els.searchInput.value.trim());
  pushChip("genre", "Genero", filters.genre);
  pushChip("language", "Idioma", filters.language);
  pushChip("format", "Formato", filters.format);
  if (filters.chains?.length) {
    filters.chains.forEach((chain) => pushChip("chain", "Cadena", chain));
  }
  if (filters.cities?.length) {
    filters.cities.forEach((city) => pushChip("city", "Ciudad", city));
  }
  if (filters.venues?.length) {
    filters.venues.forEach((venue) => pushChip("venue", "Sede", venue));
  }
  pushChip("day", "Dia", filters.day ? formatDateLabel(filters.day) : "");
  pushChip("timeFrom", "Desde", filters.timeFrom);
  pushChip("timeTo", "Hasta", filters.timeTo);

  if (!chips.length) {
    els.activeFilters.innerHTML = '<span class="filters-empty">Sin filtros activos</span>';
  } else {
    els.activeFilters.innerHTML = chips.join("");
  }

  updateQuickPillsState(filters);
  updateMobileBadges(chips.length);
}

function getResolvedTodayAndTomorrow() {
  const dayOptions = Array.from(els.dayFilter.options).map((o) => o.value).filter(Boolean);
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const localToday = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const tomorrowDate = new Date(now.getTime() + 86400000);
  const localTomorrow = `${tomorrowDate.getFullYear()}-${pad(tomorrowDate.getMonth() + 1)}-${pad(tomorrowDate.getDate())}`;

  const todayISO = dayOptions.includes(localToday) ? localToday : (dayOptions[0] || localToday);
  const tomorrowISO = dayOptions.includes(localTomorrow)
    ? localTomorrow
    : (dayOptions.find((d) => d > todayISO) || dayOptions[1] || "");

  return { todayISO, tomorrowISO };
}

function updateQuickPillsState(filters) {
  if (!els.quickPillsBar) return;

  const { todayISO, tomorrowISO } = getResolvedTodayAndTomorrow();

  const isNoChainSelected = !(filters.chains && filters.chains.length);
  if (els.pillChainAll) els.pillChainAll.classList.toggle("is-active", isNoChainSelected);

  if (els.pillToday) els.pillToday.classList.toggle("is-active", filters.day === todayISO);
  if (els.pillTomorrow) els.pillTomorrow.classList.toggle("is-active", Boolean(tomorrowISO && filters.day === tomorrowISO));
  if (els.pillMatine) els.pillMatine.classList.toggle("is-active", filters.timeFrom === "00:00" && filters.timeTo === "15:00");
  if (els.pillNoche) els.pillNoche.classList.toggle("is-active", filters.timeFrom === "19:00" && filters.timeTo === "23:59");
  if (els.pillDubbed) els.pillDubbed.classList.toggle("is-active", (filters.language || "").toLowerCase().includes("dob"));
  if (els.pillSubbed) els.pillSubbed.classList.toggle("is-active", (filters.language || "").toLowerCase().includes("sub"));
  if (els.pillImax) els.pillImax.classList.toggle("is-active", (filters.format || "").includes("IMAX") || (filters.format || "").includes("XD"));
  if (els.pillCineplanet) els.pillCineplanet.classList.toggle("is-active", (filters.chains || []).includes("Cineplanet"));
  if (els.pillCinemark) els.pillCinemark.classList.toggle("is-active", (filters.chains || []).includes("Cinemark"));
  if (els.pillCinepolis) els.pillCinepolis.classList.toggle("is-active", (filters.chains || []).includes("Cinépolis"));
  if (els.pillCineStar) els.pillCineStar.classList.toggle("is-active", (filters.chains || []).includes("Cine Star"));
  if (els.pillMovieTime) els.pillMovieTime.classList.toggle("is-active", (filters.chains || []).includes("Movie Time"));
  if (els.pillUVK) els.pillUVK.classList.toggle("is-active", (filters.chains || []).includes("UVK"));

  if (els.searchClearBtn) {
    els.searchClearBtn.hidden = !els.searchInput.value.trim();
  }

  const hasAnyFilter = Boolean(
    els.searchInput.value.trim() ||
    filters.genre ||
    filters.language ||
    filters.format ||
    filters.chains?.length ||
    filters.cities?.length ||
    filters.venues?.length ||
    filters.day ||
    filters.timeFrom ||
    filters.timeTo
  );

  if (els.pillClear) {
    els.pillClear.hidden = !hasAnyFilter;
  }
  syncChecklistsFromSelects();
}

function updateMobileBadges(filterCount) {
  if (!els.mobileFilterBadge) return;
  if (filterCount > 0) {
    els.mobileFilterBadge.textContent = String(filterCount);
    els.mobileFilterBadge.hidden = false;
  } else {
    els.mobileFilterBadge.hidden = true;
  }
}

function getAvailabilityLabel(disponibilidad) {
  if (!disponibilidad) return "";
  const disponibles = disponibilidad.asientos_disponibles ?? 0;
  const capacidad = disponibilidad.capacidad ?? 0;
  return `${disponibles} disponibles de ${capacidad}`;
}

function getAvailabilityClass(disponibilidad) {
  if (!disponibilidad) return "none";
  const disp = disponibilidad.asientos_disponibles ?? null;
  const cap = disponibilidad.capacidad ?? null;
  const estado = (disponibilidad.estado || "").toLowerCase();

  if (disp !== null && disp <= 0 && cap > 0) return "fn-availability-lleno";
  if (estado === "lleno" || estado === "soldout" || estado === "sold_out" || estado === "full") return "fn-availability-lleno";
  if (estado === "low" || estado === "baja") return "fn-availability-low";
  if (estado === "medium" || estado === "media") return "fn-availability-medium";
  if (estado === "high" || estado === "alta") return "fn-availability-high";

  if (disp !== null && cap !== null && cap > 0) {
    const ratio = disp / cap;
    if (ratio <= 0) return "fn-availability-lleno";
    if (ratio <= 0.15) return "fn-availability-low";
    if (ratio <= 0.50) return "fn-availability-medium";
    return "fn-availability-high";
  }
  return estado ? `fn-availability-${estado}` : "none";
}

const SEAT_SVG_ICON = `
<svg class="seat-svg" viewBox="0 0 20 20" width="16" height="16" fill="currentColor" aria-hidden="true">
  <path d="M4 14v3a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-3h6v3a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-3h1a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1V3a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v2H4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h2zm2-9h8v4H6V5zm-2 4h1v3a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9h1v3H4V9z"/>
</svg>
`;

function formatDuration(minutes) {
  if (!minutes || isNaN(minutes)) return null;
  const total = parseInt(minutes, 10);
  if (total <= 0) return null;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h > 0 && m > 0) return `${h}H ${m < 10 ? "0" : ""}${m}M`;
  if (h > 0) return `${h}H 00M`;
  return `${m}M`;
}

function formatCensura(censura) {
  if (!censura) return "APT";
  const c = String(censura).trim().toUpperCase();
  if (c.includes("14")) return "M14";
  if (c.includes("18")) return "M18";
  if (c.includes("APT") || c.includes("GENERAL") || c.includes("TE")) return "APT";
  if (c.includes("RESTRICT")) return "R";
  return c.slice(0, 5);
}

function formatShowtimeHour(hora) {
  if (!hora) return "";
  const clean = hora.slice(0, 5);
  return `${clean}hs`;
}

function normalizeFormatLabel(fmt) {
  if (!fmt) return "2D";
  const s = String(fmt).toUpperCase();
  if (s.includes("IMAX")) return "IMAX";
  if (s.includes("4DX")) return "4DX";
  if (s.includes("3D")) return "3D";
  if (s.includes("2D")) return "2D";
  if (s.includes("PRIME") || s.includes("PREMIUM")) return "PREMIUM";
  return s.split(",")[0].trim() || "2D";
}

function normalizeIdiomaLabel(idm) {
  if (!idm) return "Doblada";
  const s = String(idm).toLowerCase();
  if (s.includes("sub")) return "Subtitulada";
  if (s.includes("dob") || s.includes("esp")) return "Doblada";
  if (s.includes("orig")) return "Idioma Original";
  return idm.trim();
}

function shortVenueName(name) {
  if (!name) return "";
  return name.replace(/^Cineplanet\s+/i, "CP ").replace(/^Cinemark\s+/i, "CM ");
}

function getAvailabilitySeatClass(disponibilidad) {
  if (!disponibilidad) return "seat-status-none";
  const disp = disponibilidad.asientos_disponibles ?? null;
  const cap = disponibilidad.capacidad ?? null;
  const estado = (disponibilidad.estado || "").toLowerCase();

  if (disp !== null && disp <= 0 && cap > 0) return "seat-status-lleno";
  if (estado === "lleno" || estado === "soldout" || estado === "sold_out" || estado === "full") return "seat-status-lleno";
  if (estado === "low" || estado === "baja") return "seat-status-baja";
  if (estado === "medium" || estado === "media") return "seat-status-media";
  if (estado === "high" || estado === "alta") return "seat-status-alta";

  if (disp !== null && cap !== null && cap > 0) {
    const ratio = disp / cap;
    if (ratio <= 0) return "seat-status-lleno";
    if (ratio <= 0.15) return "seat-status-baja";
    if (ratio <= 0.50) return "seat-status-media";
    return "seat-status-alta";
  }
  return "seat-status-none";
}

function getAvailabilityTooltip(disponibilidad, sedeNombre) {
  const sedeStr = sedeNombre ? `${sedeNombre} • ` : "";
  if (!disponibilidad) return `${sedeStr}Disponibilidad no monitoreada`;
  const disp = disponibilidad.asientos_disponibles;
  const cap = disponibilidad.capacidad;
  if (disp !== undefined && cap !== undefined && cap > 0) {
    if (disp <= 0) return `${sedeStr}Sala Llena (0/${cap} asientos)`;
    const pct = Math.round((disp / cap) * 100);
    return `${sedeStr}${disp} asientos libres de ${cap} (${pct}% disponible)`;
  }
  const est = disponibilidad.estado ? `Estado: ${disponibilidad.estado}` : "Consultar en cine";
  return `${sedeStr}${est}`;
}

function getIdiomaClass(idioma) {
  const norm = (idioma || "").toLowerCase();
  if (norm.includes("dob")) return "idioma-doblada";
  if (norm.includes("sub")) return "idioma-subtitulada";
  return "";
}

function renderIdiomaBadge(idioma) {
  if (!idioma) return "";
  const cls = getIdiomaClass(idioma);
  return `<span class="idioma-badge ${escapeHTML(cls)}">${escapeHTML(idioma)}</span>`;
}

function getShowtimeEntries(filteredMovies) {
  const entries = [];

  filteredMovies.forEach((movie) => {
    const chain = getMovieChain(movie);
    const sedes = movie.sedes || [];

    sedes.forEach((sede) => {
      const funciones = sede.funciones || [];

      funciones.forEach((fn) => {
        const day = fn.dia || "";
        entries.push({
          titulo: movie.titulo || "Sin titulo",
          url: movie.url || "#",
          cadena: chain,
          genero: movie.genero || "N/D",
          idioma: fn.idioma || (movie.idiomas || []).join(", ") || "N/D",
          sede: sede.nombre || "Sede",
          sala: fn.sala || null,
          ciudad: sede.ciudad || "N/D",
          dia: day,
          diaLabel: day ? formatDateLabel(day) : "Sin fecha",
          hora: (fn.hora || "").slice(0, 5) || "",
          horaLabel: (fn.hora || "").slice(0, 5) || "N/D",
          formato: fn.formato || "N/D",
          disponibilidad: fn.disponibilidad || null,
          disponibilidadLabel: getAvailabilityLabel(fn.disponibilidad),
          disponibilidadClass: getAvailabilityClass(fn.disponibilidad),
        });
      });
    });
  });

  return entries;
}

function sortEntriesByDateHourTitle(entries, dir = 1) {
  const items = [...entries];
  items.sort((a, b) => {
    const dayA = a.dia || "9999-12-31";
    const dayB = b.dia || "9999-12-31";
    if (dayA !== dayB) return dayA.localeCompare(dayB) * dir;

    const hourA = a.hora || "99:99";
    const hourB = b.hora || "99:99";
    if (hourA !== hourB) return hourA.localeCompare(hourB) * dir;

    return a.titulo.localeCompare(b.titulo, "es") * dir;
  });
  return items;
}

function agruparEntriesPorFormato(entries) {
  const grupos = new Map();
  entries.forEach((entry) => {
    const formato = entry.formato || "N/D";
    if (!grupos.has(formato)) grupos.set(formato, []);
    grupos.get(formato).push(entry);
  });
  return [...grupos.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "es"))
    .map(([formato, items]) => ({ formato, items }));
}

function renderTimelineItem(entry) {
  return `
    <article class="timeline-item">
      <div class="timeline-point" aria-hidden="true"></div>
      <div class="timeline-content">
        <div class="timeline-head">
          <p class="timeline-when">${escapeHTML(entry.diaLabel)} - ${escapeHTML(entry.horaLabel)}</p>
          <span class="chain-badge chain-badge-${escapeHTML(entry.cadena.toLowerCase())}">${escapeHTML(entry.cadena)}</span>
        </div>
        <h3 class="timeline-title">${highlightText(entry.titulo, state.filters.text)}</h3>
        <p class="timeline-place"><strong>${escapeHTML(entry.sede)}</strong> - ${escapeHTML(entry.ciudad)}</p>
        <p class="timeline-meta">${escapeHTML(entry.formato)} ${renderIdiomaBadge(entry.idioma)}</p>
        ${entry.disponibilidadLabel ? `<span class="fn-availability ${escapeHTML(entry.disponibilidadClass)}">${escapeHTML(entry.disponibilidadLabel)}</span>` : ""}
        <a class="movie-link" href="${escapeHTML(entry.url)}" target="_blank" rel="noopener noreferrer">Ver pelicula</a>
      </div>
    </article>
  `;
}

function renderTimelineResults(filteredMovies) {
  const entries = sortEntriesByDateHourTitle(getShowtimeEntries(filteredMovies));

  if (!entries.length) {
    els.results.innerHTML = `<p class="empty">No hay funciones para mostrar en timeline.</p>`;
    return;
  }

  if (state.groupByFormato) {
    els.results.innerHTML = agruparEntriesPorFormato(entries)
      .map(
        ({ formato, items }) => `
          <div class="format-group">
            <p class="format-group-title">${escapeHTML(formato)} <span class="table-group-count">${numberFormatter.format(items.length)} ${pluralize(items.length, "funcion", "funciones")}</span></p>
            ${items.map(renderTimelineItem).join("")}
          </div>
        `
      )
      .join("");
    return;
  }

  els.results.innerHTML = entries.map(renderTimelineItem).join("");
}

const TABLE_COLUMNS = [
  { key: "titulo", label: "Pelicula", getValue: (e) => e.titulo || "" },
  { key: "dia", label: "Dia", getValue: (e) => e.dia || "9999-99-99" },
  { key: "hora", label: "Hora", getValue: (e) => e.hora || "99:99" },
  { key: "cadena", label: "Cadena", getValue: (e) => e.cadena || "" },
  { key: "sede", label: "Sede", getValue: (e) => e.sede || "" },
  { key: "ciudad", label: "Ciudad", getValue: (e) => e.ciudad || "" },
  { key: "idioma", label: "Idioma", getValue: (e) => e.idioma || "" },
  { key: "formato", label: "Formato", getValue: (e) => e.formato || "" },
  {
    key: "disponibilidad",
    label: "Disponibilidad",
    getValue: (e) =>
      e.disponibilidad && e.disponibilidad.capacidad
        ? e.disponibilidad.asientos_disponibles / e.disponibilidad.capacidad
        : -1,
  },
];

function sortEntriesByColumn(entries, key, dir) {
  if (!key || key === "default") {
    return sortEntriesByDateHourTitle(entries, dir);
  }
  const column = TABLE_COLUMNS.find((c) => c.key === key);
  if (!column) return entries;
  const items = [...entries];
  items.sort((a, b) => {
    const va = column.getValue(a);
    const vb = column.getValue(b);
    let cmp = 0;
    if (typeof va === "number" && typeof vb === "number") {
      cmp = (va - vb) * dir;
    } else {
      cmp = String(va).localeCompare(String(vb), "es") * dir;
    }
    if (cmp !== 0) return cmp;

    // Desempate secundario siempre por Fecha y Hora
    const dayA = a.dia || "9999-12-31";
    const dayB = b.dia || "9999-12-31";
    if (dayA !== dayB) return dayA.localeCompare(dayB);

    const hourA = a.hora || "99:99";
    const hourB = b.hora || "99:99";
    if (hourA !== hourB) return hourA.localeCompare(hourB);

    return (a.titulo || "").localeCompare(b.titulo || "", "es");
  });
  return items;
}

function renderTableRow(entry) {
  const fmtKey = (entry.formato || "ND").toLowerCase().replace(/[^a-z0-9]/g, "");
  let dispHtml = '<span class="fn-empty">N/D</span>';
  if (entry.disponibilidad && entry.disponibilidad.capacidad > 0) {
    const pct = Math.round((entry.disponibilidad.asientos_disponibles / entry.disponibilidad.capacidad) * 100);
    dispHtml = `
      <div class="table-disp-cell">
        <span class="fn-availability ${escapeHTML(entry.disponibilidadClass)}">${escapeHTML(entry.disponibilidadLabel)}</span>
        <div class="disp-bar-track" title="${pct}% disponible (${entry.disponibilidad.asientos_disponibles} de ${entry.disponibilidad.capacidad})">
          <div class="disp-bar-fill ${escapeHTML(entry.disponibilidadClass)}" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  } else if (entry.disponibilidadLabel) {
    dispHtml = `<span class="fn-availability ${escapeHTML(entry.disponibilidadClass)}">${escapeHTML(entry.disponibilidadLabel)}</span>`;
  }

  return `
    <tr>
      <td><strong>${highlightText(entry.titulo, state.filters.text)}</strong></td>
      <td>${escapeHTML(entry.diaLabel)}</td>
      <td><code>${escapeHTML(entry.horaLabel)}</code></td>
      <td><span class="chain-badge chain-badge-${escapeHTML(entry.cadena.toLowerCase())}">${escapeHTML(entry.cadena)}</span></td>
      <td>${escapeHTML(entry.sede)}${entry.sala ? ` <small style="color: var(--muted); font-size: 0.78rem;">(${escapeHTML(entry.sala)})</small>` : ""}</td>
      <td>${escapeHTML(entry.ciudad)}</td>
      <td>${renderIdiomaBadge(entry.idioma) || "N/D"}</td>
      <td><span class="format-badge format-badge-${escapeHTML(fmtKey)}">${escapeHTML(entry.formato || "N/D")}</span></td>
      <td>${dispHtml}</td>
    </tr>
  `;
}

function updateTableFilterOnly() {
  const tbody = els.results.querySelector(".showtimes-table tbody");
  const countBadge = els.results.querySelector(".table-count-badge");
  if (!tbody) return;

  const q = (state.tableFilterText || "").toLowerCase().trim();
  const rows = tbody.querySelectorAll("tr:not(.table-group-row)");
  let visibleCount = 0;
  rows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    const match = !q || text.includes(q);
    row.style.display = match ? "" : "none";
    if (match) visibleCount++;
  });

  if (countBadge) {
    countBadge.textContent = `${numberFormatter.format(visibleCount)} funciones`;
  }
}

function renderTableResults(filteredMovies) {
  let entries = getShowtimeEntries(filteredMovies);

  if (!entries.length) {
    els.results.innerHTML = `<p class="empty">No hay funciones para mostrar en tabla.</p>`;
    return;
  }

  const { key: sortKey = "default", dir: sortDir = 1 } = state.tableSort || {};
  const agrupar = Boolean(state.groupByFormato);

  // 1. Aplicar ordenamiento a las funciones
  if (agrupar) {
    entries = sortEntriesByColumn(entries, "formato", 1);
    if (sortKey && sortKey !== "formato" && sortKey !== "default") {
      const grupos = new Map();
      entries.forEach((e) => {
        if (!grupos.has(e.formato)) grupos.set(e.formato, []);
        grupos.get(e.formato).push(e);
      });
      entries = [...grupos.values()]
        .map((grupo) => sortEntriesByColumn(grupo, sortKey, sortDir))
        .flat();
    }
  } else {
    entries = sortEntriesByColumn(entries, sortKey, sortDir);
  }

  // 2. Filtro rápido de texto en tabla si existe
  const q = (state.tableFilterText || "").toLowerCase().trim();
  const matchingEntries = q
    ? entries.filter((e) => {
        const full = `${e.titulo} ${e.sede} ${e.ciudad} ${e.cadena} ${e.formato} ${e.idioma} ${e.horaLabel} ${e.diaLabel} ${e.disponibilidadLabel || ""}`.toLowerCase();
        return full.includes(q);
      })
    : entries;

  let rowsHtml = "";
  if (agrupar) {
    let formatoActual = null;
    matchingEntries.forEach((entry) => {
      if (entry.formato !== formatoActual) {
        formatoActual = entry.formato;
        const cantidad = matchingEntries.filter((e) => e.formato === formatoActual).length;
        rowsHtml += `<tr class="table-group-row"><td colspan="9">${escapeHTML(formatoActual)} <span class="table-group-count">${numberFormatter.format(cantidad)} ${pluralize(cantidad, "funcion", "funciones")}</span></td></tr>`;
      }
      rowsHtml += renderTableRow(entry);
    });
  } else {
    rowsHtml = matchingEntries.map(renderTableRow).join("");
  }

  const headerCells = TABLE_COLUMNS
    .map((col) => {
      const activo = sortKey === col.key;
      const flecha = activo ? (sortDir === 1 ? "▲" : "▼") : "<span class='th-sort-idle'>↕</span>";
      return `<th data-sort-key="${col.key}" class="${activo ? "th-sorted" : ""}" title="Clic para ordenar por ${col.label}">${col.label} <span class="th-sort-arrow">${flecha}</span></th>`;
    })
    .join("");

  const currentSelectVal = `${sortKey || "default"}_${sortDir || 1}`;
  const isSorted = sortKey && sortKey !== "default";

  els.results.innerHTML = `
    <div class="table-toolbar">
      <div class="table-toolbar-left">
        <label class="table-tool-label">
          <span>Ordenar tabla:</span>
          <select id="tableSortSelect" class="table-sort-select" title="Selecciona criterio de ordenamiento">
            <option value="default_1" ${currentSelectVal === "default_1" ? "selected" : ""}>📅 Fecha y Hora (predeterminado)</option>
            <option value="titulo_1" ${currentSelectVal === "titulo_1" ? "selected" : ""}>🎬 Película (A ➔ Z)</option>
            <option value="titulo_-1" ${currentSelectVal === "titulo_-1" ? "selected" : ""}>🎬 Película (Z ➔ A)</option>
            <option value="hora_1" ${currentSelectVal === "hora_1" ? "selected" : ""}>⏰ Hora (más temprano)</option>
            <option value="hora_-1" ${currentSelectVal === "hora_-1" ? "selected" : ""}>⏰ Hora (más tarde)</option>
            <option value="cadena_1" ${currentSelectVal === "cadena_1" ? "selected" : ""}>🏢 Cadena (Cineplanet primero)</option>
            <option value="cadena_-1" ${currentSelectVal === "cadena_-1" ? "selected" : ""}>🏢 Cadena (Cinemark primero)</option>
            <option value="sede_1" ${currentSelectVal === "sede_1" ? "selected" : ""}>🏛️ Sede (A ➔ Z)</option>
            <option value="ciudad_1" ${currentSelectVal === "ciudad_1" ? "selected" : ""}>📍 Ciudad (A ➔ Z)</option>
            <option value="formato_1" ${currentSelectVal === "formato_1" ? "selected" : ""}>🎞️ Formato (2D, 3D...)</option>
            <option value="idioma_1" ${currentSelectVal === "idioma_1" ? "selected" : ""}>🗣️ Idioma (DOB, SUB...)</option>
            <option value="disponibilidad_-1" ${currentSelectVal === "disponibilidad_-1" ? "selected" : ""}>💺 Mayor disponibilidad</option>
            <option value="disponibilidad_1" ${currentSelectVal === "disponibilidad_1" ? "selected" : ""}>💺 Menor disponibilidad</option>
          </select>
        </label>

        <div class="table-quick-chips">
          <button type="button" class="table-chip-btn ${sortKey === 'titulo' ? 'is-active' : ''}" data-chip-key="titulo" title="Ordenar por Película">
            🎬 Película ${sortKey === 'titulo' ? (sortDir === 1 ? '▲' : '▼') : ''}
          </button>
          <button type="button" class="table-chip-btn ${sortKey === 'dia' ? 'is-active' : ''}" data-chip-key="dia" title="Ordenar por Fecha">
            📅 Fecha ${sortKey === 'dia' ? (sortDir === 1 ? '▲' : '▼') : ''}
          </button>
          <button type="button" class="table-chip-btn ${sortKey === 'hora' ? 'is-active' : ''}" data-chip-key="hora" title="Ordenar por Hora">
            ⏰ Hora ${sortKey === 'hora' ? (sortDir === 1 ? '▲' : '▼') : ''}
          </button>
          <button type="button" class="table-chip-btn ${sortKey === 'cadena' ? 'is-active' : ''}" data-chip-key="cadena" title="Ordenar por Cadena">
            🏢 Cadena ${sortKey === 'cadena' ? (sortDir === 1 ? '▲' : '▼') : ''}
          </button>
          <button type="button" class="table-chip-btn ${sortKey === 'sede' ? 'is-active' : ''}" data-chip-key="sede" title="Ordenar por Sede">
            🏛️ Sede ${sortKey === 'sede' ? (sortDir === 1 ? '▲' : '▼') : ''}
          </button>
          <button type="button" class="table-chip-btn ${sortKey === 'disponibilidad' ? 'is-active' : ''}" data-chip-key="disponibilidad" title="Ordenar por Asientos Disponibles">
            💺 Asientos ${sortKey === 'disponibilidad' ? (sortDir === 1 ? '▲' : '▼') : ''}
          </button>
        </div>
      </div>

      <div class="table-toolbar-right">
        <div class="table-search-box">
          <input id="tableQuickSearch" type="search" placeholder="🔍 Filtrar en tabla..." value="${escapeHTML(state.tableFilterText || '')}">
        </div>
        ${isSorted || q ? `<button type="button" class="btn-secondary table-sort-clear" id="clearTableSortBtn" title="Restablecer orden predeterminado">Restablecer orden</button>` : ""}
        <span class="table-count-badge">${numberFormatter.format(matchingEntries.length)} funciones</span>
      </div>
    </div>

    ${window.innerWidth < 640 ? `
      <div class="mobile-table-card-list">
        ${matchingEntries.map((e) => {
          const cadClass = (e.cadena || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const fmtKey = (e.formato || "ND").toLowerCase().replace(/[^a-z0-9]/g, "");
          const dispHtml = e.disponibilidad
            ? `<span class="fn-availability ${escapeHTML(e.disponibilidadClass || '')}">${escapeHTML(e.disponibilidadLabel || 'Disp.')}</span>`
            : `<span class="fn-empty">N/D</span>`;
          const salaStr = e.sala ? ` • Sala: ${escapeHTML(e.sala)}` : "";
          const rawFnJson = JSON.stringify(e.rawFunction || { dia: e.dia, hora: e.hora, formato: e.formato, idioma: e.idioma, sala: e.sala }).replace(/"/g, '&quot;');
          return `
            <article class="mobile-table-card">
              <div class="mobile-table-header">
                <span class="mobile-table-title">${escapeHTML(e.titulo)}</span>
                <span class="chain-badge chain-badge-${cadClass}">${escapeHTML(e.cadena)}</span>
              </div>
              <div class="mobile-table-meta-row">
                <span>🏛️ ${escapeHTML(e.sede)} (${escapeHTML(e.ciudad)})</span>
                <span>📅 ${escapeHTML(e.diaLabel)}</span>
                <span><span class="format-badge format-badge-${fmtKey}">${escapeHTML(e.formato)}</span> (${escapeHTML(e.idioma)})${salaStr}</span>
              </div>
              <div class="mobile-table-showtime-row">
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                  <span style="font-size: 0.75rem; opacity: 0.75;">Asientos:</span>
                  ${dispHtml}
                </div>
                <button type="button" class="mobile-table-hour-btn" onclick="openTicketModal(${rawFnJson}, '${escapeHTML(e.titulo).replace(/'/g, "\\'")}', '${escapeHTML(e.sede).replace(/'/g, "\\'")}', '${escapeHTML(e.cadena).replace(/'/g, "\\'")}')" title="Ver disponibilidad de boleto">
                  ⏰ ${escapeHTML(e.horaLabel)}
                </button>
              </div>
            </article>
          `;
        }).join("") || '<p class="empty">No hay funciones que coincidan.</p>'}
      </div>
    ` : `
      <div class="table-wrap">
        <table class="showtimes-table">
          <thead>
            <tr>${headerCells}</tr>
          </thead>
          <tbody>${rowsHtml || '<tr><td colspan="9" class="empty">No hay funciones que coincidan con la búsqueda en tabla.</td></tr>'}</tbody>
        </table>
      </div>
    `}
  `;
}

function renderCalendarResults(filteredMovies) {
  const entries = sortEntriesByDateHourTitle(
    getShowtimeEntries(filteredMovies).filter((entry) => entry.dia && entry.hora)
  );

  if (!entries.length) {
    els.results.innerHTML = `<p class="empty">No hay funciones con dia y hora para el calendario.</p>`;
    return;
  }

  const uniqueDays = [...new Set(entries.map((entry) => entry.dia))].slice(0, 7);
  const uniqueHours = [...new Set(entries.map((entry) => entry.hora))].sort((a, b) => a.localeCompare(b));
  const byCell = new Map();

  entries.forEach((entry) => {
    const key = `${entry.dia}|${entry.hora}`;
    if (!byCell.has(key)) byCell.set(key, []);
    byCell.get(key).push(entry);
  });

  const header = uniqueDays
    .map((day) => `<th>${escapeHTML(formatDateLabel(day))}</th>`)
    .join("");

  const body = uniqueHours
    .map((hour) => {
      const cells = uniqueDays
        .map((day) => {
          const items = byCell.get(`${day}|${hour}`) || [];
          const list = items
            .slice(0, 4)
            .map((item) => {
              const tooltip = `${item.titulo}\n${item.cadena} - ${item.sede} (${item.ciudad})\n${item.formato}`;
              return `
                <span class="calendar-item calendar-item-${escapeHTML(item.cadena.toLowerCase())}" title="${escapeHTML(tooltip)}">
                  <span class="chain-dot" aria-hidden="true"></span>${escapeHTML(item.titulo)}
                </span>`;
            })
            .join("");
          const extra = items.length > 4 ? `<span class="calendar-more">+${items.length - 4} mas</span>` : "";
          return `<td>${list || '<span class="calendar-empty">-</span>'}${extra}</td>`;
        })
        .join("");
      return `<tr><th>${escapeHTML(hour)}</th>${cells}</tr>`;
    })
    .join("");

  els.results.innerHTML = `
    <div class="calendar-wrap">
      <table class="calendar-table">
        <thead>
          <tr>
            <th>Hora</th>
            ${header}
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function renderKanbanCard(item, chain) {
  return `
    <article class="kanban-card kanban-card-${escapeHTML(chain.toLowerCase())}">
      <h4>${highlightText(item.titulo, state.filters.text)}</h4>
      <p><strong>${escapeHTML(item.diaLabel)} - ${escapeHTML(item.horaLabel)}</strong></p>
      <p><strong>${escapeHTML(item.sede)}</strong> - ${escapeHTML(item.ciudad)}</p>
      <p>${escapeHTML(item.formato)} ${renderIdiomaBadge(item.idioma)}</p>
      ${item.disponibilidadLabel ? `<span class="fn-availability ${escapeHTML(item.disponibilidadClass)}">${escapeHTML(item.disponibilidadLabel)}</span>` : ""}
    </article>
  `;
}

function renderKanbanResults(filteredMovies) {
  const entries = sortEntriesByDateHourTitle(getShowtimeEntries(filteredMovies));

  if (!entries.length) {
    els.results.innerHTML = `<p class="empty">No hay funciones para mostrar en kanban.</p>`;
    return;
  }

  const byChain = new Map();
  entries.forEach((entry) => {
    if (!byChain.has(entry.cadena)) byChain.set(entry.cadena, []);
    byChain.get(entry.cadena).push(entry);
  });

  const isMobile = window.innerWidth < 768;
  const chainKeys = [...byChain.keys()].sort((a, b) => a.localeCompare(b, "es"));
  if (!state.activeKanbanChain || !chainKeys.includes(state.activeKanbanChain)) {
    state.activeKanbanChain = chainKeys[0] || "";
  }

  let tabsHtml = "";
  if (isMobile && chainKeys.length > 1) {
    tabsHtml = `
      <div class="kanban-mobile-tabs" id="kanbanMobileTabs" role="tablist">
        ${chainKeys.map((c) => {
          const isAct = c === state.activeKanbanChain;
          const count = byChain.get(c)?.length || 0;
          return `
            <button type="button" class="kanban-mobile-tab-btn ${isAct ? 'is-active' : ''}" data-kanban-chain="${escapeHTML(c)}" role="tab" aria-selected="${isAct}">
              <span>${escapeHTML(c)}</span>
              <span class="kanban-count" style="font-size: 0.72rem; opacity: 0.85;">(${count})</span>
            </button>
          `;
        }).join("")}
      </div>
    `;
  }

  const columns = [...byChain.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "es"))
    .filter(([chain]) => !isMobile || chain === state.activeKanbanChain)
    .map(([chain, items]) => {
      const limitadas = items.slice(0, 80);
      let cards;
      if (state.groupByFormato) {
        cards = agruparEntriesPorFormato(limitadas)
          .map(
            ({ formato, items: grupoItems }) => `
              <p class="kanban-format-header">${escapeHTML(formato)} (${numberFormatter.format(grupoItems.length)})</p>
              ${grupoItems.map((item) => renderKanbanCard(item, chain)).join("")}
            `
          )
          .join("");
      } else {
        cards = limitadas.map((item) => renderKanbanCard(item, chain)).join("");
      }
      return `
        <section class="kanban-column kanban-column-${escapeHTML(chain.toLowerCase())}">
          <h3><span class="chain-badge chain-badge-${escapeHTML(chain.toLowerCase())}">${escapeHTML(chain)}</span> <span class="kanban-count">${items.length} funciones</span></h3>
          <div class="kanban-list">${cards}</div>
        </section>
      `;
    })
    .join("");

  els.results.innerHTML = `${tabsHtml}<div class="kanban-board">${columns}</div>`;

  if (isMobile) {
    const tabsContainer = document.querySelector("#kanbanMobileTabs");
    if (tabsContainer) {
      tabsContainer.addEventListener("click", (e) => {
        const btn = e.target.closest(".kanban-mobile-tab-btn");
        if (!btn) return;
        const targetChain = btn.dataset.kanbanChain;
        if (targetChain && targetChain !== state.activeKanbanChain) {
          state.activeKanbanChain = targetChain;
          renderKanbanResults(filteredMovies);
        }
      });
    }
  }
}

function buildHeatmapTable(entries, days, hours) {
  const counts = new Map();
  const details = new Map();
  let maxCount = 1;

  entries.forEach((entry) => {
    const key = `${entry.dia}|${entry.hora}`;
    const nextValue = (counts.get(key) || 0) + 1;
    counts.set(key, nextValue);
    if (nextValue > maxCount) maxCount = nextValue;
    if (!details.has(key)) details.set(key, []);
    details.get(key).push(entry.titulo);
  });

  const dayHeader = days.map((day) => `<th>${escapeHTML(formatDateLabel(day))}</th>`).join("");

  const rows = hours
    .map((hour) => {
      const cells = days
        .map((day) => {
          const key = `${day}|${hour}`;
          const value = counts.get(key) || 0;
          const ratio = value / maxCount;
          const alpha = value ? (0.15 + ratio * 0.75).toFixed(2) : "0";
          const titulos = details.get(key) || [];
          const uniqueTitulos = [...new Set(titulos)];
          const tooltip = value
            ? `${value} ${pluralize(value, "funcion", "funciones")}:\n${uniqueTitulos.slice(0, 8).join("\n")}${uniqueTitulos.length > 8 ? "\n..." : ""}`
            : "Sin funciones";
          return `<td><span class="heat-cell" style="--heat-alpha:${alpha}" title="${escapeHTML(tooltip)}">${value || ""}</span></td>`;
        })
        .join("");
      return `<tr><th>${escapeHTML(hour)}</th>${cells}</tr>`;
    })
    .join("");

  return `
    <table class="heatmap-table">
      <thead>
        <tr>
          <th>Hora</th>
          ${dayHeader}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderHeatmapResults(filteredMovies) {
  const entries = sortEntriesByDateHourTitle(
    getShowtimeEntries(filteredMovies).filter((entry) => entry.dia && entry.hora)
  );

  if (!entries.length) {
    els.results.innerHTML = `<p class="empty">No hay funciones con dia y hora para heatmap.</p>`;
    return;
  }

  const days = [...new Set(entries.map((entry) => entry.dia))].slice(0, 7);
  const hours = [...new Set(entries.map((entry) => entry.hora))].sort((a, b) => a.localeCompare(b));

  const byChain = new Map();
  entries.forEach((entry) => {
    if (!byChain.has(entry.cadena)) byChain.set(entry.cadena, []);
    byChain.get(entry.cadena).push(entry);
  });

  const grids = [...byChain.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "es"))
    .map(([chain, chainEntries]) => `
      <div class="heatmap-grid heatmap-grid-${escapeHTML(chain.toLowerCase())}">
        <h3 class="heatmap-chain-title">
          <span class="chain-badge chain-badge-${escapeHTML(chain.toLowerCase())}">${escapeHTML(chain)}</span>
          <span class="kanban-count">${numberFormatter.format(chainEntries.length)} funciones</span>
        </h3>
        ${buildHeatmapTable(chainEntries, days, hours)}
      </div>
    `)
    .join("");

  els.results.innerHTML = `
    <div class="heatmap-wrap">
      ${grids}
      <p class="heatmap-legend">
        Cada mapa es de una sola cadena. Mayor intensidad de color = mas funciones en esa franja.
        Pasa el mouse sobre un numero para ver que peliculas son.
      </p>
    </div>
  `;
}

function getCanonicalMovieKey(title) {
  if (!title) return "";
  let t = title;
  // 1. Eliminar prefijos promocionales o de festivales
  t = t.replace(/^(?:estreno|preventa|reestreno|clasicos|contenido alternativo|cine arte|festival de cine)\s*[:-]\s*/gi, "");
  // 2. Eliminar formatos y pistas de audio entre paréntesis o corchetes
  t = t.replace(/\((?:dob|sub|doblada|subtitulada|2d|3d|imax|xd|4dx|screenx|esp|cast|a|b|c|bonus|latino|ingles|orig)\)/gi, "");
  t = t.replace(/\[.*?\]/g, "");
  // 3. Normalizar números romanos frecuentes en títulos
  t = t.replace(/\bviii\b/gi, "8")
       .replace(/\bvii\b/gi, "7")
       .replace(/\bvi\b/gi, "6")
       .replace(/\biv\b/gi, "4")
       .replace(/\bv\b/gi, "5")
       .replace(/\biii\b/gi, "3")
       .replace(/\bii\b/gi, "2");
  // 4. Normalizar acentos y signos
  t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  t = t.replace(/[^a-z0-9\s]/g, " ");
  // 5. Filtrar palabras vacías para comparación canónica
  const stop = new Set(["de", "del", "la", "las", "el", "los", "y", "en", "un", "una", "the"]);
  const tokens = t.split(/\s+/).filter((w) => w && !stop.has(w));
  return tokens.join(" ");
}

function fixPosterUrl(url, chain) {
  if (!url) return "";
  let cleanUrl = url.trim();
  if (cleanUrl.includes("bucket.tumi-soft.com")) {
    const isMt = (chain || "").toLowerCase().includes("movie");
    const domain = isMt ? "https://www.movietime.com.pe" : "https://www.cinestar.com.pe";
    cleanUrl = cleanUrl.replace(/^https?:\/\/bucket\.tumi-soft\.com/, domain);
  }
  return cleanUrl;
}

function unifyMoviesForCinematic(movies) {
  const unifiedMap = new Map();

  movies.forEach((m) => {
    const key = getCanonicalMovieKey(m.titulo) || norm(m.titulo);
    const chain = getMovieChain(m);
    if (!unifiedMap.has(key)) {
      unifiedMap.set(key, {
        titulo: m.titulo,
        rawTitles: [m.titulo],
        poster_url: m.poster_url || null,
        duracion: m.duracion || null,
        censura: m.censura || null,
        sinopsis: m.sinopsis || null,
        nominaciones: m.nominaciones || null,
        genero: m.genero || "",
        cadenas: new Set([chain]),
        chainUrls: { [chain]: m.url || "#" },
        sedes: (m.sedes || []).map((s) => ({ ...s, cadena: chain })),
      });
    } else {
      const existing = unifiedMap.get(key);
      existing.rawTitles.push(m.titulo);
      existing.cadenas.add(chain);
      if (m.url && !existing.chainUrls[chain]) {
        existing.chainUrls[chain] = m.url;
      }
      if (existing.titulo === existing.titulo.toUpperCase() && m.titulo !== m.titulo.toUpperCase()) {
        existing.titulo = m.titulo.replace(/\s*\[.*?\]/g, "").trim();
      }
      if (!existing.poster_url && m.poster_url) existing.poster_url = m.poster_url;
      if (!existing.duracion && m.duracion) existing.duracion = m.duracion;
      if (!existing.censura && m.censura) existing.censura = m.censura;
      if ((!existing.sinopsis || existing.sinopsis.length < 20) && m.sinopsis && m.sinopsis.length > 20) {
        existing.sinopsis = m.sinopsis;
      }
      if (!existing.nominaciones && m.nominaciones) existing.nominaciones = m.nominaciones;
      if (!existing.genero && m.genero) existing.genero = m.genero;

      (m.sedes || []).forEach((s) => {
        existing.sedes.push({ ...s, cadena: chain });
      });
    }
  });

  return Array.from(unifiedMap.values());
}

function renderCinematicResults(movies) {
  const container = document.createElement("div");
  container.className = "cinematic-container";

  const unifiedMovies = unifyMoviesForCinematic(movies);
  state.unifiedMovies = unifiedMovies;

  unifiedMovies.forEach((movie, movieIdx) => {
    const card = document.createElement("article");
    card.className = "cinematic-card";
    card.style.setProperty("--delay", `${movieIdx * 35}ms`);

    const cadenasArr = Array.from(movie.cadenas).sort();
    const durationStr = formatDuration(movie.duracion);
    const censuraStr = formatCensura(movie.censura);
    const movieTotalFunciones = (movie.sedes || []).reduce((acc, s) => acc + (s.funciones || []).length, 0);
    const isTrending = movieTotalFunciones >= 8 || (movie.formatos || []).some((f) => f.includes("IMAX") || f.includes("XD"));

    let posterHtml = "";
    const resolvedPoster = fixPosterUrl(movie.poster_url, Array.from(movie.cadenas || [])[0]);
    if (resolvedPoster) {
      posterHtml = `
        <img class="cinematic-poster-img" src="${safeUrl(resolvedPoster)}" alt="${escapeHTML(movie.titulo)}" loading="lazy" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">
        <div class="cinematic-poster-fallback" style="display: none;">
          <span class="fallback-icon">🎬</span>
          <span class="fallback-title">${escapeHTML(movie.titulo)}</span>
        </div>
      `;
    } else {
      posterHtml = `
        <div class="cinematic-poster-fallback">
          <span class="fallback-icon">🎬</span>
          <span class="fallback-title">${escapeHTML(movie.titulo)}</span>
        </div>
      `;
    }

    const awardsHtml = movie.nominaciones
      ? `
        <div class="cinematic-award-box has-award" title="${escapeHTML(movie.nominaciones)}">
          <span class="award-trophy">🏆</span>
          <div class="award-content">
            <span class="award-label">Premios & Nominaciones</span>
            <span class="award-desc">${escapeHTML(movie.nominaciones)}</span>
          </div>
        </div>
      `
      : `
        <div class="cinematic-award-box no-award" title="Estreno regular en cartelera">
          <span class="award-trophy">🎬</span>
          <div class="award-content">
            <span class="award-desc">Cartelera comercial • Sin nominaciones mayores registradas</span>
          </div>
        </div>
      `;

    let synopsisHtml = "";
    if (movie.sinopsis && movie.sinopsis.trim() && movie.sinopsis.trim() !== "-") {
      const isLong = movie.sinopsis.length > 175;
      synopsisHtml = `
        <div class="cinematic-synopsis-box">
          <span class="synopsis-label">Sinopsis</span>
          <p class="cinematic-synopsis-text ${isLong ? "is-clamped" : ""}">${escapeHTML(movie.sinopsis)}</p>
          ${isLong ? `<button type="button" class="cinematic-synopsis-toggle">Ver más</button>` : ""}
        </div>
      `;
    }

    // Build side-by-side columns per chain
    const chainColumnsHtml = cadenasArr.map((cad) => {
      const chainSedes = (movie.sedes || []).filter((s) => s.cadena === cad && (s.funciones || []).length > 0);
      const totalFns = chainSedes.reduce((sum, s) => sum + (s.funciones || []).length, 0);
      const chainUrl = safeUrl(movie.chainUrls[cad] || "#");
      const cadClass = cad.toLowerCase();

      const renderVenueBlock = (sede) => {
        const fns = sede.funciones || [];
        // Agrupar funciones por fecha para evitar mezclar showtimes de días distintos
        const fnsByDay = new Map();
        fns.forEach((fn) => {
          const d = fn.dia || "Sin fecha";
          if (!fnsByDay.has(d)) fnsByDay.set(d, []);
          fnsByDay.get(d).push(fn);
        });

        const sortedDays = Array.from(fnsByDay.keys()).sort();
        const hasMultipleDays = sortedDays.length > 1;

        const daySectionsHtml = sortedDays.map((dayKey) => {
          const dayFns = fnsByDay.get(dayKey).sort((a, b) => {
            const timeCmp = (a.hora || "").localeCompare(b.hora || "");
            if (timeCmp !== 0) return timeCmp;
            return (a.sala || "").localeCompare(b.sala || "");
          });

          const chipsHtml = dayFns.map((fn) => {
            const availClass = getAvailabilitySeatClass(fn.disponibilidad);
            const availText = getAvailabilityTooltip(fn.disponibilidad, sede.nombre);
            const hourLabel = formatShowtimeHour(fn.hora);
            const fmt = normalizeFormatLabel(fn.formato || "2D");
            const idm = normalizeIdiomaLabel(fn.idioma || "Doblada");
            const salaTag = fn.sala ? ` · ${escapeHTML(fn.sala)}` : "";
            const salaAttr = fn.sala ? ` data-sala="${escapeHTML(fn.sala)}"` : "";
            const salaTitle = fn.sala ? ` (${escapeHTML(fn.sala)})` : "";

            return `
              <div class="cinematic-chip ${availClass}" 
                   title="${escapeHTML(availText)} (${fmt} · ${idm}${salaTitle}) — Toca para comprar o compartir" 
                   tabindex="0" 
                   role="button" 
                   aria-label="${escapeHTML(hourLabel)} en ${escapeHTML(sede.nombre)}${salaTitle}"
                   data-chip-action="ticket"
                   data-movie-title="${escapeHTML(movie.titulo)}"
                   data-chain="${escapeHTML(cad)}"
                   data-venue="${escapeHTML(sede.nombre)}"
                   data-city="${escapeHTML(sede.ciudad || "")}"
                   data-day="${escapeHTML(fn.dia || "")}"
                   data-hour="${escapeHTML(fn.hora || "")}"
                   data-format="${escapeHTML(fmt)}"
                   data-lang="${escapeHTML(idm)}"
                   ${salaAttr}
                   data-avail-text="${escapeHTML(availText)}"
                   data-disp-avail="${fn.disponibilidad?.asientos_disponibles ?? ""}"
                   data-disp-cap="${fn.disponibilidad?.capacidad ?? ""}"
                   data-buy-url="${escapeHTML(chainUrl)}">
                <span class="cinematic-chip-hour">${escapeHTML(hourLabel)}</span>
                <span class="cinematic-chip-tag">${escapeHTML(fmt)} · ${escapeHTML(idm)}${salaTag}</span>
              </div>
            `;
          }).join("");

          const dayHeader = hasMultipleDays
            ? `<div class="cinematic-venue-day-title">📅 ${escapeHTML(formatDateLabel(dayKey))}</div>`
            : "";

          return `
            <div class="cinematic-venue-day-group">
              ${dayHeader}
              <div class="cinematic-chips-row">
                ${chipsHtml}
              </div>
            </div>
          `;
        }).join("");

        return `
          <div class="cinematic-venue-block">
            <div class="cinematic-venue-name">
              <span>${escapeHTML(shortVenueName(sede.nombre))}</span>
              <span class="cinematic-venue-city">${escapeHTML(sede.ciudad || "")}</span>
            </div>
            ${daySectionsHtml}
          </div>
        `;
      };

      let venuesHtml = "";
      if (chainSedes.length <= 3) {
        venuesHtml = chainSedes.map(renderVenueBlock).join("");
      } else {
        const visibleVenues = chainSedes.slice(0, 3).map(renderVenueBlock).join("");
        const extraVenues = chainSedes.slice(3).map(renderVenueBlock).join("");
        const countRemaining = chainSedes.length - 3;
        venuesHtml = `
          ${visibleVenues}
          <div class="cinematic-venues-collapsed">
            ${extraVenues}
          </div>
          <button type="button" class="cinematic-venues-toggle" data-count="${countRemaining}">
            <span>+ Ver ${countRemaining} sedes más</span>
            <span class="toggle-icon">▾</span>
          </button>
        `;
      }

      return `
        <div class="cinematic-chain-column chain-col-${escapeHTML(cadClass)}">
          <div class="cinematic-chain-header">
            <div class="cinematic-chain-title-wrap">
              <span class="chain-dot" aria-hidden="true"></span>
              <strong>${escapeHTML(cad.toUpperCase())}</strong>
              <span class="cinematic-chain-count">(${totalFns} funciones)</span>
            </div>
            <a href="${escapeHTML(chainUrl)}" target="_blank" rel="noopener noreferrer" class="cinematic-chain-buy-link" title="Comprar en ${escapeHTML(cad)}">
              Comprar entradas ↗
            </a>
          </div>
          <div class="cinematic-chain-venues" style="display: flex; flex-direction: column; gap: 0.9rem;">
            ${venuesHtml || '<p class="cinematic-no-functions">Sin funciones con los filtros actuales</p>'}
          </div>
        </div>
      `;
    }).join("");

    const chainBadgesHtml = cadenasArr.map((cad) => {
      const fnsCount = (movie.sedes || []).filter((s) => s.cadena === cad).reduce((acc, s) => acc + (s.funciones || []).length, 0);
      return `<span class="chain-badge chain-badge-${escapeHTML(cad.toLowerCase())}">${escapeHTML(cad)} (${fnsCount})</span>`;
    }).join(" ");

    card.innerHTML = `
      <div class="cinematic-poster-col">
        <div class="cinematic-poster-frame">
          ${posterHtml}
          ${durationStr ? `<span class="cinematic-badge-duration">${escapeHTML(durationStr)}</span>` : ""}
          ${censuraStr ? `<span class="cinematic-badge-censura">${escapeHTML(censuraStr)}</span>` : ""}
        </div>
      </div>
      <div class="cinematic-info-col">
        <div class="cinematic-title-wrap">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;">
            <h2 class="cinematic-movie-title">${highlightText(movie.titulo, state.filters.text)}</h2>
            <button type="button" class="btn-compare-matchmaker" data-movie-index="${movieIdx}" title="Comparar opciones de Cineplanet y Cinemark para esta película">
              🎯 ¿Dónde me conviene verla?
            </button>
          </div>
          <div class="cinematic-meta-tags">
            ${isTrending ? `<span class="cinematic-badge-trending">🔥 Alta demanda / Estreno</span>` : ""}
            ${chainBadgesHtml}
            ${movie.genero ? `<span class="cinematic-genre-tag">${escapeHTML(movie.genero)}</span>` : ""}
          </div>
        </div>
        ${awardsHtml}
        ${synopsisHtml}
        <div class="cinematic-chains-grid">
          ${chainColumnsHtml}
        </div>
      </div>
    `;

    container.appendChild(card);
  });

  els.results.innerHTML = "";
  els.results.appendChild(container);
}

const numberFormatter = new Intl.NumberFormat("es-PE");
const pluralize = (count, singular, plural) => (count === 1 ? singular : plural);

function updateGroupByFormatButton() {
  const btn = document.querySelector("#groupByFormatToggle");
  if (!btn) return;
  const disponibleEnVista = !VIEWS_SIN_AGRUPAR.has(state.viewMode);
  btn.hidden = !disponibleEnVista;
  const activo = disponibleEnVista && state.groupByFormato;
  btn.classList.toggle("is-active", activo);
}

function renderEmptyState(filters) {
  const activeChips = [];
  if (els.searchInput.value.trim()) activeChips.push({ label: `Buscar: "${els.searchInput.value.trim()}"`, key: "text" });
  if (filters.day) activeChips.push({ label: `Día: ${formatDateLabel(filters.day)}`, key: "day" });
  if (filters.language) activeChips.push({ label: `Idioma: ${filters.language}`, key: "language" });
  if (filters.format) activeChips.push({ label: `Formato: ${filters.format}`, key: "format" });
  if (filters.genre) activeChips.push({ label: `Género: ${filters.genre}`, key: "genre" });
  if (filters.chains?.length) activeChips.push({ label: `Cadenas: ${filters.chains.join(", ")}`, key: "chain" });
  if (filters.cities?.length) activeChips.push({ label: `Ciudades (${filters.cities.length})`, key: "city" });
  if (filters.venues?.length) activeChips.push({ label: `Sedes (${filters.venues.length})`, key: "venue" });

  const chipsHtml = activeChips
    .map(
      (c) => `
        <button type="button" class="empty-state-chip" data-filter-key="${escapeHTML(c.key)}" title="Quitar este filtro">
          <span>${escapeHTML(c.label)}</span>
          <span class="chip-remove" aria-hidden="true">✕</span>
        </button>
      `
    )
    .join("");

  els.results.innerHTML = `
    <div class="empty-state-card">
      <div class="empty-state-icon">🎬🍿</div>
      <h3 class="empty-state-title">No se encontraron funciones</h3>
      <p class="empty-state-subtitle">La combinación actual de filtros no arrojó resultados disponibles en cartelera.</p>
      ${
        activeChips.length
          ? `
            <div class="empty-state-filters">
              <span class="empty-state-label">Prueba quitando alguno de estos filtros:</span>
              <div class="empty-state-chips-wrap">${chipsHtml}</div>
            </div>
          `
          : ""
      }
      <div class="empty-state-actions">
        <button type="button" class="btn-primary" id="emptyStateResetBtn">
          🔄 Restablecer todos los filtros
        </button>
      </div>
    </div>
  `;
}

function renderResults() {
  updateGroupByFormatButton();
  const { filtered } = state;
  els.results.className = state.viewMode;
  const venuesCount = filtered.reduce((acc, movie) => acc + (movie.sedes || []).length, 0);
  const showtimesCount = filtered.reduce(
    (acc, movie) =>
      acc + (movie.sedes || []).reduce((sum, sede) => sum + (sede.funciones || []).length, 0),
    0
  );
  const ocultas = state.ocultasSinFunciones || 0;
  els.resultSummary.innerHTML = `
    <div class="kpi-tile">
      <span class="kpi-value">${numberFormatter.format(filtered.length)}</span>
      <span class="kpi-label">${pluralize(filtered.length, "pelicula", "peliculas")}</span>
    </div>
    <div class="kpi-tile">
      <span class="kpi-value">${numberFormatter.format(venuesCount)}</span>
      <span class="kpi-label">${pluralize(venuesCount, "sede", "sedes")}</span>
    </div>
    <div class="kpi-tile">
      <span class="kpi-value">${numberFormatter.format(showtimesCount)}</span>
      <span class="kpi-label">${pluralize(showtimesCount, "funcion", "funciones")}</span>
    </div>
    ${ocultas ? `<div class="kpi-tile kpi-tile-muted"><span class="kpi-value">${numberFormatter.format(ocultas)}</span><span class="kpi-label">sin funcion (ocultas)</span></div>` : ""}
  `;

  if (!filtered.length) {
    renderEmptyState(state.filters);
    return;
  }

  if (state.viewMode === "cinematic") {
    renderCinematicResults(filtered);
    return;
  }

  if (state.viewMode === "timeline") {
    renderTimelineResults(filtered);
    return;
  }
  if (state.viewMode === "table") {
    renderTableResults(filtered);
    return;
  }
  if (state.viewMode === "calendar") {
    renderCalendarResults(filtered);
    return;
  }
  if (state.viewMode === "kanban") {
    renderKanbanResults(filtered);
    return;
  }
  if (state.viewMode === "heatmap") {
    renderHeatmapResults(filtered);
    return;
  }

  const fragment = document.createDocumentFragment();
  filtered.forEach((movie, index) => {
    const card = els.movieTemplate.content.firstElementChild.cloneNode(true);
    card.style.setProperty("--delay", `${index * 40}ms`);

    const titleEl = card.querySelector(".movie-title");
    const linkEl = card.querySelector(".movie-link");
    const metaEl = card.querySelector(".movie-meta");
    const tagsEl = card.querySelector(".movie-tags");
    const statsEl = card.querySelector(".movie-stats");
    const venuesEl = card.querySelector(".movie-venues");

    titleEl.innerHTML = highlightText(movie.titulo || "Sin titulo", state.filters.text);
    linkEl.href = movie.url || "#";
    const cadena = getMovieChain(movie);
    card.dataset.chain = cadena;

    if (movie.poster_url) {
      const thumb = document.createElement("img");
      thumb.className = "card-thumb-poster";
      thumb.src = fixPosterUrl(movie.poster_url, cadena);
      thumb.alt = movie.titulo || "";
      thumb.loading = "lazy";
      thumb.onerror = () => thumb.remove();
      const head = card.querySelector(".card-head");
      if (head) head.prepend(thumb);
    }
    linkEl.textContent = `Ver en ${cadena}`;
    metaEl.innerHTML = `
      <span class="chain-badge chain-badge-${escapeHTML(cadena.toLowerCase())}">${escapeHTML(cadena)}</span>
      <span class="movie-genre">${escapeHTML(movie.genero || "Genero N/D")}</span>
    `;
    tagsEl.textContent = `Disponible en el pais en: ${(movie.idiomas || []).join(", ") || "N/D"} | ${(movie.formatos || []).join(", ") || "N/D"} (varia por cine, revisa cada funcion abajo)`;

    const venues = movie.sedes || [];
    const showtimeTotal = venues.reduce((sum, venue) => sum + (venue.funciones || []).length, 0);
    statsEl.innerHTML = `
      <span class="stat-chip"><strong>${venues.length}</strong> cines</span>
      <span class="stat-chip"><strong>${showtimeTotal}</strong> funciones</span>
    `;

    if (!venues.length) {
      venuesEl.innerHTML = `<div class="venue"><small>Sin sedes registradas</small></div>`;
    } else {
      venues.forEach((venue) => {
        const item = document.createElement("div");
        item.className = "venue";

        const agruparPorFormato = state.groupByFormato;
        const grupos = new Map();
        (venue.funciones || []).forEach((fn) => {
          const clave = agruparPorFormato ? (fn.formato || "N/D") : (fn.dia || "");
          if (!grupos.has(clave)) grupos.set(clave, []);
          grupos.get(clave).push(fn);
        });

        const clavesOrdenadas = [...grupos.keys()].sort((a, b) => {
          if (agruparPorFormato) return a.localeCompare(b, "es");
          if (!a) return 1;
          if (!b) return -1;
          return a.localeCompare(b);
        });

        const gruposHtml = clavesOrdenadas
          .map((clave) => {
            const funciones = grupos
              .get(clave)
              .slice()
              .sort((a, b) => (a.dia || "").localeCompare(b.dia || "") || (a.hora || "").localeCompare(b.hora || ""))
              .map((fn) => {
                const dispHTML = fn.disponibilidad
                  ? `<span class="fn-availability ${escapeHTML(getAvailabilityClass(fn.disponibilidad))}">${escapeHTML(getAvailabilityLabel(fn.disponibilidad))}</span>`
                  : "";
                const horaLinea = agruparPorFormato
                  ? `${escapeHTML(fn.dia ? formatDateLabel(fn.dia) : "")} ${escapeHTML(fn.hora || "N/D")}`
                  : escapeHTML(fn.hora || "N/D");
                const segundaLinea = agruparPorFormato ? "" : `<span class="fn-format">${escapeHTML(fn.formato || "N/D")}</span>`;
                return `
                <div class="fn-chip">
                  <span class="fn-hour">${horaLinea}</span>
                  ${segundaLinea}
                  ${renderIdiomaBadge(fn.idioma)}
                  ${dispHTML}
                </div>`;
              })
              .join("");

            const etiqueta = agruparPorFormato
              ? clave
              : (clave ? formatDateLabel(clave) : "Sin fecha");

            return `
              <div class="day-group">
                <p class="day-group-label">${escapeHTML(etiqueta)}</p>
                <div class="fn-grid">${funciones}</div>
              </div>
            `;
          })
          .join("");

        item.innerHTML = `
          <div class="venue-head">
            <strong>${escapeHTML(venue.nombre || "Sede")}</strong>
            <small>${escapeHTML(venue.ciudad || "N/D")}</small>
          </div>
          ${gruposHtml || '<span class="fn-empty">Sin funciones</span>'}
        `;
        venuesEl.appendChild(item);
      });
    }

    fragment.appendChild(card);
  });

  els.results.innerHTML = "";
  els.results.appendChild(fragment);
}

function clearFilters() {
  els.searchInput.value = "";
  els.genreFilter.value = "";
  els.languageFilter.value = "";
  els.formatFilter.value = "";
  Array.from(els.chainFilter.options).forEach((opt) => {
    opt.selected = false;
  });
  Array.from(els.cityFilter.options).forEach((opt) => {
    opt.selected = false;
  });
  Array.from(els.venueFilter.options).forEach((opt) => {
    opt.selected = false;
  });
  els.dayFilter.value = "";
  els.timeFromFilter.value = "";
  els.timeToFilter.value = "";
  els.sortBy.value = "title_asc";
  saveUserPreferences();
  syncChecklistsFromSelects();
  applyFilters();
}

function resetFilterByKey(key) {
  if (key === "text") els.searchInput.value = "";
  if (key === "genre") els.genreFilter.value = "";
  if (key === "language") els.languageFilter.value = "";
  if (key === "format") els.formatFilter.value = "";
  if (key === "chain") {
    Array.from(els.chainFilter.options).forEach((opt) => {
      opt.selected = false;
    });
  }
  if (key === "city") {
    Array.from(els.cityFilter.options).forEach((opt) => {
      opt.selected = false;
    });
  }
  if (key === "venue") {
    Array.from(els.venueFilter.options).forEach((opt) => {
      opt.selected = false;
    });
  }
  if (key === "day") els.dayFilter.value = "";
  if (key === "timeFrom") els.timeFromFilter.value = "";
  if (key === "timeTo") els.timeToFilter.value = "";
  saveUserPreferences();
  syncChecklistsFromSelects();
}

function buildRowsForExport() {
  const rows = [];
  state.filtered.forEach((movie) => {
    const base = {
      titulo: movie.titulo || "",
      cadena: getMovieChain(movie),
      genero: movie.genero || "",
      idiomas: (movie.idiomas || []).join(", "),
      formatos: (movie.formatos || []).join(", "),
      url: movie.url || "",
    };

    const sedes = movie.sedes || [];
    if (!sedes.length) {
      rows.push({
        ...base,
        ciudad: "",
        sede: "",
        dia: "",
        hora: "",
        formato_funcion: "",
        idioma_funcion: "",
      });
      return;
    }

    sedes.forEach((sede) => {
      const funciones = sede.funciones || [];
      if (!funciones.length) {
        rows.push({
          ...base,
          ciudad: sede.ciudad || "",
          sede: sede.nombre || "",
          dia: "",
          hora: "",
          formato_funcion: "",
          idioma_funcion: "",
        });
        return;
      }

      funciones.forEach((fn) => {
        const disp = fn.disponibilidad;
        rows.push({
          ...base,
          ciudad: sede.ciudad || "",
          sede: sede.nombre || "",
          dia: fn.dia || "",
          hora: fn.hora || "",
          formato_funcion: fn.formato || "",
          idioma_funcion: fn.idioma || "",
          disponibilidad: disp ? `${disp.asientos_disponibles}/${disp.capacidad} (${disp.estado})` : "",
        });
      });
    });
  });

  return rows;
}

const exportHeaders = [
  "Titulo",
  "Cadena",
  "Genero",
  "Idiomas",
  "Formatos",
  "Ciudad",
  "Sede",
  "Dias",
  "Hora",
  "Formato Funcion",
  "Idioma Funcion",
  "Disponibilidad",
  "URL",
];

function getExportFileStamp() {
  const now = new Date();
  const pad = (num) => String(num).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function downloadCsv(rows) {
  const lines = [
    exportHeaders.join(","),
    ...rows.map((row) => [
      row.titulo,
      row.cadena,
      row.genero,
      row.idiomas,
      row.formatos,
      row.ciudad,
      row.sede,
      row.dia,
      row.hora,
      row.formato_funcion,
      row.idioma_funcion,
      row.disponibilidad,
      row.url,
    ].map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(",")),
  ];

  const csv = "\ufeff" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const fileName = `peliculas_filtradas_${getExportFileStamp()}.csv`;
  triggerDownload(blob, fileName);
}

function computeExecutiveAnalytics() {
  const filtered = state.filtered;
  const venuesSet = new Set();
  const citiesSet = new Set();
  let totalFunciones = 0;
  let asientosDisponibles = 0;
  let asientosCapacidad = 0;
  let funcionesConAsientos = 0;

  const CADENAS_CONFIG = {
    "Cineplanet": { nombre: "Cineplanet", color: "#0066cc", bg: "rgba(0,102,204,0.08)", border: "rgba(0,102,204,0.3)" },
    "Cinemark": { nombre: "Cinemark", color: "#e50914", bg: "rgba(229,9,20,0.08)", border: "rgba(229,9,20,0.3)" },
    "Cinépolis": { nombre: "Cinépolis", color: "#2563eb", bg: "rgba(37,99,235,0.08)", border: "rgba(37,99,235,0.3)" },
    "Cine Star": { nombre: "Cine Star", color: "#f97316", bg: "rgba(249,115,22,0.08)", border: "rgba(249,115,22,0.3)" },
    "Movie Time": { nombre: "Movie Time", color: "#a855f7", bg: "rgba(168,85,247,0.08)", border: "rgba(168,85,247,0.3)" },
    "UVK": { nombre: "UVK", color: "#14b8a6", bg: "rgba(20,184,166,0.08)", border: "rgba(20,184,166,0.3)" },
  };

  const chainsMap = new Map();
  Object.keys(CADENAS_CONFIG).forEach((k) => {
    chainsMap.set(k, {
      ...CADENAS_CONFIG[k],
      funciones: 0,
      sedes: new Set(),
      peliculas: new Set(),
    });
  });

  const formatosCount = new Map();
  const idiomasCount = new Map();
  const movieShowtimes = [];

  filtered.forEach((m) => {
    const chain = getMovieChain(m);
    if (!chainsMap.has(chain)) {
      chainsMap.set(chain, {
        nombre: chain,
        color: "#9ca3af",
        bg: "rgba(156,163,175,0.08)",
        border: "rgba(156,163,175,0.3)",
        funciones: 0,
        sedes: new Set(),
        peliculas: new Set(),
      });
    }
    const chainObj = chainsMap.get(chain);
    chainObj.peliculas.add(m.titulo);

    let mFunciones = 0;
    const mSedes = (m.sedes || []).length;

    (m.sedes || []).forEach((s) => {
      venuesSet.add(s.nombre);
      if (s.ciudad) citiesSet.add(s.ciudad);
      chainObj.sedes.add(s.nombre);

      (s.funciones || []).forEach((fn) => {
        totalFunciones++;
        mFunciones++;
        chainObj.funciones++;

        const fmt = fn.formato || "Regular";
        formatosCount.set(fmt, (formatosCount.get(fmt) || 0) + 1);

        const idm = fn.idioma || (m.idiomas && m.idiomas[0]) || "N/D";
        idiomasCount.set(idm, (idiomasCount.get(idm) || 0) + 1);

        if (fn.disponibilidad && typeof fn.disponibilidad.capacidad === "number" && fn.disponibilidad.capacidad > 0) {
          asientosDisponibles += (fn.disponibilidad.asientos_disponibles || 0);
          asientosCapacidad += fn.disponibilidad.capacidad;
          funcionesConAsientos++;
        }
      });
    });

    movieShowtimes.push({
      titulo: m.titulo,
      cadena: chain,
      sedes: mSedes,
      funciones: mFunciones,
    });
  });

  movieShowtimes.sort((a, b) => b.funciones - a.funciones);

  const chainsAnalytics = Array.from(chainsMap.values())
    .map((c) => ({
      ...c,
      sedesCount: c.sedes.size,
      peliculasCount: c.peliculas.size,
      share: totalFunciones > 0 ? Math.round((c.funciones / totalFunciones) * 100) : 0,
    }))
    .filter((c) => c.funciones > 0 || c.peliculasCount > 0)
    .sort((a, b) => b.funciones - a.funciones);

  const avgOccupancy = asientosCapacidad > 0
    ? Math.round(((asientosCapacidad - asientosDisponibles) / asientosCapacidad) * 100)
    : null;

  return {
    totalPeliculas: filtered.length,
    totalSedes: venuesSet.size,
    totalCiudades: citiesSet.size,
    totalFunciones,
    asientosDisponibles,
    asientosCapacidad,
    funcionesConAsientos,
    avgOccupancy,
    chains: chainsAnalytics,
    topMovies: movieShowtimes.slice(0, 8),
    formatos: [...formatosCount.entries()].sort((a, b) => b[1] - a[1]),
    idiomas: [...idiomasCount.entries()].sort((a, b) => b[1] - a[1]),
  };
}

function openExecutiveReport() {
  if (!state.filtered.length) {
    alert("No hay datos para generar el reporte con los filtros actuales.");
    return;
  }

  const data = computeExecutiveAnalytics();
  const maxFunc = data.topMovies.length ? Math.max(...data.topMovies.map((m) => m.funciones), 1) : 1;
  const now = new Date();
  const fechaStr = new Intl.DateTimeFormat("es-PE", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(now);

  const activeChips = Array.from(els.activeFilters.querySelectorAll(".filter-chip"))
    .map((el) => el.textContent.replace(/x\s*$/, "").trim());

  els.reportMeta.textContent = `Generado el ${fechaStr} • Basado en filtros activos`;

  let ocupacionHtml = "";
  if (data.asientosCapacidad > 0) {
    ocupacionHtml = `
      <div class="report-kpi-card">
        <span class="report-kpi-val">${numberFormatter.format(data.asientosDisponibles)}</span>
        <span class="report-kpi-label">Butacas Disponibles</span>
        <span class="report-kpi-sub">${data.avgOccupancy !== null ? `${data.avgOccupancy}% ocupación estimada` : "En funciones monitoreadas"}</span>
      </div>
    `;
  } else {
    ocupacionHtml = `
      <div class="report-kpi-card">
        <span class="report-kpi-val">${numberFormatter.format(data.totalCiudades)}</span>
        <span class="report-kpi-label">Ciudades</span>
        <span class="report-kpi-sub">Cobertura nacional</span>
      </div>
    `;
  }

  const topMoviesHtml = data.topMovies.map((m, idx) => {
    const pct = Math.round((m.funciones / maxFunc) * 100);
    return `
      <tr>
        <td class="report-top-rank">#${idx + 1}</td>
        <td>
          <strong>${escapeHTML(m.titulo)}</strong>
          <span class="chain-badge chain-badge-${escapeHTML(m.cadena.toLowerCase())}" style="margin-left: 0.4rem">${escapeHTML(m.cadena)}</span>
        </td>
        <td>${m.sedes} ${pluralize(m.sedes, "sede", "sedes")}</td>
        <td style="min-width: 140px">
          <div class="report-bar-wrap">
            <div class="report-mini-track">
              <div class="report-mini-fill" style="width: ${pct}%"></div>
            </div>
            <strong>${m.funciones}</strong>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  const formatosHtml = data.formatos.map(([fmt, cnt]) => `
    <span class="report-pill-stat">
      <span>${escapeHTML(fmt)}</span>
      <span class="report-pill-badge">${cnt}</span>
    </span>
  `).join("");

  const idiomasHtml = data.idiomas.map(([idm, cnt]) => `
    <span class="report-pill-stat">
      <span>${escapeHTML(idm)}</span>
      <span class="report-pill-badge">${cnt}</span>
    </span>
  `).join("");

  els.reportModalBody.innerHTML = `
    ${activeChips.length ? `
      <div class="report-filters-bar">
        <strong style="margin-right: 0.3rem">Filtros:</strong>
        ${activeChips.map((c) => `<span class="report-filter-tag">${escapeHTML(c)}</span>`).join("")}
      </div>
    ` : ""}

    <div class="report-kpi-grid">
      <div class="report-kpi-card">
        <span class="report-kpi-val">${numberFormatter.format(data.totalPeliculas)}</span>
        <span class="report-kpi-label">Películas en Cartelera</span>
        <span class="report-kpi-sub">Títulos únicos activos</span>
      </div>
      <div class="report-kpi-card">
        <span class="report-kpi-val">${numberFormatter.format(data.totalSedes)}</span>
        <span class="report-kpi-label">Sedes con Funciones</span>
        <span class="report-kpi-sub">Complejos de cine</span>
      </div>
      <div class="report-kpi-card">
        <span class="report-kpi-val">${numberFormatter.format(data.totalFunciones)}</span>
        <span class="report-kpi-label">Funciones Totales</span>
        <span class="report-kpi-sub">Horarios programados</span>
      </div>
      ${ocupacionHtml}
    </div>

    <section class="report-section">
      <h3 class="report-section-title">📊 Participación por Cadena de Cine (6 Cadenas Nacionales)</h3>
      <div class="report-chains-grid">
        ${data.chains.map((c) => `
          <div class="report-chain-box" style="border: 1px solid ${c.border}; background: ${c.bg}; padding: 0.9rem; border-radius: 12px;">
            <div class="report-chain-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
              <h4 class="report-chain-name" style="color: ${c.color}; font-size: 1.05rem; font-weight: 800; margin: 0;">${escapeHTML(c.nombre)}</h4>
              <span class="report-chain-pct" style="color: ${c.color}; font-size: 1.15rem; font-weight: 900;">${c.share}%</span>
            </div>
            <div class="report-chain-metric-row" style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 0.25rem 0;">
              <span style="opacity: 0.8;">Películas en exhibición</span>
              <strong>${c.peliculasCount}</strong>
            </div>
            <div class="report-chain-metric-row" style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 0.25rem 0;">
              <span style="opacity: 0.8;">Cines con programación</span>
              <strong>${c.sedesCount}</strong>
            </div>
            <div class="report-chain-metric-row" style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 0.25rem 0;">
              <span style="opacity: 0.8;">Funciones programadas</span>
              <strong>${c.funciones}</strong>
            </div>
          </div>
        `).join("")}
      </div>

      <div class="report-share-bar" style="display: flex; height: 14px; border-radius: 8px; overflow: hidden; margin-top: 1rem; border: 1px solid var(--border);">
        ${data.chains.map((c) => `
          <div style="width: ${c.share}%; background: ${c.color}; transition: width 0.3s ease;" title="${escapeHTML(c.nombre)}: ${c.share}% (${c.funciones} funciones)"></div>
        `).join("")}
      </div>
      <div class="report-share-legend" style="display: flex; flex-wrap: wrap; gap: 0.8rem; margin-top: 0.6rem; font-size: 0.78rem;">
        ${data.chains.map((c) => `
          <span style="display: inline-flex; align-items: center; gap: 0.35rem;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: ${c.color}; display: inline-block;"></span>
            <strong>${escapeHTML(c.nombre)}:</strong> ${c.share}%
          </span>
        `).join("")}
      </div>
    </section>

    <section class="report-section">
      <h3 class="report-section-title">🏆 Top Películas con Mayor Presencia</h3>
      <table class="report-top-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Película</th>
            <th>Cobertura</th>
            <th>Volumen de Funciones</th>
          </tr>
        </thead>
        <tbody>${topMoviesHtml || '<tr><td colspan="4">Sin datos disponibles</td></tr>'}</tbody>
      </table>
    </section>

    <section class="report-section">
      <h3 class="report-section-title">🎬 Formatos Disponibles</h3>
      <div class="report-pills-row">${formatosHtml || '<span class="fn-empty">Sin formatos</span>'}</div>
    </section>

    <section class="report-section">
      <h3 class="report-section-title">🗣️ Idiomas de Exhibición</h3>
      <div class="report-pills-row">${idiomasHtml || '<span class="fn-empty">Sin idiomas</span>'}</div>
    </section>
  `;

  els.reportModal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeExecutiveReport() {
  if (els.reportModal) {
    els.reportModal.hidden = true;
    document.body.style.overflow = "";
  }
}

function openMatchmakerModal(movieIdx) {
  const movie = state.unifiedMovies ? state.unifiedMovies[movieIdx] : null;
  if (!movie) return;

  const modal = document.querySelector("#matchmakerModal");
  const modalBody = document.querySelector("#matchmakerModalBody");
  const titleEl = document.querySelector("#matchmakerTitle");
  const subTitleEl = document.querySelector("#matchmakerSubtitle");
  if (!modal || !modalBody) return;

  titleEl.textContent = `🎯 Comparador: ${movie.titulo}`;
  subTitleEl.textContent = `Analizando salas, horarios y formatos entre todas las cadenas disponibles`;

  const cadenas = Array.from(movie.cadenas || []).sort();
  const chainDataList = cadenas.map((cad) => {
    const sedes = (movie.sedes || []).filter((s) => s.cadena === cad && (s.funciones || []).length > 0);
    const fns = sedes.flatMap((s) => s.funciones || []);
    return {
      chain: cad,
      sedes,
      fns,
      metrics: getChainMatchMetrics(cad, sedes, fns),
      url: movie.chainUrls[cad] || "#",
    };
  });

  // Determinar la mejor opción según volumen de funciones y formatos especiales
  let winnerChain = cadenas[0] || "";
  let maxScore = -1;
  chainDataList.forEach((item) => {
    let score = item.metrics.fnsCount;
    if (item.metrics.bestFormat.includes("IMAX") || item.metrics.bestFormat.includes("XD")) score += 20;
    if (item.metrics.bestFormat.includes("VIP") || item.metrics.bestFormat.includes("Prime")) score += 10;
    if (score > maxScore) {
      maxScore = score;
      winnerChain = item.chain;
    }
  });

  const columnsHtml = chainDataList.map((item) => {
    return renderMatchmakerColumn(item.chain, item.metrics, item.url, item.chain === winnerChain);
  }).join("");

  modalBody.innerHTML = `
    <div class="verdict-banner">
      <div class="verdict-header">
        <span class="verdict-tag">Opción Destacada</span>
        <span class="verdict-score">${cadenas.length} Cadenas Comparadas</span>
      </div>
      <h3 class="verdict-title">Mayor variedad en ${escapeHTML(winnerChain)}</h3>
      <p class="verdict-explanation">Esta cadena ofrece la mayor cobertura de horarios y salas para disfrutar de "${escapeHTML(movie.titulo)}".</p>
    </div>

    <div class="matchmaker-grid" style="grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));">
      ${columnsHtml}
    </div>
  `;

  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeMatchmakerModal() {
  const modal = document.querySelector("#matchmakerModal");
  if (modal) {
    modal.hidden = true;
    document.body.style.overflow = "";
  }
}

function getChainMatchMetrics(chain, sedes, fns) {
  const fnsCount = fns.length;
  const sedesCount = sedes.length;

  const formatsSet = new Set();
  fns.forEach((f) => {
    if (f.formato) {
      f.formato.split(",").forEach((fmt) => formatsSet.add(fmt.trim()));
    }
  });
  const formatsArr = Array.from(formatsSet);
  let bestFormat = "2D Estándar";
  if (formatsArr.some((f) => f.includes("IMAX"))) bestFormat = "💎 IMAX";
  else if (formatsArr.some((f) => f.includes("XD"))) bestFormat = "💎 XD (Pantalla Gigante)";
  else if (formatsArr.some((f) => f.includes("PRIME"))) bestFormat = "🛋️ Prime / VIP";
  else if (formatsArr.some((f) => f.includes("EXTREME"))) bestFormat = "🔊 Extreme";
  else if (formatsArr.some((f) => f.includes("3D"))) bestFormat = "👓 3D";

  const withDisp = fns.filter((f) => f.disponibilidad && f.disponibilidad.capacidad > 0);
  let avgOccupancy = null;
  let availPct = null;
  let totalSeats = 0;
  let availSeats = 0;
  if (withDisp.length) {
    totalSeats = withDisp.reduce((sum, f) => sum + f.disponibilidad.capacidad, 0);
    availSeats = withDisp.reduce((sum, f) => sum + f.disponibilidad.asientos_disponibles, 0);
    availPct = Math.round((availSeats / totalSeats) * 100);
    avgOccupancy = 100 - availPct;
  }

  const sortedHours = fns.map((f) => f.hora).filter(Boolean).sort();
  const earliestHour = sortedHours[0] ? formatShowtimeHour(sortedHours[0]) : "N/D";
  const primeTimeFns = fns.filter((f) => f.hora && f.hora >= "19:00" && f.hora <= "21:30");

  let bestVenue = sedes[0] ? shortVenueName(sedes[0].nombre) : "N/D";
  if (sedes.length > 1) {
    const venueMax = [...sedes].sort((a, b) => (b.funciones || []).length - (a.funciones || []).length)[0];
    if (venueMax) bestVenue = shortVenueName(venueMax.nombre);
  }

  return {
    chain,
    fnsCount,
    sedesCount,
    bestFormat,
    availPct,
    totalSeats,
    availSeats,
    earliestHour,
    primeTimeFnsCount: primeTimeFns.length,
    bestVenue,
  };
}

function calculateMatchmakerVerdict(movie, cp, cm) {
  if (cp.fnsCount === 0 && cm.fnsCount === 0) {
    return {
      winner: "none",
      tag: "Sin Funciones",
      scoreLabel: "0 funciones disponibles",
      headline: "No hay funciones disponibles actualmente para esta película",
      reason: "Prueba seleccionando otro día o quitando filtros de ciudad y formato.",
    };
  }
  if (cp.fnsCount > 0 && cm.fnsCount === 0) {
    return {
      winner: "Cineplanet",
      tag: "Exclusiva Cineplanet",
      scoreLabel: `${cp.fnsCount} funciones en ${cp.sedesCount} cines`,
      headline: `🏆 Recomendación: Cineplanet (Exclusividad)`,
      reason: `Cineplanet es la única cadena que proyecta esta película con tus filtros actuales, con funciones destacadas en ${cp.bestVenue}.`,
    };
  }
  if (cm.fnsCount > 0 && cp.fnsCount === 0) {
    return {
      winner: "Cinemark",
      tag: "Exclusiva Cinemark",
      scoreLabel: `${cm.fnsCount} funciones en ${cm.sedesCount} cines`,
      headline: `🏆 Recomendación: Cinemark (Exclusividad)`,
      reason: `Cinemark es la única cadena que proyecta esta película con tus filtros actuales, con funciones destacadas en ${cm.bestVenue}.`,
    };
  }

  let cpScore = 50;
  let cmScore = 50;

  if (cp.bestFormat.includes("IMAX") || cp.bestFormat.includes("XD")) cpScore += 25;
  if (cm.bestFormat.includes("IMAX") || cm.bestFormat.includes("XD")) cmScore += 25;

  if (cp.availPct !== null && cm.availPct !== null) {
    if (cp.availPct > cm.availPct + 10) cpScore += 20;
    else if (cm.availPct > cp.availPct + 10) cmScore += 20;
  }

  if (cp.fnsCount > cm.fnsCount) cpScore += 10;
  else if (cm.fnsCount > cp.fnsCount) cmScore += 10;

  if (cp.primeTimeFnsCount > cm.primeTimeFnsCount) cpScore += 10;
  else if (cm.primeTimeFnsCount > cp.primeTimeFnsCount) cmScore += 10;

  if (cmScore > cpScore) {
    let detail = "";
    if (cm.bestFormat.includes("XD")) detail = `cuenta con sala de gran formato ${cm.bestFormat}`;
    else if (cm.availPct !== null && cm.availPct > (cp.availPct || 0)) detail = `ofrece mayor disponibilidad de butacas libres (${cm.availPct}%)`;
    else detail = `cuenta con ${cm.fnsCount} funciones y excelente cobertura en ${cm.bestVenue}`;

    return {
      winner: "Cinemark",
      tag: "Mejor Elección",
      scoreLabel: `Índice de Conveniencia: Cinemark ${cmScore} pts vs Cineplanet ${cpScore} pts`,
      headline: `🏆 Te conviene verla en Cinemark (${cm.bestVenue})`,
      reason: `Cinemark lidera la recomendación porque ${detail}. Es ideal para disfrutar la mejor experiencia en ${cm.bestFormat}.`,
    };
  } else if (cpScore > cmScore) {
    let detail = "";
    if (cp.bestFormat.includes("IMAX") || cp.bestFormat.includes("PRIME")) detail = `ofrece pantalla superior en formato ${cp.bestFormat}`;
    else if (cp.availPct !== null && cp.availPct > (cm.availPct || 0)) detail = `ofrece ${cp.availPct}% de asientos desocupados`;
    else detail = `posee mayor número de horarios (${cp.fnsCount} funciones en ${cp.sedesCount} sedes)`;

    return {
      winner: "Cineplanet",
      tag: "Mejor Elección",
      scoreLabel: `Índice de Conveniencia: Cineplanet ${cpScore} pts vs Cinemark ${cmScore} pts`,
      headline: `🏆 Te conviene verla en Cineplanet (${cp.bestVenue})`,
      reason: `Cineplanet es la opción recomendada porque ${detail}. Podrás elegir entre más alternativas de horario y sedes.`,
    };
  } else {
    return {
      winner: "Empate",
      tag: "Empate Técnico",
      scoreLabel: `Puntaje equilibrado: 50 / 50`,
      headline: `🤝 Ambas cadenas ofrecen una experiencia equivalente`,
      reason: `Tanto Cineplanet (${cp.fnsCount} funciones) como Cinemark (${cm.fnsCount} funciones) disponen de horarios y butacas similares. Te sugerimos elegir el cine más cercano a tu ubicación.`,
    };
  }
}

function renderMatchmakerColumn(chain, metrics, buyUrl, isRecommended) {
  const chainIcons = {
    "Cineplanet": "🟠",
    "Cinemark": "🔴",
    "Cinépolis": "🔵",
    "Cine Star": "⭐",
    "Movie Time": "🎬",
    "UVK": "👑",
  };
  const icon = chainIcons[chain] || "🎬";
  const cadSlug = chain.toLowerCase().replace(/[^a-z0-9]/g, "");

  let dispText = "Consultar en sala";
  if (metrics.availPct !== null) {
    dispText = `${metrics.availPct}% libre (${metrics.availSeats} de ${metrics.totalSeats} asientos)`;
  }

  return `
    <div class="matchmaker-col ${isRecommended ? "is-recommended" : ""}">
      <div class="matchmaker-col-header">
        <div class="matchmaker-col-title">
          <span>${icon}</span>
          <span>${escapeHTML(chain)}</span>
        </div>
        <span class="matchmaker-col-badge badge-${cadSlug}">${metrics.fnsCount} funciones</span>
      </div>
      <div class="matchmaker-stats-list">
        <div class="matchmaker-stat-row">
          <span class="matchmaker-stat-label">Mejor Pantalla:</span>
          <span class="matchmaker-stat-val">${escapeHTML(metrics.bestFormat)}</span>
        </div>
        <div class="matchmaker-stat-row">
          <span class="matchmaker-stat-label">Disponibilidad de asientos:</span>
          <span class="matchmaker-stat-val">${escapeHTML(dispText)}</span>
        </div>
        <div class="matchmaker-stat-row">
          <span class="matchmaker-stat-label">Sede destacada:</span>
          <span class="matchmaker-stat-val">${escapeHTML(metrics.bestVenue)}</span>
        </div>
        <div class="matchmaker-stat-row">
          <span class="matchmaker-stat-label">Horario estelar (19h a 21:30h):</span>
          <span class="matchmaker-stat-val">${metrics.primeTimeFnsCount} opciones</span>
        </div>
        <div class="matchmaker-stat-row">
          <span class="matchmaker-stat-label">Primera función:</span>
          <span class="matchmaker-stat-val">${escapeHTML(metrics.earliestHour)}</span>
        </div>
      </div>
      <div class="matchmaker-col-actions">
        <a href="${escapeHTML(buyUrl)}" target="_blank" rel="noopener noreferrer" class="matchmaker-buy-btn">
          Comprar en ${escapeHTML(chain)} ↗
        </a>
      </div>
    </div>
  `;
}

function openTicketModal(data) {
  const modal = document.querySelector("#ticketModal");
  const modalBody = document.querySelector("#ticketModalBody");
  if (!modal || !modalBody) return;

  const hourFormatted = formatShowtimeHour(data.hour);
  const dayFormatted = formatDateLabel(data.day);
  const chainName = data.chain || "Cine";
  const cadClass = chainName.toLowerCase().replace(/\s+/g, "");
  const badgeClass = `chain-badge-${cadClass}`;

  let seatsHtml = "";
  if (data.dispCap && Number(data.dispCap) > 0) {
    const avail = Number(data.dispAvail) || 0;
    const cap = Number(data.dispCap);
    const pct = Math.round((avail / cap) * 100);
    const seatColor = pct > 45 ? "#22c55e" : pct > 15 ? "#eab308" : "#ef4444";
    seatsHtml = `
      <div class="ticket-seats-box">
        <div class="ticket-seats-head">
          <span>Disponibilidad en Sala:</span>
          <strong>${avail} de ${cap} butacas libres (${pct}%)</strong>
        </div>
        <div class="ticket-seats-bar">
          <div class="ticket-seats-fill" style="width: ${pct}%; background: ${seatColor};"></div>
        </div>
      </div>
    `;
  }

  const salaInfo = data.sala ? ` (${data.sala})` : "";
  const shareText = encodeURIComponent(
    `🍿 ¡Vamos al cine a ver "${data.movieTitle}"!\n` +
    `📅 ${dayFormatted} a las ${hourFormatted}\n` +
    `📍 ${data.venue} (${data.chain})${salaInfo}\n` +
    `🎬 Formato: ${data.format} · ${data.lang}\n` +
    `🎟️ Compra aquí: ${data.buyUrl}`
  );

  modalBody.innerHTML = `
    <div class="ticket-main-info">
      <div class="ticket-venue-row">
        <span class="chain-badge ${badgeClass}">${escapeHTML(data.chain)}</span>
        <span style="color: var(--muted); font-size: 0.85rem;">${escapeHTML(data.city)}</span>
      </div>
      <h4 class="ticket-movie-title">${escapeHTML(data.movieTitle)}</h4>
      <div style="font-weight: 700; color: var(--primary);">${escapeHTML(data.venue)}</div>
    </div>

    <div class="ticket-details-grid">
      <div class="ticket-detail-item">
        <span class="ticket-detail-label">Fecha</span>
        <span class="ticket-detail-val">${escapeHTML(dayFormatted)}</span>
      </div>
      <div class="ticket-detail-item">
        <span class="ticket-detail-label">Horario</span>
        <span class="ticket-detail-val" style="font-size: 1.15rem; color: var(--primary); font-family: var(--font-mono);">${escapeHTML(hourFormatted)}</span>
      </div>
      <div class="ticket-detail-item">
        <span class="ticket-detail-label">Formato</span>
        <span class="ticket-detail-val">${escapeHTML(data.format)}</span>
      </div>
      <div class="ticket-detail-item">
        <span class="ticket-detail-label">Idioma</span>
        <span class="ticket-detail-val">${escapeHTML(data.lang)}</span>
      </div>
      ${data.sala ? `
      <div class="ticket-detail-item">
        <span class="ticket-detail-label">Sala</span>
        <span class="ticket-detail-val" style="font-weight: 700; color: var(--text);">${escapeHTML(data.sala)}</span>
      </div>` : ""}
    </div>

    ${seatsHtml}

    <div class="ticket-actions-row">
      <a href="${safeUrl(data.buyUrl)}" target="_blank" rel="noopener noreferrer" class="ticket-btn-buy">
        🎟️ Ir a Comprar Entradas en ${escapeHTML(data.chain)} ↗
      </a>
      <a href="https://wa.me/?text=${shareText}" target="_blank" rel="noopener noreferrer" class="ticket-btn-share">
        📲 Invitar amigos por WhatsApp
      </a>
      <button type="button" class="ticket-btn-copy" id="copyTicketBtn">
        📋 Copiar datos de la función
      </button>
    </div>
  `;

  const copyBtn = modalBody.querySelector("#copyTicketBtn");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const plainText = `🍿 Película: ${data.movieTitle}\n📅 ${dayFormatted} - ${hourFormatted}\n📍 ${data.venue} (${data.chain})${salaInfo}\n🎬 ${data.format} · ${data.lang}\n🎟️ ${data.buyUrl}`;
      try {
        await navigator.clipboard.writeText(plainText);
        copyBtn.textContent = "✅ ¡Copiado al portapapeles!";
        announceToScreenReader("Datos de la función copiados al portapapeles");
        setTimeout(() => { copyBtn.textContent = "📋 Copiar datos de la función"; }, 2500);
      } catch (err) {
        copyBtn.textContent = "Error al copiar";
      }
    });
  }

  modal.hidden = false;
  document.body.style.overflow = "hidden";
  announceToScreenReader(`Función seleccionada: ${data.movieTitle} a las ${hourFormatted} en ${data.venue}`);
}

function closeTicketModal() {
  const modal = document.querySelector("#ticketModal");
  if (modal) {
    modal.hidden = true;
    document.body.style.overflow = "";
  }
}

function printExecutiveReport() {
  window.print();
}

async function copyExecutiveSummary() {
  const data = computeExecutiveAnalytics();
  const topStr = data.topMovies.slice(0, 5)
    .map((m, i) => `  ${i + 1}. ${m.titulo} (${m.cadena}) — ${m.funciones} funciones en ${m.sedes} sedes`)
    .join("\n");

  const text = [
    `🎬 REPORTE EJECUTIVO DE CARTELERA (Cineplanet & Cinemark)`,
    `📅 Fecha: ${new Date().toLocaleDateString("es-PE")} ${new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`,
    ``,
    `📊 MÉTRICAS CLAVE:`,
    `• Películas activas: ${data.totalPeliculas}`,
    `• Sedes activas: ${data.totalSedes}`,
    `• Funciones totales: ${data.totalFunciones}`,
    ...(data.asientosCapacidad > 0 ? [`• Butacas disponibles: ${data.asientosDisponibles} (${data.avgOccupancy}% ocupación)`] : []),
    ``,
    `🏢 PARTICIPACIÓN:`,
    `• Cineplanet: ${data.cp.share}% (${data.cp.funciones} funciones en ${data.cp.sedesCount} cines)`,
    `• Cinemark: ${data.cm.share}% (${data.cm.funciones} funciones en ${data.cm.sedesCount} cines)`,
    ``,
    `🏆 TOP PELÍCULAS CON MÁS FUNCIONES:`,
    topStr,
  ].join("\n");

  try {
    await navigator.clipboard.writeText(text);
    const originalText = els.copySummaryBtn.textContent;
    els.copySummaryBtn.textContent = "✅ ¡Copiado!";
    setTimeout(() => {
      els.copySummaryBtn.textContent = originalText;
    }, 2000);
  } catch (err) {
    alert("No se pudo copiar automáticamente. Puedes seleccionarlo manualmente.");
  }
}

async function downloadXlsx(rows) {
  const analytics = computeExecutiveAnalytics();
  const now = new Date();
  const fechaStr = new Intl.DateTimeFormat("es-PE", { dateStyle: "full", timeStyle: "short" }).format(now);
  const fileName = `reporte_cartelera_${getExportFileStamp()}.xlsx`;

  // Si ExcelJS está disponible, generamos el archivo con formato profesional, colores y filtros
  if (typeof ExcelJS !== "undefined") {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Cartelera de Cine - Cineplanet & Cinemark";
      workbook.created = now;

      const borderThin = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      const headerFill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2F5673" },
      };

      const bannerFill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF17303F" },
      };

      const metaFill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF1F5F9" },
      };

      const zebraFill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF8FAFC" },
      };

      // ==========================================
      // HOJA 1: RESUMEN EJECUTIVO (DASHBOARD)
      // ==========================================
      const wsResumen = workbook.addWorksheet("Resumen Ejecutivo", {
        views: [{ showGridLines: true }],
      });

      // Banner Superior
      wsResumen.mergeCells("A1:E1");
      const titleCell = wsResumen.getCell("A1");
      titleCell.value = "📊 REPORTE ANALÍTICO: RESUMEN EJECUTIVO";
      titleCell.fill = bannerFill;
      titleCell.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
      titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      wsResumen.getRow(1).height = 32;

      wsResumen.mergeCells("A2:E2");
      const metaCell = wsResumen.getCell("A2");
      metaCell.value = `Generado el: ${fechaStr} | Cineplanet & Cinemark Perú | Filtro: ${state.filters.chain || "Todas las cadenas"}`;
      metaCell.fill = metaFill;
      metaCell.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF475569" } };
      metaCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      wsResumen.getRow(2).height = 20;

      // Sección 1: Métricas Clave
      wsResumen.getCell("A4").value = "MÉTRICAS CLAVE DEL MERCADO";
      wsResumen.getCell("A4").font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF17303F" } };

      wsResumen.getRow(5).values = ["Métrica", "Valor"];
      wsResumen.getRow(5).height = 24;
      ["A5", "B5"].forEach((addr) => {
        const c = wsResumen.getCell(addr);
        c.fill = headerFill;
        c.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        c.alignment = { vertical: "middle", horizontal: addr === "A5" ? "left" : "center", indent: addr === "A5" ? 1 : 0 };
      });

      const kpis = [
        ["Películas Únicas en Cartelera", analytics.totalPeliculas],
        ["Complejos de Cine con Funciones", analytics.totalSedes],
        ["Ciudades con Cobertura", analytics.totalCiudades],
        ["Total de Funciones Programadas", analytics.totalFunciones],
        ["Butacas Monitoreadas Disponibles", analytics.asientosDisponibles || "N/D"],
      ];

      kpis.forEach((kpi, i) => {
        const rowNum = 6 + i;
        const row = wsResumen.getRow(rowNum);
        row.values = kpi;
        row.height = 22;
        const cA = wsResumen.getCell(`A${rowNum}`);
        const cB = wsResumen.getCell(`B${rowNum}`);
        cA.font = { name: "Segoe UI", size: 10 };
        cB.font = { name: "Segoe UI", size: 10, bold: true };
        cA.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
        cB.alignment = { vertical: "middle", horizontal: "center" };
        cA.border = borderThin;
        cB.border = borderThin;
        if (i % 2 === 1) {
          cA.fill = zebraFill;
          cB.fill = zebraFill;
        }
      });

      // Sección 2: Desglose por Cadena
      const rCadenaStart = 12;
      wsResumen.getCell(`A${rCadenaStart}`).value = "PARTICIPACIÓN POR CADENA DE CINE";
      wsResumen.getCell(`A${rCadenaStart}`).font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF17303F" } };

      const hCadenaRow = wsResumen.getRow(rCadenaStart + 1);
      hCadenaRow.values = ["Cadena", "Películas", "Sedes", "Funciones", "% Participación"];
      hCadenaRow.height = 24;
      ["A", "B", "C", "D", "E"].forEach((col) => {
        const c = wsResumen.getCell(`${col}${rCadenaStart + 1}`);
        c.fill = headerFill;
        c.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        c.alignment = { vertical: "middle", horizontal: "center" };
      });

      const cadenasData = [
        ["Cineplanet", analytics.cp.peliculasCount, analytics.cp.sedesCount, analytics.cp.funciones, `${analytics.cp.share}%`],
        ["Cinemark", analytics.cm.peliculasCount, analytics.cm.sedesCount, analytics.cm.funciones, `${analytics.cm.share}%`],
      ];

      cadenasData.forEach((cd, i) => {
        const rowNum = rCadenaStart + 2 + i;
        const row = wsResumen.getRow(rowNum);
        row.values = cd;
        row.height = 22;
        ["A", "B", "C", "D", "E"].forEach((col, colIdx) => {
          const c = wsResumen.getCell(`${col}${rowNum}`);
          c.font = { name: "Segoe UI", size: 10, bold: colIdx === 0 || colIdx === 4 };
          c.alignment = { vertical: "middle", horizontal: "center" };
          c.border = borderThin;
          if (colIdx === 0) {
            c.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
            if (cd[0] === "Cineplanet") {
              c.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFE0563A" } };
            } else {
              c.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FF7A3FD1" } };
            }
          }
        });
      });

      // Sección 3: Top Películas
      const rTopStart = 17;
      wsResumen.getCell(`A${rTopStart}`).value = "TOP PELÍCULAS CON MAYOR NÚMERO DE FUNCIONES";
      wsResumen.getCell(`A${rTopStart}`).font = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF17303F" } };

      const hTopRow = wsResumen.getRow(rTopStart + 1);
      hTopRow.values = ["#", "Título de Película", "Cadena", "Sedes de Cobertura", "Funciones Totales"];
      hTopRow.height = 24;
      ["A", "B", "C", "D", "E"].forEach((col) => {
        const c = wsResumen.getCell(`${col}${rTopStart + 1}`);
        c.fill = headerFill;
        c.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        c.alignment = { vertical: "middle", horizontal: "center" };
      });

      analytics.topMovies.slice(0, 10).forEach((m, i) => {
        const rowNum = rTopStart + 2 + i;
        const row = wsResumen.getRow(rowNum);
        row.values = [i + 1, m.titulo, m.cadena, `${m.sedes} cines`, m.funciones];
        row.height = 22;
        ["A", "B", "C", "D", "E"].forEach((col, colIdx) => {
          const c = wsResumen.getCell(`${col}${rowNum}`);
          c.font = { name: "Segoe UI", size: 10 };
          c.border = borderThin;
          c.alignment = { vertical: "middle", horizontal: "center" };
          if (colIdx === 1) {
            c.font = { name: "Segoe UI", size: 10, bold: true };
            c.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
          }
          if (colIdx === 2) {
            if (m.cadena === "Cineplanet") {
              c.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFE0563A" } };
            } else {
              c.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF7A3FD1" } };
            }
          }
          if (i % 2 === 1) c.fill = zebraFill;
        });
      });

      wsResumen.columns = [
        { width: 35 },
        { width: 38 },
        { width: 18 },
        { width: 22 },
        { width: 20 },
      ];

      // ==========================================
      // HOJA 2: DETALLE DE FUNCIONES (TABLA FORMATEADA)
      // ==========================================
      const wsDetalle = workbook.addWorksheet("Detalle de Funciones", {
        views: [{ state: "frozen", ySplit: 4, showGridLines: true }],
      });

      // Banner Superior de Detalle
      wsDetalle.mergeCells("A1:K1");
      const dTitle = wsDetalle.getCell("A1");
      dTitle.value = "🎬 CARTELERA DE CINES: DETALLE DE FUNCIONES";
      dTitle.fill = bannerFill;
      dTitle.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
      dTitle.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      wsDetalle.getRow(1).height = 32;

      wsDetalle.mergeCells("A2:K2");
      const dMeta = wsDetalle.getCell("A2");
      dMeta.value = `Total registros: ${rows.length} funciones listadas | Reporte generado el: ${fechaStr}`;
      dMeta.fill = metaFill;
      dMeta.font = { name: "Segoe UI", size: 9, italic: true, color: { argb: "FF475569" } };
      dMeta.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      wsDetalle.getRow(2).height = 20;

      // Fila 4: Encabezados de Tabla
      const headers = [
        "Película",
        "Cadena",
        "Género",
        "Ciudad",
        "Sede",
        "Fecha",
        "Hora",
        "Formato",
        "Idioma",
        "Disponibilidad",
        "Enlace Web",
      ];

      const headerRow = wsDetalle.getRow(4);
      headerRow.values = headers;
      headerRow.height = 26;

      const cols = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];
      cols.forEach((col, idx) => {
        const cell = wsDetalle.getCell(`${col}4`);
        cell.fill = headerFill;
        cell.font = { name: "Segoe UI", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
        cell.alignment = {
          vertical: "middle",
          horizontal: [0, 2, 3, 4].includes(idx) ? "left" : "center",
          indent: [0, 2, 3, 4].includes(idx) ? 1 : 0,
        };
        cell.border = {
          top: { style: "medium", color: { argb: "FF17303F" } },
          bottom: { style: "medium", color: { argb: "FF17303F" } },
          left: borderThin.left,
          right: borderThin.right,
        };
      });

      // Filas de Datos con formato condicional y colores
      rows.forEach((row, i) => {
        const rowNum = 5 + i;
        const wsRow = wsDetalle.getRow(rowNum);
        wsRow.height = 22;

        const isCp = row.cadena === "Cineplanet";
        const dispText = row.disponibilidad || "N/D";
        const isHigh = dispText.includes("HIGH") || dispText.includes("Alta");
        const isLow = dispText.includes("LOW") || dispText.includes("Baja");

        wsRow.values = [
          row.titulo || "",
          row.cadena || "",
          row.genero || "",
          row.ciudad || "",
          row.sede || "",
          row.dia || "",
          row.hora || "",
          row.formato_funcion || "Regular",
          row.idioma_funcion || "",
          dispText,
          row.url ? { text: "Ver en web", hyperlink: row.url } : "N/D",
        ];

        cols.forEach((col, colIdx) => {
          const cell = wsDetalle.getCell(`${col}${rowNum}`);
          cell.font = { name: "Segoe UI", size: 9.5 };
          cell.border = borderThin;
          cell.alignment = {
            vertical: "middle",
            horizontal: [0, 2, 3, 4].includes(colIdx) ? "left" : "center",
            indent: [0, 2, 3, 4].includes(colIdx) ? 1 : 0,
          };

          // Zebra striping base
          if (i % 2 === 1) {
            cell.fill = zebraFill;
          }

          // Estilo específico por columna
          if (colIdx === 0) {
            // Título
            cell.font = { name: "Segoe UI", size: 9.5, bold: true, color: { argb: "FF1E293B" } };
          } else if (colIdx === 1) {
            // Cadena
            cell.font = {
              name: "Segoe UI",
              size: 9.5,
              bold: true,
              color: { argb: isCp ? "FFE0563A" : "FF7A3FD1" },
            };
          } else if (colIdx === 6) {
            // Hora
            cell.font = { name: "Segoe UI", size: 9.5, bold: true };
          } else if (colIdx === 7) {
            // Formato
            cell.font = { name: "Segoe UI", size: 9, bold: true };
          } else if (colIdx === 9) {
            // Disponibilidad
            if (isHigh) {
              cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FF15803D" } };
            } else if (isLow) {
              cell.font = { name: "Segoe UI", size: 9, bold: true, color: { argb: "FFB91C1C" } };
            }
          } else if (colIdx === 10 && row.url) {
            // URL Link
            cell.font = { name: "Segoe UI", size: 9, underline: true, color: { argb: "FF2563EB" } };
          }
        });
      });

      // Habilitar filtros desplegables nativos de Excel en la fila de encabezados
      wsDetalle.autoFilter = `A4:K${rows.length + 4}`;

      // Anchos de columna calculados inteligentemente
      wsDetalle.columns = [
        { width: 34 }, // Película
        { width: 15 }, // Cadena
        { width: 18 }, // Género
        { width: 16 }, // Ciudad
        { width: 28 }, // Sede
        { width: 14 }, // Fecha
        { width: 10 }, // Hora
        { width: 14 }, // Formato
        { width: 16 }, // Idioma
        { width: 22 }, // Disponibilidad
        { width: 15 }, // URL
      ];

      // Generar buffer y descargar archivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      triggerDownload(blob, fileName);
      return;
    } catch (err) {
      console.warn("ExcelJS falló, recurriendo al exportador básico:", err);
    }
  }

  // Fallback con SheetJS básico si ExcelJS no estuviera disponible
  if (typeof XLSX === "undefined") {
    alert("No se pudo cargar la librería de exportación de Excel.");
    return;
  }

  const data = rows.map((row) => ({
    Titulo: row.titulo,
    Cadena: row.cadena,
    Genero: row.genero,
    Idiomas: row.idiomas,
    Formatos: row.formatos,
    Ciudad: row.ciudad,
    Sede: row.sede,
    Dias: row.dia,
    Hora: row.hora,
    "Formato Funcion": row.formato_funcion,
    "Idioma Funcion": row.idioma_funcion,
    Disponibilidad: row.disponibilidad,
    URL: row.url,
  }));

  const wsDetalle = XLSX.utils.json_to_sheet(data, { header: exportHeaders });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, wsDetalle, "Detalle Funciones");
  XLSX.writeFile(workbook, fileName);
}

function triggerDownload(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function exportFilteredToCsv() {
  const rows = buildRowsForExport();
  if (!rows.length) {
    alert("No hay filas para exportar con los filtros actuales.");
    return;
  }
  downloadCsv(rows);
}

function exportFilteredToXlsx() {
  const rows = buildRowsForExport();
  if (!rows.length) {
    alert("No hay filas para exportar con los filtros actuales.");
    return;
  }
  downloadXlsx(rows);
}

function downloadPdfReport() {
  if (typeof window.jspdf === "undefined" || typeof window.jspdf.jsPDF === "undefined") {
    alert("La librería PDF aún se está cargando. Por favor inténtalo de nuevo en un instante.");
    return;
  }

  const rows = buildRowsForExport();
  if (!rows.length) {
    alert("No hay funciones para exportar con los filtros actuales.");
    return;
  }

  const analytics = computeExecutiveAnalytics();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const now = new Date();
  const fechaStr = new Intl.DateTimeFormat("es-PE", { dateStyle: "full", timeStyle: "short" }).format(now);

  // 1. Banner Superior
  doc.setFillColor(23, 48, 63); // #17303F
  doc.rect(10, 10, 277, 20, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("CARTELERA DE CINES: REPORTE DE FUNCIONES", 16, 21);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(200, 215, 225);
  doc.text(`Cineplanet & Cinemark Perú • Emitido: ${fechaStr} • Filtro: ${state.filters.chain || "Todas las cadenas"}`, 16, 26);

  // 2. Resumen Métricas
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(10, 33, 277, 11, 2, 2, "F");

  doc.setTextColor(30, 41, 59);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  const kpiText = `Películas: ${analytics.totalPeliculas}   |   Cines: ${analytics.totalSedes}   |   Funciones: ${analytics.totalFunciones}   |   Cineplanet: ${analytics.cp.share}% (${analytics.cp.funciones} fn)   |   Cinemark: ${analytics.cm.share}% (${analytics.cm.funciones} fn)`;
  doc.text(kpiText, 14, 40);

  // 3. Tabla de Funciones con jsPDF autoTable
  const headers = [
    ["#", "Película", "Cadena", "Ciudad", "Sede", "Fecha", "Hora", "Formato", "Idioma", "Disponibilidad"]
  ];

  const bodyData = rows.map((r, idx) => [
    idx + 1,
    r.titulo || "",
    r.cadena || "",
    r.ciudad || "",
    r.sede || "",
    r.dia || "",
    r.hora || "",
    r.formato_funcion || "Regular",
    r.idioma_funcion || "",
    r.disponibilidad || "N/D"
  ]);

  doc.autoTable({
    startY: 47,
    head: headers,
    body: bodyData,
    margin: { left: 10, right: 10, bottom: 14 },
    theme: "striped",
    headStyles: {
      fillColor: [47, 86, 115], // #2F5673
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      1: { halign: "left", fontStyle: "bold", cellWidth: 55 },
      2: { halign: "center", cellWidth: 22 },
      3: { halign: "left", cellWidth: 22 },
      4: { halign: "left", cellWidth: 44 },
      5: { halign: "center", cellWidth: 20 },
      6: { halign: "center", fontStyle: "bold", cellWidth: 16 },
      7: { halign: "center", fontStyle: "bold", cellWidth: 18 },
      8: { halign: "center", cellWidth: 26 },
      9: { halign: "center", cellWidth: 34 },
    },
    didParseCell: function(data) {
      if (data.section === "body") {
        if (data.column.index === 2) {
          const val = String(data.cell.raw);
          if (val === "Cineplanet") {
            data.cell.styles.textColor = [224, 86, 58];
            data.cell.styles.fontStyle = "bold";
          } else if (val === "Cinemark") {
            data.cell.styles.textColor = [122, 63, 209];
            data.cell.styles.fontStyle = "bold";
          }
        }
      }
    },
    didDrawPage: function(data) {
      const pageCount = doc.internal.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(140, 140, 140);
      doc.text(
        `Página ${doc.internal.getCurrentPageInfo().pageNumber} de ${pageCount} • Visor de Películas Cineplanet & Cinemark`,
        10,
        doc.internal.pageSize.height - 6
      );
    }
  });

  const fileName = `cartelera_funciones_${getExportFileStamp()}.pdf`;
  doc.save(fileName);
}

function buildSummaryShareText() {
  const data = computeExecutiveAnalytics();
  const topStr = data.topMovies.slice(0, 5)
    .map((m) => `• ${m.titulo} (${m.cadena}): ${m.funciones} fn en ${m.sedes} cines`)
    .join("\n");

  return [
    `🎬 CARTELERA DE CINES (Cineplanet & Cinemark)`,
    `📅 ${new Date().toLocaleDateString("es-PE")} ${new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`,
    ``,
    `📊 RESUMEN:`,
    `• ${data.totalPeliculas} películas en exhibición`,
    `• ${data.totalSedes} cines con funciones activas`,
    `• ${data.totalFunciones} funciones programadas`,
    ``,
    `🏢 PARTICIPACIÓN:`,
    `• Cineplanet: ${data.cp.share}% (${data.cp.funciones} fn)`,
    `• Cinemark: ${data.cm.share}% (${data.cm.funciones} fn)`,
    ``,
    `🏆 TOP PELÍCULAS:`,
    topStr,
  ].join("\n");
}

function showToast(message, actionLabel = null, actionCallback = null, durationMs = 6000) {
  let container = document.querySelector("#toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }
  const toast = document.createElement("div");
  toast.className = "toast-msg";

  const content = document.createElement("div");
  content.className = "toast-content";
  content.innerHTML = message;
  toast.appendChild(content);

  if (actionLabel && typeof actionCallback === "function") {
    const actionBtn = document.createElement("button");
    actionBtn.type = "button";
    actionBtn.className = "toast-action-btn";
    actionBtn.textContent = actionLabel;
    actionBtn.addEventListener("click", () => {
      actionCallback();
      dismissToast(toast);
    });
    toast.appendChild(actionBtn);
  }

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "toast-close-btn";
  closeBtn.setAttribute("aria-label", "Cerrar");
  closeBtn.innerHTML = "&times;";
  closeBtn.addEventListener("click", () => dismissToast(toast));
  toast.appendChild(closeBtn);

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("toast-show");
  });

  const timer = setTimeout(() => {
    dismissToast(toast);
  }, durationMs);

  function dismissToast(el) {
    clearTimeout(timer);
    el.classList.remove("toast-show");
    el.classList.add("toast-hide");
    setTimeout(() => el.remove(), 350);
  }
}

async function shareMobileSummary() {
  const text = buildSummaryShareText();

  if (navigator.share) {
    try {
      await navigator.share({
        title: "Cartelera de Cine - Reporte",
        text: text,
      });
      return;
    } catch (err) {
      if (err.name !== "AbortError") {
        console.warn("Error al compartir texto:", err);
      } else {
        return;
      }
    }
  }

  // Fallback: abrir WhatsApp Web o compartir enlace directo
  const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  window.open(waUrl, "_blank");
}

async function sendOrShareImage(mode = "results", triggerBtn = null) {
  if (typeof html2canvas === "undefined") {
    alert("No se pudo cargar la librería de captura.");
    return;
  }

  if (!state.filtered.length) {
    alert("No hay resultados para generar la imagen.");
    return;
  }

  const origText = triggerBtn ? triggerBtn.textContent : "";
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.textContent = "Generando imagen...";
  }

  let captureBanner = null;
  let targetEl = null;

  try {
    document.body.classList.add("capture-mode");

    if (mode === "report") {
      document.body.classList.add("capturing-report-modal");
      targetEl = document.querySelector(".report-modal-card") || els.reportModalBody;
    } else {
      targetEl = els.results;
      const analytics = computeExecutiveAnalytics();
      captureBanner = document.createElement("div");
      captureBanner.className = "capture-header";
      captureBanner.id = "tempCaptureHeader";
      captureBanner.innerHTML = `
        <div>
          <h2 class="capture-header-title">🎬 Reporte de Cartelera de Cines</h2>
          <p class="capture-header-sub">Cineplanet & Cinemark Perú • Generado: ${new Date().toLocaleDateString("es-PE")} ${new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        <div class="capture-header-stats">
          <span class="capture-chip"><strong>${analytics.totalPeliculas}</strong> películas</span>
          <span class="capture-chip"><strong>${analytics.totalSedes}</strong> cines</span>
          <span class="capture-chip"><strong>${analytics.totalFunciones}</strong> funciones</span>
          <span class="capture-chip" style="color: var(--cineplanet)">CP: ${analytics.cp.share}%</span>
          <span class="capture-chip" style="color: var(--cinemark)">CM: ${analytics.cm.share}%</span>
        </div>
      `;
      els.results.prepend(captureBanner);
    }

    await new Promise((resolve) => requestAnimationFrame(() => resolve()));

    const rect = targetEl.getBoundingClientRect();
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const height = Math.max(rect.height, targetEl.scrollHeight);
    const scale = height > 3500 ? 1.5 : 2;

    const canvas = await html2canvas(targetEl, {
      backgroundColor: isDark ? "#14161a" : "#ffffff",
      scale: scale,
      useCORS: true,
      allowTaint: true,
      letterRendering: true,
      scrollX: 0,
      scrollY: mode === "report" ? 0 : -window.scrollY,
      windowWidth: Math.max(rect.width, document.documentElement.scrollWidth),
      windowHeight: Math.max(rect.height, document.documentElement.scrollHeight),
      removeContainer: true,
    });

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Error al procesar mapa de bits"))), "image/png");
    });

    const chainLabel = state.filters.chain ? norm(state.filters.chain).replace(/\s+/g, "_") : "todos";
    const fileName = mode === "report"
      ? `reporte_ejecutivo_${chainLabel}_${getExportFileStamp()}.png`
      : `cartelera_infografia_${chainLabel}_${getExportFileStamp()}.png`;
    const imageFile = new File([blob], fileName, { type: "image/png" });
    const summaryText = buildSummaryShareText();

    // 1. Probar Web Share API con archivo (en móviles Android e iOS abre WhatsApp con la foto adjunta)
    if (navigator.canShare && navigator.canShare({ files: [imageFile] })) {
      try {
        await navigator.share({
          files: [imageFile],
          title: "🎬 Cartelera de Cines",
          text: summaryText,
        });
        showToast("✅ ¡Imagen compartida exitosamente!");
        return;
      } catch (shareErr) {
        if (shareErr.name === "AbortError") {
          return;
        }
        console.warn("navigator.share con archivo no completado:", shareErr);
      }
    }

    // 2. En escritorio o navegadores sin Web Share Files: Copiar al portapapeles del sistema
    let copied = false;
    if (navigator.clipboard && window.ClipboardItem) {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob }),
        ]);
        copied = true;
      } catch (clipErr) {
        console.warn("No se pudo copiar al portapapeles:", clipErr);
      }
    }

    // 3. Descargar el archivo PNG
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => {
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
    }, 1000);

    // 4. Notificación y acción directa
    if (copied) {
      showToast(
        "📋 <strong>¡Imagen copiada al portapapeles y descargada!</strong><br>Abre WhatsApp Web o tu chat y presiona <strong>Ctrl + V</strong> para pegarla y enviarla.",
        "Abrir WhatsApp Web",
        () => window.open("https://web.whatsapp.com/", "_blank"),
        9000
      );
    } else {
      showToast(
        "📥 <strong>¡Imagen descargada exitosamente!</strong><br>Ya puedes compartirla o enviarla a tus contactos.",
        null,
        null,
        6000
      );
    }
  } catch (error) {
    alert(`No se pudo generar la imagen: ${error.message}`);
  } finally {
    if (captureBanner) captureBanner.remove();
    document.body.classList.remove("capture-mode");
    document.body.classList.remove("capturing-report-modal");
    if (triggerBtn) {
      triggerBtn.disabled = false;
      triggerBtn.textContent = origText;
    }
  }
}

async function captureResults() {
  await sendOrShareImage("results", els.captureBtn);
}

function wireEvents() {
  ["input", "change"].forEach((eventName) => {
    els.searchInput.addEventListener(eventName, applyFilters);
    els.genreFilter.addEventListener(eventName, applyFilters);
    els.languageFilter.addEventListener(eventName, applyFilters);
    els.formatFilter.addEventListener(eventName, applyFilters);
    els.chainFilter.addEventListener(eventName, applyFilters);
    els.cityFilter.addEventListener(eventName, applyFilters);
    els.venueFilter.addEventListener(eventName, applyFilters);
    els.dayFilter.addEventListener(eventName, applyFilters);
    els.timeFromFilter.addEventListener(eventName, applyFilters);
    els.timeToFilter.addEventListener(eventName, applyFilters);
  });

  els.sortBy.addEventListener("change", () => {
    saveUserPreferences();
    applyFilters();
  });
  els.viewMode.addEventListener("change", () => {
    state.viewMode = els.viewMode.value || "cinematic";
    updateSegmentedViewBar(state.viewMode);
    saveUserPreferences();
    renderResults();
  });

  const segBar = document.querySelector("#viewSegmentedBar");
  if (segBar) {
    segBar.addEventListener("click", (e) => {
      const btn = e.target.closest(".view-segmented-btn");
      if (!btn) return;
      const targetView = btn.dataset.view;
      if (targetView && els.viewMode) {
        els.viewMode.value = targetView;
        state.viewMode = targetView;
        updateSegmentedViewBar(targetView);
        saveUserPreferences();
        renderResults();
      }
    });
  }

  const extraSelect = document.querySelector("#viewModeExtra");
  if (extraSelect) {
    extraSelect.addEventListener("change", () => {
      const targetView = extraSelect.value;
      if (targetView && els.viewMode) {
        els.viewMode.value = targetView;
        state.viewMode = targetView;
        updateSegmentedViewBar(targetView);
        saveUserPreferences();
        renderResults();
      }
    });
  }

  // --- MENÚ DESPLEGABLE DE EXPORTACIÓN UNIFICADO ---
  const expBtn = document.querySelector("#exportMenuBtn");
  const expMenu = document.querySelector("#exportDropdownMenu");
  if (expBtn && expMenu) {
    expBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = expMenu.hasAttribute("hidden");
      if (isHidden) {
        expMenu.removeAttribute("hidden");
        expBtn.setAttribute("aria-expanded", "true");
      } else {
        expMenu.setAttribute("hidden", "");
        expBtn.setAttribute("aria-expanded", "false");
      }
    });

    expMenu.querySelectorAll(".export-opt-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        expMenu.setAttribute("hidden", "");
        expBtn.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("click", (e) => {
      if (!expMenu.hasAttribute("hidden") && !expMenu.contains(e.target) && e.target !== expBtn) {
        expMenu.setAttribute("hidden", "");
        expBtn.setAttribute("aria-expanded", "false");
      }
    });
  }
  els.cityFilter.addEventListener("change", () => {
    syncVenueChecklistForCities();
    saveUserPreferences();
    applyFilters();
  });

  initQuickPills();
  initMobileStickyNav();
  initCustomChecklistsEvents();
  initMobileDrawerEvents();

  if (els.searchClearBtn) {
    els.searchClearBtn.addEventListener("click", () => {
      els.searchInput.value = "";
      els.searchClearBtn.hidden = true;
      applyFilters();
      els.searchInput.focus();
    });
  }

  if (els.scrollTopBtn) {
    els.scrollTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    window.addEventListener("scroll", () => {
      els.scrollTopBtn.hidden = window.scrollY < 380;
    }, { passive: true });
  }

  els.exportCsvBtn.addEventListener("click", exportFilteredToCsv);
  els.exportXlsxBtn.addEventListener("click", exportFilteredToXlsx);
  els.captureBtn.addEventListener("click", captureResults);
  els.clearFiltersBtn.addEventListener("click", clearFilters);
  els.activeFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter-key]");
    if (!button) return;
    resetFilterByKey(button.dataset.filterKey || "");
    applyFilters();
  });

  const filtersPanel = document.querySelector("#filtersPanel");
  const toggleFiltersBtn = document.querySelector("#toggleFiltersBtn");
  if (filtersPanel && toggleFiltersBtn) {
    toggleFiltersBtn.addEventListener("click", () => {
      filtersPanel.hidden = !filtersPanel.hidden;
      toggleFiltersBtn.textContent = filtersPanel.hidden ? "Mostrar filtros" : "Ocultar filtros";
    });
  }

  els.results.addEventListener("click", (event) => {
    const emptyChip = event.target.closest(".empty-state-chip");
    if (emptyChip) {
      resetFilterByKey(emptyChip.dataset.filterKey || "");
      applyFilters();
      return;
    }

    if (event.target.closest("#emptyStateResetBtn")) {
      clearFilters();
      return;
    }

    const synopsisToggle = event.target.closest(".cinematic-synopsis-toggle");
    if (synopsisToggle) {
      const textEl = synopsisToggle.previousElementSibling;
      if (textEl) {
        const isClamped = textEl.classList.toggle("is-clamped");
        synopsisToggle.textContent = isClamped ? "Ver más" : "Ver menos";
      }
      return;
    }

    const venuesToggle = event.target.closest(".cinematic-venues-toggle");
    if (venuesToggle) {
      const collapsed = venuesToggle.previousElementSibling;
      if (collapsed && collapsed.classList.contains("cinematic-venues-collapsed")) {
        const isOpen = collapsed.classList.toggle("is-open");
        venuesToggle.classList.toggle("is-open", isOpen);
        const count = venuesToggle.dataset.count || "";
        const labelSpan = venuesToggle.querySelector("span");
        if (labelSpan) {
          labelSpan.textContent = isOpen ? "Ocultar sedes adicionales" : `+ Ver ${count} sedes más`;
        }
      }
      return;
    }

    const matchmakerBtn = event.target.closest(".btn-compare-matchmaker");
    if (matchmakerBtn) {
      const idx = parseInt(matchmakerBtn.dataset.movieIndex, 10);
      openMatchmakerModal(idx);
      return;
    }

    const ticketChip = event.target.closest(".cinematic-chip[data-chip-action='ticket']");
    if (ticketChip) {
      openTicketModal(ticketChip.dataset);
      return;
    }

    const th = event.target.closest("th[data-sort-key]");
    if (th) {
      const key = th.dataset.sortKey;
      if (state.tableSort.key === key) {
        state.tableSort.dir = state.tableSort.dir * -1;
      } else {
        state.tableSort = { key, dir: key === "disponibilidad" ? -1 : 1 };
      }
      renderResults();
      return;
    }

    const chipBtn = event.target.closest(".table-chip-btn");
    if (chipBtn) {
      const key = chipBtn.dataset.chipKey;
      if (state.tableSort.key === key) {
        state.tableSort.dir = state.tableSort.dir * -1;
      } else {
        state.tableSort = { key, dir: key === "disponibilidad" ? -1 : 1 };
      }
      renderResults();
      return;
    }

    if (event.target.closest("#clearTableSortBtn")) {
      state.tableSort = { key: "default", dir: 1 };
      state.tableFilterText = "";
      renderResults();
      return;
    }
  });

  els.results.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      const ticketChip = event.target.closest(".cinematic-chip[data-chip-action='ticket']");
      if (ticketChip) {
        event.preventDefault();
        openTicketModal(ticketChip.dataset);
        return;
      }
      const toggleBtn = event.target.closest(".cinematic-venues-toggle");
      if (toggleBtn) {
        event.preventDefault();
        toggleBtn.click();
        return;
      }
    }
  });

  els.results.addEventListener("change", (event) => {
    if (event.target && event.target.id === "tableSortSelect") {
      const parts = event.target.value.split("_");
      const key = parts[0];
      const dir = parseInt(parts[1], 10) || 1;
      state.tableSort = { key, dir };
      renderResults();
    }
  });

  els.results.addEventListener("input", (event) => {
    if (event.target && event.target.id === "tableQuickSearch") {
      state.tableFilterText = event.target.value.toLowerCase().trim();
      updateTableFilterOnly();
    }
  });

  const groupByFormatToggle = document.querySelector("#groupByFormatToggle");
  if (groupByFormatToggle) {
    groupByFormatToggle.addEventListener("click", () => {
      state.groupByFormato = !state.groupByFormato;
      updateGroupByFormatButton();
      renderResults();
    });
  }

  if (els.openReportBtn) els.openReportBtn.addEventListener("click", openExecutiveReport);
  if (els.openReportBtnFilters) els.openReportBtnFilters.addEventListener("click", openExecutiveReport);
  if (els.closeReportBtn) els.closeReportBtn.addEventListener("click", closeExecutiveReport);
  if (els.printReportBtn) els.printReportBtn.addEventListener("click", printExecutiveReport);
  if (els.downloadReportPdfBtn) els.downloadReportPdfBtn.addEventListener("click", downloadPdfReport);
  if (els.shareReportImageBtn) els.shareReportImageBtn.addEventListener("click", () => sendOrShareImage("report", els.shareReportImageBtn));
  if (els.shareReportMobileBtn) els.shareReportMobileBtn.addEventListener("click", shareMobileSummary);
  if (els.copySummaryBtn) els.copySummaryBtn.addEventListener("click", copyExecutiveSummary);
  if (els.exportPdfBtn) els.exportPdfBtn.addEventListener("click", downloadPdfReport);
  if (els.shareMobileBtn) els.shareMobileBtn.addEventListener("click", shareMobileSummary);

  const closeMatchmakerBtn = document.querySelector("#closeMatchmakerBtn");
  if (closeMatchmakerBtn) closeMatchmakerBtn.addEventListener("click", closeMatchmakerModal);

  const closeTicketBtn = document.querySelector("#closeTicketBtn");
  if (closeTicketBtn) closeTicketBtn.addEventListener("click", closeTicketModal);

  const matchmakerModal = document.querySelector("#matchmakerModal");
  if (matchmakerModal) {
    matchmakerModal.addEventListener("click", (e) => {
      if (e.target === matchmakerModal) closeMatchmakerModal();
    });
  }

  const ticketModal = document.querySelector("#ticketModal");
  if (ticketModal) {
    ticketModal.addEventListener("click", (e) => {
      if (e.target === ticketModal) closeTicketModal();
    });
  }

  if (els.reportModal) {
    els.reportModal.addEventListener("click", (event) => {
      if (event.target === els.reportModal) closeExecutiveReport();
    });
  }

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (els.reportModal && !els.reportModal.hidden) closeExecutiveReport();
      const matchModal = document.querySelector("#matchmakerModal");
      if (matchModal && !matchModal.hidden) closeMatchmakerModal();
      const tModal = document.querySelector("#ticketModal");
      if (tModal && !tModal.hidden) closeTicketModal();
    }
  });

  window.addEventListener("online", () => {
    showToast("🟢 Conexión restablecida.", null, null, 2500);
    announceToScreenReader("Conexión de red restablecida");
  });
  window.addEventListener("offline", () => {
    showToast("⚠️ Modo sin conexión: Estás visualizando la cartelera guardada localmente.", null, null, 4000);
    announceToScreenReader("Atención: has perdido la conexión de red");
  });

  initOledThemeToggle();
}

function initQuickPills() {
  if (!els.quickPillsBar) return;

  els.quickPillsBar.addEventListener("click", (e) => {
    const btn = e.target.closest(".quick-pill-btn");
    if (!btn) return;
    const action = btn.dataset.pill;
    const { todayISO, tomorrowISO } = getResolvedTodayAndTomorrow();

    if (action === "chain-all") {
      Array.from(els.chainFilter.options).forEach((o) => (o.selected = false));
    } else if (action === "today") {
      els.dayFilter.value = els.dayFilter.value === todayISO ? "" : todayISO;
    } else if (action === "tomorrow" && tomorrowISO) {
      els.dayFilter.value = els.dayFilter.value === tomorrowISO ? "" : tomorrowISO;
    } else if (action === "matine") {
      const isAlready = els.timeFromFilter.value === "00:00" && els.timeToFilter.value === "15:00";
      els.timeFromFilter.value = isAlready ? "" : "00:00";
      els.timeToFilter.value = isAlready ? "" : "15:00";
    } else if (action === "noche") {
      const isAlready = els.timeFromFilter.value === "19:00" && els.timeToFilter.value === "23:59";
      els.timeFromFilter.value = isAlready ? "" : "19:00";
      els.timeToFilter.value = isAlready ? "" : "23:59";
    } else if (action === "dubbed") {
      const isAlready = (els.languageFilter.value || "").toLowerCase().includes("dob");
      if (isAlready) {
        els.languageFilter.value = "";
      } else {
        const opt = Array.from(els.languageFilter.options).find((o) => o.value.toLowerCase().includes("dob"));
        if (opt) els.languageFilter.value = opt.value;
      }
    } else if (action === "subbed") {
      const isAlready = (els.languageFilter.value || "").toLowerCase().includes("sub");
      if (isAlready) {
        els.languageFilter.value = "";
      } else {
        const opt = Array.from(els.languageFilter.options).find((o) => o.value.toLowerCase().includes("sub"));
        if (opt) els.languageFilter.value = opt.value;
      }
    } else if (action === "imax") {
      const isAlready = (els.formatFilter.value || "").includes("IMAX") || (els.formatFilter.value || "").includes("XD");
      if (isAlready) {
        els.formatFilter.value = "";
      } else {
        const opt = Array.from(els.formatFilter.options).find((o) => o.value.includes("IMAX") || o.value.includes("XD"));
        if (opt) els.formatFilter.value = opt.value;
      }
    } else if (action === "cineplanet") {
      toggleChainOption("Cineplanet");
    } else if (action === "cinemark") {
      toggleChainOption("Cinemark");
    } else if (action === "cinepolis") {
      toggleChainOption("Cinépolis");
    } else if (action === "cinestar") {
      toggleChainOption("Cine Star");
    } else if (action === "movietime") {
      toggleChainOption("Movie Time");
    } else if (action === "uvk") {
      toggleChainOption("UVK");
    } else if (action === "oled") {
      toggleOledTheme();
      return;
    } else if (btn.id === "pillClear" || action === "clear") {
      clearFilters();
      return;
    }

    applyFilters();
  });
}

function toggleChainOption(chainName) {
  const opt = Array.from(els.chainFilter.options).find((o) => o.value.toLowerCase() === chainName.toLowerCase());
  if (opt) {
    opt.selected = !opt.selected;
  }
}

function initMobileStickyNav() {
  if (els.mobileToggleFiltersBtn) {
    els.mobileToggleFiltersBtn.addEventListener("click", () => {
      const filtersPanel = els.filtersPanel || document.querySelector("#filtersPanel");
      if (filtersPanel) {
        const isHidden = filtersPanel.hidden;
        filtersPanel.hidden = !isHidden;
        if (els.toggleFiltersBtn) {
          els.toggleFiltersBtn.textContent = isHidden ? "Ocultar filtros" : "Mostrar filtros";
        }
        if (isHidden) {
          filtersPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    });
  }

  if (els.mobileTodayNavBtn) {
    els.mobileTodayNavBtn.addEventListener("click", () => {
      const { todayISO } = getResolvedTodayAndTomorrow();
      els.dayFilter.value = els.dayFilter.value === todayISO ? "" : todayISO;
      applyFilters();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (els.mobileReportNavBtn) {
    els.mobileReportNavBtn.addEventListener("click", openExecutiveReport);
  }

  if (els.mobileTopNavBtn) {
    els.mobileTopNavBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
}

function initCustomChecklistsEvents() {
  const citySearch = document.querySelector("#citySearchInput");
  if (citySearch) {
    citySearch.addEventListener("input", (e) => {
      const q = norm(e.target.value);
      document.querySelectorAll("#cityChecklistOptions .checklist-item").forEach((item) => {
        const text = norm(item.textContent);
        item.style.display = !q || text.includes(q) ? "" : "none";
      });
    });
  }

  const venueSearch = document.querySelector("#venueSearchInput");
  if (venueSearch) {
    venueSearch.addEventListener("input", (e) => {
      const q = norm(e.target.value);
      document.querySelectorAll("#venueChecklistOptions .checklist-item").forEach((item) => {
        const text = norm(item.textContent);
        item.style.display = !q || text.includes(q) ? "" : "none";
      });
    });
  }

  const cityOptions = document.querySelector("#cityChecklistOptions");
  if (cityOptions) {
    cityOptions.addEventListener("change", (e) => {
      const cb = e.target.closest(".city-checkbox");
      if (!cb) return;
      const opt = Array.from(els.cityFilter.options).find((o) => o.value === cb.value);
      if (opt) opt.selected = cb.checked;
      const item = cb.closest(".checklist-item");
      if (item) item.classList.toggle("is-selected", cb.checked);
      updateCitySelectionCount();
      syncVenueChecklistForCities();
      saveUserPreferences();
      applyFilters();
    });
  }

  const venueOptions = document.querySelector("#venueChecklistOptions");
  if (venueOptions) {
    venueOptions.addEventListener("change", (e) => {
      const cb = e.target.closest(".venue-checkbox");
      if (!cb) return;
      const opt = Array.from(els.venueFilter.options).find((o) => o.value === cb.value);
      if (opt) opt.selected = cb.checked;
      const item = cb.closest(".checklist-item");
      if (item) item.classList.toggle("is-selected", cb.checked);
      updateVenueSelectionCount();
      applyFilters();
    });
  }

  const chainPills = document.querySelector("#chainPillsSelector");
  if (chainPills) {
    chainPills.addEventListener("click", (e) => {
      const pill = e.target.closest(".chain-select-pill");
      if (!pill) return;
      const chain = pill.dataset.chain;
      if (!chain) {
        // "Todas" selected
        Array.from(els.chainFilter.options).forEach((o) => (o.selected = false));
      } else {
        const opt = Array.from(els.chainFilter.options).find((o) => o.value.toLowerCase() === chain.toLowerCase());
        if (opt) {
          opt.selected = !opt.selected;
        }
      }
      updateChainPillsSelection();
      applyFilters();
    });
  }
}

function initMobileDrawerEvents() {
  const drawerCloseBtn = document.querySelector("#drawerCloseBtn");
  if (drawerCloseBtn) {
    drawerCloseBtn.addEventListener("click", () => {
      const filtersPanel = els.filtersPanel || document.querySelector("#filtersPanel");
      if (filtersPanel) filtersPanel.hidden = true;
      if (els.toggleFiltersBtn) els.toggleFiltersBtn.textContent = "Mostrar filtros";
    });
  }

  const drawerClearBtn = document.querySelector("#drawerClearBtn");
  if (drawerClearBtn) {
    drawerClearBtn.addEventListener("click", () => {
      clearFilters();
    });
  }

  const drawerApplyBtn = document.querySelector("#drawerApplyBtn");
  if (drawerApplyBtn) {
    drawerApplyBtn.addEventListener("click", () => {
      const filtersPanel = els.filtersPanel || document.querySelector("#filtersPanel");
      if (filtersPanel) filtersPanel.hidden = true;
      if (els.toggleFiltersBtn) els.toggleFiltersBtn.textContent = "Mostrar filtros";
      els.results.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}

function toggleOledTheme() {
  const isCurrentlyOled = document.documentElement.getAttribute("data-theme") === "oled";
  const nextTheme = isCurrentlyOled ? "dark" : "oled";

  if (window.aplicarTema) {
    window.aplicarTema(nextTheme);
  } else {
    document.documentElement.setAttribute("data-theme", nextTheme);
  }
  if (window.guardarPreferencia) {
    window.guardarPreferencia("pref_tema", nextTheme);
  }

  const temaSegmented = document.querySelector("#temaSegmented");
  if (temaSegmented) {
    temaSegmented.querySelectorAll(".segmented-opt").forEach((btn) => {
      const active = btn.dataset.valor === nextTheme;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-checked", String(active));
    });
  }

  const pillOled = document.querySelector("#pillOled");
  if (pillOled) {
    pillOled.classList.toggle("is-active", nextTheme === "oled");
  }

  showToast(
    nextTheme === "oled"
      ? "🌙 <strong>Modo Cine (OLED) Activado:</strong> Negro absoluto para usar en la sala de cine sin deslumbrar."
      : "☀️ Modo Cine desactivado.",
    null,
    null,
    3500
  );
}

function initOledThemeToggle() {
  const pillOled = document.querySelector("#pillOled");
  const currentTheme = localStorage.getItem("pref_tema");
  if (pillOled) {
    pillOled.classList.toggle("is-active", currentTheme === "oled");
  }
}

wireEvents();
loadData();

