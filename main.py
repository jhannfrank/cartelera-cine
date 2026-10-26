import argparse
import time
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

from app.scraper import (
    CineplanetScraper,
    CinemarkScraper,
    CinepolisScraper,
    CineStarScraper,
    MovieTimeScraper,
    UVKScraper,
)
from app.parser import (
    parsear_pelicula_cineplanet,
    parsear_pelicula_cinemark,
    parsear_peliculas_cinepolis,
    parsear_peliculas_tumisoft,
    parsear_peliculas_uvk,
)
from app.storage import guardar_json
from app.cobertura import analizar_presencia_territorial
from app.progreso import (
    inicializar_monitoreo_cadenas,
    registrar_progreso_cadena,
    finalizar_monitoreo_cadenas,
    ahora_iso,
)


def parsear_argumentos():
    parser = argparse.ArgumentParser(description="Scraper multacadena (Cineplanet, Cinemark, Cinépolis, Cine Star, Movie Time, UVK)")
    parser.add_argument(
        "--provincia", "-p", default=None,
        help="Filtra solo cines de esta ciudad/provincia (ej. Lima, Arequipa). Por defecto trae todo el pais.",
    )
    parser.add_argument(
        "--sin-disponibilidad", action="store_true",
        help="Omite la consulta de disponibilidad de asientos de Cineplanet (la parte lenta).",
    )
    parser.add_argument(
        "--dias-disponibilidad", type=int, default=None,
        help="Limita el alcance a los proximos N dias para optimizar solicitudes.",
    )
    parser.add_argument(
        "--sede", action="append", default=None,
        help="Filtra solo esta sede/cine especifico por nombre exacto. Se puede repetir.",
    )
    return parser.parse_args()


