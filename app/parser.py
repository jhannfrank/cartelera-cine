import re
from datetime import datetime, timezone, timedelta
from app.models import Pelicula, Sede, Funcion


def _extraer_hora(showtime):
    if not showtime:
        return ""
    # Formato esperado: 2026-02-11T19:50:00-05:00
    if "T" in showtime:
        return showtime.split("T", 1)[1][:5]
    return showtime


def _clasificar_disponibilidad(disponibilidad):
    capacidad = disponibilidad.get("capacidad") or 0
    disponibles = disponibilidad.get("asientos_disponibles") or 0
    if capacidad <= 0:
        return ""
    ratio = disponibles / capacidad
    if ratio <= 0.15:
        return "LOW"
    if ratio <= 0.5:
        return "MEDIUM"
    return "HIGH"


def _detectar_nominaciones(titulo: str):
    if not titulo:
        return None
    t = titulo.lower().replace("’", "'").replace("´", "'")
    awards = {
        "avengers": "🏆 Nominada al Óscar (Efectos Visuales) • 3 Premios Critics' Choice • 6 Premios Saturn",
        "juegos del hambre": "🏆 Nominada al Globo de Oro (Canción Original) • Ganadora Premio BAFTA • 4 MTV Movie Awards",
        "duna": "🏆 Franquicia ganadora de 6 Premios Óscar y 10 nominaciones de la Academia (Denis Villeneuve)",
        "queen": "🏆 Concierto legendario nominado y premiado en Festivales Internacionales de Música y Cine",
        "spider": "🏆 Franquicia Spider-Man nominada al Óscar (Efectos Visuales) y ganadora del Óscar de Animación",
        "oasis": "🏆 Documental / Concierto oficial de la icónica banda • Múltiples premios Brit y NME Awards",
        "tadeo": "🏆 Saga de animación ganadora de 3 Premios Goya a la Mejor Película de Animación",
        "coyote": "🏆 Producción nominada y aclamada en festivales de animación de la industria",
        "one piece": "🏆 Saga condecorada en los prestigiosos Tokyo Anime Awards",
        "hechizo de amor": "🏆 Franquicia Practical Magic nominada a los Blockbuster Entertainment Awards",
        "lalisa": "🏆 Documental musical nominado en Festivales de Cultura Pop & K-Pop Awards",
    }
    for key, aw in awards.items():
        if key in t:
            return aw
    return None


def parsear_pelicula_cineplanet(movie, cinemas_index, sessions_index, availability_index=None):
    availability_index = availability_index or {}
    slug = (movie.get("movieDetailsUrl") or "").strip("/")
    url = f"https://www.cineplanet.com.pe/peliculas/{slug}" if slug else ""
    titulo = (movie.get("title") or "Titulo no encontrado").strip()

    sedes = []
    ciudades = set()

    for cine_movie in movie.get("cinemas", []):
        cinema_id = str(cine_movie.get("cinemaId", ""))
        cinema_info = cinemas_index.get(cinema_id, {})

        nombre_cine = (
            cinema_info.get("name")
            or cinema_info.get("formattedCinemaName")
            or f"Cine {cinema_id}"
        )
        ciudad = (cinema_info.get("city") or "Ciudad no especificada").strip()
        ciudades.add(ciudad)

        dias = []
        funciones = []
        funciones_vistas = set()
        for fecha in cine_movie.get("dates", []):
            raw_date = (fecha.get("date") or "").strip()
            solo_fecha = raw_date.split("T")[0] if raw_date else ""
            if solo_fecha and solo_fecha not in dias:
                dias.append(solo_fecha)

            for session_ref in fecha.get("sessions", []):
                session_id = str(session_ref).strip()
                if not session_id:
                    continue

                session_info = sessions_index.get(session_id, {})
                hora = _extraer_hora((session_info.get("showtime") or "").strip())
                formatos = session_info.get("formats", [])
                formato = ", ".join(formatos) if formatos else "N/D"
                idiomas_sesion = session_info.get("languages", [])
                idioma = ", ".join(idiomas_sesion) if idiomas_sesion else ""

                if not hora:
                    continue

                key = (solo_fecha, hora, formato, idioma)
                if key in funciones_vistas:
                    continue

                funciones_vistas.add(key)
                funcion = {"dia": solo_fecha, "hora": hora, "formato": formato, "idioma": idioma}
                disponibilidad = availability_index.get(session_id)
                if disponibilidad:
                    funcion["disponibilidad"] = {
                        "asientos_disponibles": disponibilidad.get("asientos_disponibles", 0),
                        "capacidad": disponibilidad.get("capacidad", 0),
                        "estado": _clasificar_disponibilidad(disponibilidad),
                    }
                funciones.append(funcion)

        sedes.append(
            Sede(
                nombre=nombre_cine,
                ciudad=ciudad,
                dias=dias,
                funciones=funciones,
            )
        )

    poster = movie.get("posterUrl")
    if not poster and isinstance(movie.get("thumbnailUrl"), list) and movie.get("thumbnailUrl"):
        poster = movie.get("thumbnailUrl")[-1]

    pelicula = Pelicula(
        cadena="Cineplanet",
        titulo=titulo,
        url=url,
        genero=(movie.get("genre") or "").strip(),
        idiomas=movie.get("languages", []),
        formatos=movie.get("formats", []),
        ciudades=sorted(ciudades),
        sedes=sedes,
        poster_url=poster,
        duracion=movie.get("runTime"),
        censura=(movie.get("ratingDescription") or ("R" if movie.get("restricted") else "APT")).strip(),
        sinopsis=(movie.get("synopsis") or "").strip() or None,
        nominaciones=_detectar_nominaciones(titulo),
    )

    return pelicula


