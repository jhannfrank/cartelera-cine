import argparse
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
from app.progreso import escribir_progreso, ahora_iso


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
    escribir_progreso(2, f"Iniciando escaneo nacional multacadena{etiqueta_alcance}", iniciado=inicio)

    def tarea_cineplanet():
        try:
            cineplanet_scraper = CineplanetScraper()
            cp_movies, cp_cinemas_index, cp_sessions_index, cp_availability_index = (
                cineplanet_scraper.obtener_cartelera_data(
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
            return items
        except Exception as e:
            print(f"Aviso Cineplanet: {e}")
            return []

    def tarea_cinemark():
        try:
            cinemark_scraper = CinemarkScraper()
            cm_movies, cm_theaters_index, cm_showtimes_by_theater = cinemark_scraper.obtener_cartelera_data(
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
            return items
        except Exception as e:
            print(f"Aviso Cinemark: {e}")
            return []

    def tarea_cinepolis():
        try:
            cpl = CinepolisScraper()
            cinemas_data = cpl.obtener_cartelera_data(ciudad=ciudad, sedes=sedes)
            pelis = parsear_peliculas_cinepolis(cinemas_data)
            return [p.model_dump() for p in pelis]
        except Exception as e:
            print(f"Aviso Cinépolis: {e}")
            return []

    def tarea_cinestar():
        try:
            cs = CineStarScraper()
            data = cs.obtener_cartelera_data(ciudad=ciudad, sedes=sedes)
            pelis = parsear_peliculas_tumisoft(data, cadena_nombre="Cine Star", base_url=cs.BASE_URL)
            return [p.model_dump() for p in pelis]
        except Exception as e:
            print(f"Aviso Cine Star: {e}")
            return []

    def tarea_movietime():
        try:
            mt = MovieTimeScraper()
            data = mt.obtener_cartelera_data(ciudad=ciudad, sedes=sedes)
            pelis = parsear_peliculas_tumisoft(data, cadena_nombre="Movie Time", base_url=mt.BASE_URL)
            return [p.model_dump() for p in pelis]
        except Exception as e:
            print(f"Aviso Movie Time: {e}")
            return []

    def tarea_uvk():
        try:
            uvk = UVKScraper()
            resultados = uvk.obtener_cartelera_data(ciudad=ciudad, sedes=sedes)
            pelis = parsear_peliculas_uvk(resultados, ciudad_filtro=ciudad, sedes_filtro=sedes)
            return [p.model_dump() for p in pelis]
        except Exception as e:
            print(f"Aviso UVK: {e}")
            return []

    tareas = [
        ("Cineplanet", tarea_cineplanet),
        ("Cinemark", tarea_cinemark),
        ("Cinépolis", tarea_cinepolis),
        ("Cine Star", tarea_cinestar),
        ("Movie Time", tarea_movietime),
        ("UVK", tarea_uvk),
    ]

    escribir_progreso(15, f"Consultando 6 cadenas en paralelo...{etiqueta_alcance}", iniciado=inicio)

    total_tareas = len(tareas)
    completadas = 0
    estado_cadenas = {}

    with ThreadPoolExecutor(max_workers=6) as executor:
        futuros = {executor.submit(func): nombre for nombre, func in tareas}
        for futuro in as_completed(futuros):
            nombre = futuros[futuro]
            completadas += 1
            porcentaje = int(15 + (completadas / total_tareas) * 80)
            escribir_progreso(porcentaje, f"Procesando resultados ({completadas}/{total_tareas}): {nombre}", iniciado=inicio)
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

    escribir_progreso(98, "Guardando y unificando cartelera nacional", iniciado=inicio)
    peliculas.sort(key=lambda p: (p.get("titulo") or "").lower())
    guardar_json(peliculas, metadata={"estado_cadenas": estado_cadenas})
    escribir_progreso(100, f"Actualización finalizada con éxito ({len(peliculas)} películas totales)", iniciado=inicio)

    print(f"Scraping multacadena finalizado: {len(peliculas)} registros obtenidos.")


if __name__ == "__main__":
    main()