def main():
    """
    Punto de entrada principal del scraper multacadena.
    Ejecuta el flujo de extracción en paralelo para las 6 cadenas:
    Cineplanet, Cinemark, Cinépolis, Cine Star, Movie Time y UVK.
    """
    args = parsear_argumentos()
    ciudad = args.provincia or None
    sedes = args.sede or None
    incluir_disponibilidad = not args.sin_disponibilidad
    dias_disponibilidad = args.dias_disponibilidad

    inicio = ahora_iso()
    peliculas = []

    alcance_partes = [p for p in [ciudad, ", ".join(sedes) if sedes else None] if p]
    etiqueta_alcance = f" ({' / '.join(alcance_partes)})" if alcance_partes else ""
    
    cobertura = analizar_presencia_territorial(ciudad=ciudad, sedes_filtro=sedes)
    cadenas_activas = cobertura.get("cadenas_activas", set())
    cadenas_omitidas = cobertura.get("cadenas_omitidas", set())

    nombres_cadenas = ["Cinépolis", "Cinemark", "Cine Star", "Movie Time", "UVK", "Cineplanet"]
    inicializar_monitoreo_cadenas(
        nombres_cadenas,
        iniciado_iso=inicio,
        etapa=f"Iniciando escaneo multacadena{etiqueta_alcance}",
    )

    estado_cadenas = {}

    # Marcar de inmediato las cadenas que no tienen presencia física en la zona solicitada
    for omitida in cadenas_omitidas:
        motivo = cobertura.get("detalle_omision", {}).get(omitida, f"Sin presencia territorial en {ciudad or 'esta selección'}")
        registrar_progreso_cadena(
            omitida,
            "Sin presencia en esta provincia",
            completados=1,
            total=1,
            detalle=motivo,
            tiempo_s=0.0,
            activo=False,
            ok=True,
            sin_presencia=True,
            peliculas=0,
        )
        estado_cadenas[omitida] = {
            "ok": True,
            "sin_presencia": True,
            "motivo": motivo,
            "peliculas": 0,
        }

    def tarea_cineplanet():
        t0 = time.perf_counter()
        registrar_progreso_cadena("Cineplanet", "Iniciando conexión...", completados=0, total=3, detalle="Preparando sesión", activo=True, tiempo_s=0.0)

        def cb_cp(*args, **kwargs):
            elapsed = time.perf_counter() - t0
            if len(args) >= 4:
                etapa_tipo, completados, total, detalle = args[:4]
            elif len(args) == 3:
                etapa_tipo, completados, total = args
                detalle = ""
            elif len(args) == 2:
                etapa_tipo = "seats"
                completados, total = args
                detalle = f"{completados}/{total}"
            else:
                return

            if etapa_tipo == "cache":
                registrar_progreso_cadena("Cineplanet", "Descargando cachés base", completados=completados, total=total, detalle=detalle, tiempo_s=elapsed)
            else:
                registrar_progreso_cadena("Cineplanet", "Consultando aforos de funciones", completados=completados, total=total, detalle=detalle, tiempo_s=elapsed)

        try:
            cineplanet_scraper = CineplanetScraper()
            cp_movies, cp_cinemas_index, cp_sessions_index, cp_availability_index = (
                cineplanet_scraper.obtener_cartelera_data(
                    progreso_callback=cb_cp,
                    ciudad=ciudad,
                    sedes=sedes,
                    incluir_disponibilidad=incluir_disponibilidad,
                    dias_disponibilidad=dias_disponibilidad,
                )
            )
            items = []
            for movie in cp_movies:
                pelicula = parsear_pelicula_cineplanet(
                    movie, cp_cinemas_index, cp_sessions_index, cp_availability_index
                )
                items.append(pelicula.model_dump())
            cineplanet_scraper.cerrar()
            elapsed = time.perf_counter() - t0
            registrar_progreso_cadena(
                "Cineplanet",
                "Completado",
                completados=1,
                total=1,
                detalle=f"{len(items)} películas listas",
                tiempo_s=elapsed,
                activo=False,
                ok=True,
                peliculas=len(items),
            )
            return items
        except Exception as e:
            elapsed = time.perf_counter() - t0
            print(f"Aviso Cineplanet: {e}")
            registrar_progreso_cadena("Cineplanet", "Error de extracción", completados=0, total=1, detalle=str(e), tiempo_s=elapsed, activo=False, ok=False, error=str(e))
            return []

    def tarea_cinemark():
        t0 = time.perf_counter()
        registrar_progreso_cadena("Cinemark", "Iniciando conexión BFF...", completados=0, total=1, detalle="Consultando cartelera", activo=True, tiempo_s=0.0)

        def cb_cm(*args, **kwargs):
            elapsed = time.perf_counter() - t0
            if len(args) >= 3:
                etapa_tipo, completados, total = args[:3]
            elif len(args) == 2:
                etapa_tipo = "theaters"
                completados, total = args
            else:
                return

            if etapa_tipo == "theaters":
                registrar_progreso_cadena("Cinemark", "Consultando horarios por sede", completados=completados, total=total, detalle=f"{completados}/{total} sedes", tiempo_s=elapsed)
            else:
                registrar_progreso_cadena("Cinemark", "Enriqueciendo catálogo de películas", completados=completados, total=total, detalle=f"{completados}/{total} películas", tiempo_s=elapsed)

        try:
            cinemark_scraper = CinemarkScraper()
            cm_movies, cm_theaters_index, cm_showtimes_by_theater = cinemark_scraper.obtener_cartelera_data(
                progreso_callback=cb_cm,
                ciudad=ciudad,
                sedes=sedes,
                dias_maximos=dias_disponibilidad,
            )
            showtimes_by_movie = {}
            for theater_sessions in cm_showtimes_by_theater.values():
                for session in theater_sessions:
                    corporate_id = str(session.get("corporateId", "")).strip()
                    if not corporate_id:
                        continue
                    showtimes_by_movie.setdefault(corporate_id, []).append(session)

            items = []
            for movie in cm_movies:
                corporate_id = str(movie.get("corporateId", "")).strip()
                showtimes = showtimes_by_movie.get(corporate_id, [])
                pelicula = parsear_pelicula_cinemark(movie, cm_theaters_index, showtimes)
                items.append(pelicula.model_dump())
            elapsed = time.perf_counter() - t0
            registrar_progreso_cadena(
                "Cinemark",
                "Completado",
                completados=1,
                total=1,
                detalle=f"{len(items)} películas listas",
                tiempo_s=elapsed,
                activo=False,
                ok=True,
                peliculas=len(items),
            )
            return items
        except Exception as e:
            elapsed = time.perf_counter() - t0
            print(f"Aviso Cinemark: {e}")
            registrar_progreso_cadena("Cinemark", "Error de extracción", completados=0, total=1, detalle=str(e), tiempo_s=elapsed, activo=False, ok=False, error=str(e))
            return []

    def tarea_cinepolis():
        t0 = time.perf_counter()
        registrar_progreso_cadena("Cinépolis", "Consultando cartelera...", completados=0, total=1, detalle="Conectando a Cinépolis", activo=True, tiempo_s=0.0)

        def cb_cpl(etapa_tipo, completados, total, detalle=""):
            elapsed = time.perf_counter() - t0
            registrar_progreso_cadena("Cinépolis", detalle or "Procesando", completados=completados, total=total, detalle=detalle, tiempo_s=elapsed)

        try:
            cpl = CinepolisScraper()
            cinemas_data = cpl.obtener_cartelera_data(progreso_callback=cb_cpl, ciudad=ciudad, sedes=sedes)
            pelis = parsear_peliculas_cinepolis(cinemas_data)
            items = [p.model_dump() for p in pelis]
            elapsed = time.perf_counter() - t0
            registrar_progreso_cadena(
                "Cinépolis",
                "Completado",
                completados=1,
                total=1,
                detalle=f"{len(items)} películas listas",
                tiempo_s=elapsed,
                activo=False,
                ok=True,
                peliculas=len(items),
            )
            return items
        except Exception as e:
            elapsed = time.perf_counter() - t0
            print(f"Aviso Cinépolis: {e}")
            registrar_progreso_cadena("Cinépolis", "Error de extracción", completados=0, total=1, detalle=str(e), tiempo_s=elapsed, activo=False, ok=False, error=str(e))
            return []

    def tarea_cinestar():
        t0 = time.perf_counter()
        registrar_progreso_cadena("Cine Star", "Iniciando consulta TumiSoft...", completados=0, total=1, detalle="Listando sedes", activo=True, tiempo_s=0.0)

        def cb_cs(completados, total, detalle=""):
            elapsed = time.perf_counter() - t0
            registrar_progreso_cadena("Cine Star", "Descargando sedes nacionales", completados=completados, total=total, detalle=detalle, tiempo_s=elapsed)

        try:
            cs = CineStarScraper()
            data = cs.obtener_cartelera_data(progreso_callback=cb_cs, ciudad=ciudad, sedes=sedes)
            pelis = parsear_peliculas_tumisoft(data, cadena_nombre="Cine Star", base_url=cs.BASE_URL)
            items = [p.model_dump() for p in pelis]
            elapsed = time.perf_counter() - t0
            registrar_progreso_cadena(
                "Cine Star",
                "Completado",
                completados=1,
                total=1,
                detalle=f"{len(items)} películas listas",
                tiempo_s=elapsed,
                activo=False,
                ok=True,
                peliculas=len(items),
            )
            return items
        except Exception as e:
            elapsed = time.perf_counter() - t0
            print(f"Aviso Cine Star: {e}")
            registrar_progreso_cadena("Cine Star", "Error de extracción", completados=0, total=1, detalle=str(e), tiempo_s=elapsed, activo=False, ok=False, error=str(e))
            return []

    def tarea_movietime():
        t0 = time.perf_counter()
        registrar_progreso_cadena("Movie Time", "Iniciando consulta TumiSoft...", completados=0, total=1, detalle="Listando sedes", activo=True, tiempo_s=0.0)

        def cb_mt(completados, total, detalle=""):
            elapsed = time.perf_counter() - t0
            registrar_progreso_cadena("Movie Time", "Descargando sedes nacionales", completados=completados, total=total, detalle=detalle, tiempo_s=elapsed)

        try:
            mt = MovieTimeScraper()
            data = mt.obtener_cartelera_data(progreso_callback=cb_mt, ciudad=ciudad, sedes=sedes)
            pelis = parsear_peliculas_tumisoft(data, cadena_nombre="Movie Time", base_url=mt.BASE_URL)
            items = [p.model_dump() for p in pelis]
            elapsed = time.perf_counter() - t0
            registrar_progreso_cadena(
                "Movie Time",
                "Completado",
                completados=1,
                total=1,
                detalle=f"{len(items)} películas listas",
                tiempo_s=elapsed,
                activo=False,
                ok=True,
                peliculas=len(items),
            )
            return items
        except Exception as e:
            elapsed = time.perf_counter() - t0
            print(f"Aviso Movie Time: {e}")
            registrar_progreso_cadena("Movie Time", "Error de extracción", completados=0, total=1, detalle=str(e), tiempo_s=elapsed, activo=False, ok=False, error=str(e))
            return []

    def tarea_uvk():
        t0 = time.perf_counter()
        registrar_progreso_cadena("UVK", "Listando películas...", completados=0, total=1, detalle="Conectando a UVK", activo=True, tiempo_s=0.0)

        def cb_uvk(completados, total, detalle=""):
            elapsed = time.perf_counter() - t0
            registrar_progreso_cadena("UVK", "Descargando cartelera de películas", completados=completados, total=total, detalle=detalle, tiempo_s=elapsed)

        try:
            uvk = UVKScraper()
            resultados = uvk.obtener_cartelera_data(progreso_callback=cb_uvk, ciudad=ciudad, sedes=sedes)
            pelis = parsear_peliculas_uvk(resultados, ciudad_filtro=ciudad, sedes_filtro=sedes)
            items = [p.model_dump() for p in pelis]
            elapsed = time.perf_counter() - t0
            registrar_progreso_cadena(
                "UVK",
                "Completado",
                completados=1,
                total=1,
                detalle=f"{len(items)} películas listas",
                tiempo_s=elapsed,
                activo=False,
                ok=True,
                peliculas=len(items),
            )
            return items
        except Exception as e:
            elapsed = time.perf_counter() - t0
            print(f"Aviso UVK: {e}")
            registrar_progreso_cadena("UVK", "Error de extracción", completados=0, total=1, detalle=str(e), tiempo_s=elapsed, activo=False, ok=False, error=str(e))
            return []

    todas_las_tareas = [
        ("Cinépolis", tarea_cinepolis),
        ("Cinemark", tarea_cinemark),
        ("Cine Star", tarea_cinestar),
        ("Movie Time", tarea_movietime),
        ("UVK", tarea_uvk),
        ("Cineplanet", tarea_cineplanet),
    ]

    tareas_a_ejecutar = [t for t in todas_las_tareas if t[0] in cadenas_activas]
    total_tareas = len(tareas_a_ejecutar)
    completadas = 0

    if tareas_a_ejecutar:
        with ThreadPoolExecutor(max_workers=min(6, len(tareas_a_ejecutar))) as executor:
            futuros = {executor.submit(func): nombre for nombre, func in tareas_a_ejecutar}
            for futuro in as_completed(futuros):
                nombre = futuros[futuro]
                completadas += 1
                try:
                    res = futuro.result()
                    peliculas.extend(res)
                    estado_cadenas[nombre] = {"ok": True, "peliculas": len(res)}
                except Exception as e:
                    print(f"Error procesando {nombre}: {e}")
                    estado_cadenas[nombre] = {"ok": False, "error": str(e), "peliculas": 0}

    # Si se especificó días de anticipación, limitar las funciones de TODAS las cadenas a esa ventana
    if dias_disponibilidad and dias_disponibilidad > 0:
        limite_iso = (datetime.now() + timedelta(days=dias_disponibilidad)).strftime("%Y-%m-%d")
        peliculas_filtradas = []
        for p in peliculas:
            sedes_filtradas = []
            for s in p.get("sedes", []):
                funciones_en_limite = [
                    fn for fn in s.get("funciones", [])
                    if not fn.get("dia") or fn.get("dia") <= limite_iso
                ]
                if funciones_en_limite:
                    s_nuevo = dict(s)
                    s_nuevo["funciones"] = funciones_en_limite
                    s_nuevo["dias"] = sorted(list(set(fn["dia"] for fn in funciones_en_limite if fn.get("dia"))))
                    sedes_filtradas.append(s_nuevo)
            if sedes_filtradas:
                p_nuevo = dict(p)
                p_nuevo["sedes"] = sedes_filtradas
                p_nuevo["ciudades"] = sorted(list(set(s["ciudad"] for s in sedes_filtradas if s.get("ciudad"))))
                peliculas_filtradas.append(p_nuevo)
        peliculas = peliculas_filtradas

    peliculas.sort(key=lambda p: (p.get("titulo") or "").lower())
    guardar_json(
        peliculas,
        metadata={
            "estado_cadenas": estado_cadenas,
            "cobertura": {
                "nacional": cobertura.get("nacional", True),
                "ciudad": ciudad,
                "cadenas_activas": sorted(list(cadenas_activas)),
                "cadenas_omitidas": sorted(list(cadenas_omitidas)),
                "sedes_por_cadena": cobertura.get("sedes_por_cadena", {}),
            },
        },
    )
    finalizar_monitoreo_cadenas(len(peliculas))


if __name__ == "__main__":
    main()