def parsear_pelicula_cinemark(movie, theaters_index, showtimes):
    corporate_id = str(movie.get("corporateId", "")).strip()
    slug = (movie.get("slug") or "").strip("/")
    url = f"https://www.cinemark-peru.com/pelicula/{slug}" if slug else ""
    titulo = (movie.get("title") or "Titulo no encontrado").strip()

    idiomas = [
        (lang.get("name") or "").strip()
        for lang in movie.get("languages", [])
        if (lang.get("name") or "").strip()
    ]
    formatos = [
        (fmt.get("name") or fmt.get("shortName") or "").strip()
        for fmt in movie.get("formats", [])
        if (fmt.get("name") or fmt.get("shortName") or "").strip()
    ]
    generos = [
        (genre.get("name") or "").strip()
        for genre in movie.get("genres", [])
        if (genre.get("name") or "").strip()
    ]

    sedes_map = {}
    ciudades = set()

    for session in showtimes:
        if str(session.get("corporateId", "")).strip() != corporate_id:
            continue

        theater_id = str(session.get("theaterId", "")).strip()
        theater = theaters_index.get(theater_id, {})

        nombre_sede = (theater.get("name") or f"Cinemark {theater_id}").strip()
        ciudad = (theater.get("city") or "Ciudad no especificada").strip()
        ciudades.add(ciudad)

        if theater_id not in sedes_map:
            sedes_map[theater_id] = {
                "nombre": nombre_sede,
                "ciudad": ciudad,
                "dias": [],
                "funciones": [],
                "_fn_keys": set(),
            }

        fecha = (session.get("sessionDisplayDate") or "").strip()
        if fecha and fecha not in sedes_map[theater_id]["dias"]:
            sedes_map[theater_id]["dias"].append(fecha)

        hora = _extraer_hora((session.get("sessionDateTime") or "").strip())
        formato = (session.get("sessionFormat") or "N/D").strip() or "N/D"
        idioma_info = session.get("language") or {}
        idioma = (idioma_info.get("name") or idioma_info.get("shortName") or "").strip()
        key = (fecha, hora, formato, idioma)
        if hora and key not in sedes_map[theater_id]["_fn_keys"]:
            sedes_map[theater_id]["_fn_keys"].add(key)
            funcion = {"dia": fecha, "hora": hora, "formato": formato, "idioma": idioma}
            occupation = session.get("occupation") or {}
            if occupation:
                funcion["disponibilidad"] = {
                    "asientos_disponibles": occupation.get("availableSeats", 0),
                    "capacidad": occupation.get("capacity", 0),
                    "estado": occupation.get("status", ""),
                }
            sedes_map[theater_id]["funciones"].append(funcion)

    sedes = []
    for raw_sede in sedes_map.values():
        sedes.append(
            Sede(
                nombre=raw_sede["nombre"],
                ciudad=raw_sede["ciudad"],
                dias=raw_sede["dias"],
                funciones=raw_sede["funciones"],
            )
        )

    return Pelicula(
        cadena="Cinemark",
        titulo=titulo,
        url=url,
        genero=", ".join(generos),
        idiomas=idiomas,
        formatos=formatos,
        ciudades=sorted(ciudades),
        sedes=sedes,
        poster_url=movie.get("posterUrl"),
        duracion=movie.get("runTime"),
        censura=(movie.get("rating") or "APT").strip(),
        sinopsis=(movie.get("synopsis") or "").strip() or None,
        nominaciones=_detectar_nominaciones(titulo),
    )


# Mantiene compatibilidad con el flujo anterior.
def parsear_pelicula(movie, cinemas_index, sessions_index):
    return parsear_pelicula_cineplanet(movie, cinemas_index, sessions_index)


def _normalizar_fecha_cinepolis(d_obj: dict) -> str:
    """Convierte el FilterDate o ShowtimeDate de Cinépolis a formato ISO YYYY-MM-DD."""
    filter_date = d_obj.get("FilterDate") or ""
    m = re.search(r"/Date\((\d+)\)/", filter_date)
    if m:
        ms = int(m.group(1))
        # Epoch ms a fecha local en Perú (UTC-5)
        dt = datetime.fromtimestamp(ms / 1000, timezone.utc) - timedelta(hours=5)
        return dt.strftime("%Y-%m-%d")

    showtime_date = (d_obj.get("ShowtimeDate") or "").strip().lower()
    meses = {
        "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
        "julio": 7, "agosto": 8, "setiembre": 9, "septiembre": 9, "octubre": 10,
        "noviembre": 11, "diciembre": 12
    }
    parts = showtime_date.split()
    if len(parts) >= 2 and parts[0].isdigit():
        dia = int(parts[0])
        mes_str = parts[1]
        if mes_str in meses:
            mes = meses[mes_str]
            hoy = datetime.now()
            anio = hoy.year if mes >= hoy.month else hoy.year + 1
            return f"{anio:04d}-{mes:02d}-{dia:02d}"

    return showtime_date


def parsear_peliculas_cinepolis(cinemas_data):
    """
    Parsea la estructura jerárquica de Cinépolis (Cinemas -> Dates -> Movies -> Formats -> Showtimes)
    y la consolida en una lista de modelos Pelicula agrupados por título.
    """
    peliculas_map = {}

    for cinema in cinemas_data:
        cinema_name = (cinema.get("Name") or "").strip()
        cinema_city = "Lima"
        dates = cinema.get("Dates", [])

        for d in dates:
            fecha_iso = _normalizar_fecha_cinepolis(d)
            if not fecha_iso:
                continue
            for m in d.get("Movies", []):
                titulo_raw = (m.get("Title") or "").strip()
                if not titulo_raw:
                    continue

                censura = (m.get("Rating") or "APT").strip()
                synopsis = (m.get("Synopsis") or "").strip() or None

                if titulo_raw not in peliculas_map:
                    peliculas_map[titulo_raw] = {
                        "cadena": "Cinépolis",
                        "titulo": titulo_raw,
                        "url": "https://cinepolis.com.pe/cartelera/lima-peru",
                        "genero": "General",
                        "poster_url": m.get("Poster") or None,
                        "duracion": None,
                        "censura": censura,
                        "sinopsis": synopsis,
                        "nominaciones": _detectar_nominaciones(titulo_raw),
                        "ciudades": {cinema_city},
                        "formatos": set(),
                        "idiomas": set(),
                        "sedes_map": {},
                    }

                p_entry = peliculas_map[titulo_raw]
                if cinema_name not in p_entry["sedes_map"]:
                    p_entry["sedes_map"][cinema_name] = {
                        "nombre": cinema_name,
                        "ciudad": cinema_city,
                        "dias": [],
                        "funciones": [],
                        "_fn_keys": set(),
                    }

                sede_entry = p_entry["sedes_map"][cinema_name]
                if fecha_iso and fecha_iso not in sede_entry["dias"]:
                    sede_entry["dias"].append(fecha_iso)

                for fmt in m.get("Formats", []):
                    fmt_name = (fmt.get("Name") or "2D").strip()
                    lang = (fmt.get("Language") or "DOBLADA").strip()
                    p_entry["formatos"].add(fmt_name)
                    p_entry["idiomas"].add(lang)

                    for st in fmt.get("Showtimes", []):
                        hora = (st.get("Time") or "").strip()
                        if not hora:
                            continue

                        fn_key = (fecha_iso, hora, fmt_name, lang)
                        if fn_key in sede_entry["_fn_keys"]:
                            continue
                        sede_entry["_fn_keys"].add(fn_key)

                        sede_entry["funciones"].append({
                            "dia": fecha_iso,
                            "hora": hora,
                            "formato": fmt_name,
                            "idioma": lang,
                            "precio": None,
                            "disponibilidad": None,
                        })

    lista_peliculas = []
    for p in peliculas_map.values():
        sedes = []
        for s in p["sedes_map"].values():
            if s["funciones"]:
                sedes.append(
                    Sede(
                        nombre=s["nombre"],
                        ciudad=s["ciudad"],
                        dias=sorted(s["dias"]),
                        funciones=s["funciones"],
                    )
                )

        if sedes:
            lista_peliculas.append(
                Pelicula(
                    cadena="Cinépolis",
                    titulo=p["titulo"],
                    url=p["url"],
                    genero=p["genero"],
                    idiomas=sorted(p["idiomas"]),
                    formatos=sorted(p["formatos"]),
                    ciudades=sorted(p["ciudades"]),
                    sedes=sedes,
                    poster_url=p["poster_url"],
                    duracion=p["duracion"],
                    censura=p["censura"],
                    sinopsis=p["sinopsis"],
                    nominaciones=p["nominaciones"],
                )
            )

    return lista_peliculas


def parsear_peliculas_tumisoft(cines_con_presentaciones, cines_por_id_o_cadena=None, cadena_nombre=None, base_url=""):
    """
    Parsea las presentaciones de SvelteKit / TumiSoft (Cine Star y Movie Time)
    asignando las funciones EXCLUSIVAMENTE a la sede a la que pertenecen,
    eliminando superposiciones de funciones o conflictos de horarios en salas.
    """
    import re

    # Manejar compatibilidad de argumentos si viene como (cines_data, cines_map, cadena_nombre, base_url)
    if isinstance(cines_por_id_o_cadena, str) and cadena_nombre is None:
        cadena_nombre = cines_por_id_o_cadena
    elif cadena_nombre is None:
        cadena_nombre = "Cine Star"

    items_a_procesar = []
    # Si viene en el nuevo formato: lista de {"cine": ..., "presentations": [...]}
    if isinstance(cines_con_presentaciones, list) and cines_con_presentaciones:
        if isinstance(cines_con_presentaciones[0], dict) and "cine" in cines_con_presentaciones[0]:
            for entry in cines_con_presentaciones:
                cine_info = entry["cine"]
                for pres in entry.get("presentations", []):
                    items_a_procesar.append((pres, cine_info))
        else:
            # Fallback si viniera lista simple de presentaciones y cines_por_id_o_cadena es un dict
            cines_map = cines_por_id_o_cadena if isinstance(cines_por_id_o_cadena, dict) else {}
            for pres in cines_con_presentaciones:
                for cine_info in cines_map.values():
                    items_a_procesar.append((pres, cine_info))

    peliculas_map = {}

    for pres, cine_info in items_a_procesar:
        titulo_raw = (pres.get("name") or "").strip()
        if not titulo_raw:
            continue

        # Limpiar sufijos entre paréntesis: (DOB), (SUB), (2D), (3D), (R), (BONUS)
        titulo = re.sub(r"\s*\((?:dob|sub|doblada|subtitulada|2d|3d|esp|cast|r|bonus)\)\s*$", "", titulo_raw, flags=re.I).strip()
        titulo = re.sub(r"\s*\[.*?\]", "", titulo).strip()
        if not base_url:
            base_url = "https://www.movietime.com.pe" if "movie" in (cadena_nombre or "").lower() else "https://www.cinestar.com.pe"

        slug = pres.get("slug") or ""
        url = f"{base_url}/peliculas/{slug}" if slug else base_url

        poster_url = pres.get("urlImage")
        if poster_url:
            if not poster_url.startswith("http"):
                poster_url = f"{base_url}/{poster_url.lstrip('/')}"
            elif "bucket.tumi-soft.com" in poster_url:
                poster_url = poster_url.replace("https://bucket.tumi-soft.com", base_url).replace("http://bucket.tumi-soft.com", base_url)

        duracion_raw = pres.get("duration")
        duracion = None
        if duracion_raw:
            try:
                duracion = int(duracion_raw)
            except (ValueError, TypeError):
                duracion = None

        sinopsis = (pres.get("sypnosis") or "").strip() or None
        is_3d = bool(pres.get("is3d"))
        formato_base = "3D" if is_3d else "2D"

        # Detectar idioma por el nombre de la presentación
        idioma = "Doblada"
        if "sub" in titulo_raw.lower():
            idioma = "Subtitulada"

        showtimes = pres.get("showTimes", [])
        if not showtimes:
            continue

        key = titulo.lower().strip()
        if key not in peliculas_map:
            peliculas_map[key] = {
                "titulo": titulo,
                "url": url,
                "poster_url": poster_url,
                "duracion": duracion,
                "sinopsis": sinopsis,
                "idiomas": set(),
                "formatos": set(),
                "ciudades": set(),
                "sedes_map": {},
            }

        pelicula_data = peliculas_map[key]
        if not pelicula_data["poster_url"] and poster_url:
            pelicula_data["poster_url"] = poster_url
        if not pelicula_data["sinopsis"] and sinopsis:
            pelicula_data["sinopsis"] = sinopsis
        if not pelicula_data["duracion"] and duracion:
            pelicula_data["duracion"] = duracion

        pelicula_data["formatos"].add(formato_base)
        pelicula_data["idiomas"].add(idioma)

        cine_nombre = cine_info["nombre"]
        cine_ciudad = cine_info["ciudad"]
        pelicula_data["ciudades"].add(cine_ciudad)

        if cine_nombre not in pelicula_data["sedes_map"]:
            pelicula_data["sedes_map"][cine_nombre] = {
                "nombre": cine_nombre,
                "ciudad": cine_ciudad,
                "dias": [],
                "funciones": [],
                "_fn_keys": set(),
            }

        sede_entry = pelicula_data["sedes_map"][cine_nombre]

        for st in showtimes:
            fecha = (st.get("date") or "").strip()
            hora_raw = (st.get("time") or "").strip()
            hora = hora_raw[:5] if len(hora_raw) >= 5 else hora_raw
            if not hora or not fecha:
                continue

            if fecha not in sede_entry["dias"]:
                sede_entry["dias"].append(fecha)

            layout_code = str(st.get("layoutCode") or "").strip()
            sala = f"Sala {layout_code}" if layout_code else None

            fn_key = (fecha, hora, formato_base, idioma, sala)
            if fn_key not in sede_entry["_fn_keys"]:
                sede_entry["_fn_keys"].add(fn_key)
                sede_entry["funciones"].append({
                    "dia": fecha,
                    "hora": hora,
                    "formato": formato_base,
                    "idioma": idioma,
                    "sala": sala,
                    "precio": None,
                    "disponibilidad": None,
                })

    lista_peliculas = []
    for p_data in peliculas_map.values():
        sedes = []
        for s in p_data["sedes_map"].values():
            if s["funciones"]:
                s["funciones"].sort(key=lambda fn: (fn["dia"], fn["hora"]))
                sedes.append(
                    Sede(
                        nombre=s["nombre"],
                        ciudad=s["ciudad"],
                        dias=sorted(s["dias"]),
                        funciones=s["funciones"],
                    )
                )

        if sedes:
            lista_peliculas.append(
                Pelicula(
                    cadena=cadena_nombre,
                    titulo=p_data["titulo"],
                    url=p_data["url"],
                    genero="General",
                    idiomas=sorted(p_data["idiomas"]),
                    formatos=sorted(p_data["formatos"]),
                    ciudades=sorted(p_data["ciudades"]),
                    sedes=sedes,
                    poster_url=p_data["poster_url"],
                    duracion=p_data["duracion"],
                    censura="+14",
                    sinopsis=p_data["sinopsis"],
                    nominaciones=_detectar_nominaciones(p_data["titulo"]),
                )
            )

    return lista_peliculas


def _normalizar_hora_uvk(hora_str: str) -> str:
    """Convierte horas como 3:00PM a formato de 24 horas 15:00."""
    h = hora_str.strip().upper()
    m_12 = re.match(r"^(\d{1,2}):(\d{2})\s*(AM|PM)?$", h)
    if m_12:
        hr, mn, meridiem = m_12.groups()
        hr_int = int(hr)
        if meridiem == "PM" and hr_int < 12:
            hr_int += 12
        elif meridiem == "AM" and hr_int == 12:
            hr_int = 0
        return f"{hr_int:02d}:{mn}"
    return hora_str


def _match_uvk_cine(name_raw: str, default_cine: dict) -> tuple:
    """Mapea el nombre de la sede en el HTML al nombre canónico y ciudad."""
    n = name_raw.strip().lower()
    for key, cinfo in [
        ("panorama", {"nombre": "UVK Platino Panorama", "ciudad": "Lima"}),
        ("san martin", {"nombre": "UVK San Martín", "ciudad": "Lima"}),
        ("san martín", {"nombre": "UVK San Martín", "ciudad": "Lima"}),
        ("ilo", {"nombre": "UVK Ilo", "ciudad": "Ilo"}),
        ("tumbes", {"nombre": "UVK Tumbes", "ciudad": "Tumbes"}),
        ("el agustino", {"nombre": "UVK El Agustino", "ciudad": "Lima"}),
        ("agustino", {"nombre": "UVK El Agustino", "ciudad": "Lima"}),
    ]:
        if key in n:
            return cinfo["nombre"], cinfo["ciudad"]
    return default_cine.get("nombre", name_raw.title()), default_cine.get("ciudad", "Lima")


def parsear_peliculas_uvk(resultados_uvk, ciudad_filtro=None, sedes_filtro=None):
    """
    Parsea las respuestas HTML de funciones de UVK Multicines con soporte multi-fecha (pestañas),
    salas y formato de hora de 24 horas. Permite filtrar por ciudad y/o sedes.
    """
    peliculas_map = {}
    ahora_peru = datetime.now(timezone.utc) - timedelta(hours=5)
    hoy_iso = ahora_peru.strftime("%Y-%m-%d")
    current_year = ahora_peru.year

    for res in resultados_uvk:
        cine_def = res.get("cine") or {"nombre": "UVK", "ciudad": "Lima", "id": 1}
        movie_title = res.get("movie_title", "").strip()
        html = res.get("html_funciones", "")
        if not html:
            continue

        # Extraer metadatos de la película si están presentes en la página
        title_h3 = re.search(r'<h3[^>]*class=["\'][^"\']*featured-title[^"\']*["\'][^>]*>([^<]+)</h3>', html)
        titulo_limpio = title_h3.group(1).strip() if title_h3 else movie_title
        sinopsis_m = re.search(r'Sinopsis\s*</h5>\s*<p[^>]*>([^<]+)</p>', html, re.S | re.I)
        sinopsis = sinopsis_m.group(1).strip() if sinopsis_m else None
        poster_m = re.search(r'https?://uvk\.pe/images/movie/[^"\'\s>]+', html)
        poster_url = poster_m.group(0).strip() if poster_m else None

        # 1. Extraer fechas de las pestañas <ul class="tab-menu">
        tab_menu_items = re.findall(r'<li[^>]*>\s*([A-Za-zÁ-Úá-ú]+)\s*<br>\s*(\d{1,2})/(\d{1,2})\s*</li>', html)
        fechas_iso = []
        for _, d_str, m_str in tab_menu_items:
            d = int(d_str)
            m = int(m_str)
            y = current_year if m >= ahora_peru.month else current_year + 1
            fechas_iso.append(f"{y:04d}-{m:02d}-{d:02d}")

        if not fechas_iso:
            fechas_iso = [hoy_iso]

        # 2. Dividir el contenido por paneles de pestañas <div class="tab-item ...">
        tab_sections = re.split(r'<div[^>]*class=[\'"]tab-item[^\'"]*[\'"][^>]*>', html)[1:]
        if not tab_sections:
            tab_sections = [html]

        movie_id = res.get("movie_id", "")
        url_pelicula = f"https://uvk.pe/peliculas/{movie_id}" if movie_id else f"https://uvk.pe/cine/{cine_def.get('id', 1)}"

        if titulo_limpio not in peliculas_map:
            peliculas_map[titulo_limpio] = {
                "cadena": "UVK",
                "titulo": titulo_limpio,
                "url": url_pelicula,
                "genero": "General",
                "poster_url": poster_url,
                "duracion": None,
                "censura": "APT",
                "sinopsis": sinopsis,
                "nominaciones": _detectar_nominaciones(titulo_limpio),
                "ciudades": set(),
                "formatos": {"2D"},
                "idiomas": set(),
                "sedes_map": {},
            }

        p_entry = peliculas_map[titulo_limpio]
        if not p_entry.get("sinopsis") and sinopsis:
            p_entry["sinopsis"] = sinopsis
        if not p_entry.get("poster_url") and poster_url:
            p_entry["poster_url"] = poster_url

        for idx, sec in enumerate(tab_sections):
            fecha_actual = fechas_iso[idx] if idx < len(fechas_iso) else fechas_iso[-1]
            cinema_blocks = re.split(r'<div[^>]*class=[\'"]cinema-shows[\'"][^>]*>', sec)[1:]
            if not cinema_blocks:
                cinema_blocks = [sec]

            for cb in cinema_blocks:
                cname_m = re.search(r'<h5[^>]*>([^<]+)</h5>', cb)
                cine_nombre_raw = cname_m.group(1).strip() if cname_m else cine_def["nombre"]
                c_nom, c_ciu = _match_uvk_cine(cine_nombre_raw, cine_def)
                p_entry["ciudades"].add(c_ciu)

                if c_nom not in p_entry["sedes_map"]:
                    p_entry["sedes_map"][c_nom] = {
                        "nombre": c_nom,
                        "ciudad": c_ciu,
                        "dias": [],
                        "funciones": [],
                        "_fn_keys": set(),
                    }

                sede_entry = p_entry["sedes_map"][c_nom]
                if fecha_actual not in sede_entry["dias"]:
                    sede_entry["dias"].append(fecha_actual)

                show_blocks = re.findall(
                    r'<div class="show-types">\s*<h6 class="show-features">\s*([^<]+)\s*</h6>\s*<div class="show-list">(.*?)</div>\s*</div>',
                    cb,
                    re.S | re.I,
                )

                for lang_raw, list_content in show_blocks:
                    idioma = lang_raw.strip()
                    p_entry["idiomas"].add(idioma)

                    # Extraer salas y horarios respetando la sala de cada bloque
                    parts = re.split(r'(Sala\s*\d+)', list_content, flags=re.I)
                    current_sala = "Sala 1"
                    for part in parts:
                        p_str = part.strip()
                        if re.match(r'^Sala\s*\d+$', p_str, re.I):
                            current_sala = p_str
                        else:
                            times = re.findall(r'<div class="button-wrapper">\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*</div>', part, re.I)
                            if not times:
                                times = re.findall(r'\b(\d{1,2}:\d{2}\s*(?:AM|PM)?)\b', part, re.I)
                            for t in times:
                                hora_24 = _normalizar_hora_uvk(t)
                                fn_key = (fecha_actual, hora_24, "2D", idioma, current_sala)
                                if fn_key in sede_entry["_fn_keys"]:
                                    continue
                                sede_entry["_fn_keys"].add(fn_key)
                                sede_entry["funciones"].append(
                                    Funcion(
                                        dia=fecha_actual,
                                        hora=hora_24,
                                        formato="2D",
                                        idioma=idioma,
                                        sala=current_sala,
                                        precio=None,
                                        disponibilidad=None,
                                    )
                                )

    lista_peliculas = []
    for p in peliculas_map.values():
        sedes = []
        for s in p["sedes_map"].values():
            if ciudad_filtro:
                c_norm = ciudad_filtro.strip().lower()
                s_ciu = s["ciudad"].strip().lower()
                if s_ciu != c_norm and not (c_norm == "lima" and s_ciu == "callao"):
                    continue
            if sedes_filtro:
                sedes_norm = {x.strip().lower() for x in sedes_filtro}
                if s["nombre"].strip().lower() not in sedes_norm:
                    continue

            if s["funciones"]:
                sedes.append(
                    Sede(
                        nombre=s["nombre"],
                        ciudad=s["ciudad"],
                        dias=sorted(s["dias"]),
                        funciones=s["funciones"],
                    )
                )

        if sedes:
            lista_peliculas.append(
                Pelicula(
                    cadena="UVK",
                    titulo=p["titulo"],
                    url=p["url"],
                    genero=p["genero"],
                    idiomas=sorted(p["idiomas"]),
                    formatos=sorted(p["formatos"]),
                    ciudades=sorted(list(set(s.ciudad for s in sedes))),
                    sedes=sedes,
                    poster_url=p["poster_url"],
                    duracion=p["duracion"],
                    censura=p["censura"],
                    sinopsis=p["sinopsis"],
                    nominaciones=p["nominaciones"],
                )
            )

    return lista_peliculas
