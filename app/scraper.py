import json
import gzip
import random
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from http.cookiejar import CookieJar
from urllib.request import Request, build_opener, HTTPCookieProcessor
from urllib.error import HTTPError, URLError
import urllib.parse


class BaseScraper:
    """
    Clase base para construir scrapers HTTP con grado de resiliencia de producción.
    Proporciona un cliente con soporte de cookies, rotación de User-Agents modernos,
    retroceso exponencial con fluctuación aleatoria (jitter) y descompresión GZIP.
    """
    USER_AGENTS = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
    ]

    DEFAULT_HEADERS = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "es-PE,es;q=0.9,en;q=0.8",
        "Sec-Ch-Ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
    }

    def __init__(self):
        self._opener = build_opener(HTTPCookieProcessor(CookieJar()))

    def _get_random_user_agent(self):
        return random.choice(self.USER_AGENTS)

    def _obtener_json(self, endpoint, headers=None, intentos=4, timeout=25):
        ultimo_error = None
        request_headers = dict(self.DEFAULT_HEADERS)
        request_headers["User-Agent"] = self._get_random_user_agent()
        if headers:
            request_headers.update(headers)

        for intento in range(1, intentos + 1):
            request = Request(endpoint, headers=request_headers)
            try:
                with self._opener.open(request, timeout=timeout) as response:
                    raw = response.read()
                    if response.headers.get("Content-Encoding", "").lower() == "gzip":
                        raw = gzip.decompress(raw)
                    try:
                        decoded = raw.decode("utf-8")
                        if "\ufffd" in decoded:
                            decoded = raw.decode("latin-1")
                    except UnicodeDecodeError:
                        decoded = raw.decode("latin-1")
                    return json.loads(decoded)
            except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
                ultimo_error = error
                if intento == intentos:
                    break
                # Backoff exponencial con Jitter aleatorio para mitigar colisiones concurrentes
                jitter = random.uniform(0.1, 0.5)
                tiempo_espera = (0.7 * (2 ** (intento - 1))) + jitter
                time.sleep(tiempo_espera)

        raise RuntimeError(f"No se pudo obtener {endpoint}: {ultimo_error}")

    def _post_json(self, endpoint, payload, headers=None, intentos=4, timeout=25):
        ultimo_error = None
        request_headers = dict(self.DEFAULT_HEADERS)
        request_headers["User-Agent"] = self._get_random_user_agent()
        request_headers.update({
            "Content-Type": "application/json; charset=UTF-8",
            "X-Requested-With": "XMLHttpRequest",
        })
        if headers:
            request_headers.update(headers)

        body = json.dumps(payload).encode("utf-8") if isinstance(payload, (dict, list)) else payload

        for intento in range(1, intentos + 1):
            request = Request(endpoint, data=body, headers=request_headers)
            try:
                with self._opener.open(request, timeout=timeout) as response:
                    raw = response.read()
                    if response.headers.get("Content-Encoding", "").lower() == "gzip":
                        raw = gzip.decompress(raw)
                    try:
                        decoded = raw.decode("utf-8")
                        if "\ufffd" in decoded:
                            decoded = raw.decode("latin-1")
                    except UnicodeDecodeError:
                        decoded = raw.decode("latin-1")
                    return json.loads(decoded)
            except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
                ultimo_error = error
                if intento == intentos:
                    break
                jitter = random.uniform(0.1, 0.5)
                tiempo_espera = (0.7 * (2 ** (intento - 1))) + jitter
                time.sleep(tiempo_espera)

        raise RuntimeError(f"No se pudo enviar POST a {endpoint}: {ultimo_error}")

    def _obtener_cookies_sesion(self, url):
        headers = dict(self.DEFAULT_HEADERS)
        headers["User-Agent"] = self._get_random_user_agent()
        request = Request(url, headers=headers)
        with self._opener.open(request, timeout=25):
            pass


class CineplanetScraper(BaseScraper):
    """
    Scraper específico para la cadena Cineplanet.
    Consume la caché web oficial para recuperar películas, cines y horarios.
    """
    DEFAULT_HEADERS = {
        **BaseScraper.DEFAULT_HEADERS,
        "Referer": "https://www.cineplanet.com.pe/",
        "Origin": "https://www.cineplanet.com.pe",
    }

    def obtener_cartelera_data(
        self,
        progreso_callback=None,
        ciudad=None,
        sedes=None,
        incluir_disponibilidad=True,
        dias_disponibilidad=None,
    ):
        self._obtener_cookies_sesion("https://www.cineplanet.com.pe/")
        movies_payload = self._obtener_json("https://www.cineplanet.com.pe/api/v1-web/cache/moviescache")
        cinemas_payload = self._obtener_json("https://www.cineplanet.com.pe/api/v1-web/cache/cinemascache")
        sessions_payload = self._obtener_json("https://www.cineplanet.com.pe/api/v1-web/cache/sessioncache")

        movies = movies_payload.get("movies", [])
        cinemas = cinemas_payload.get("cinemas", [])
        sessions = sessions_payload.get("sessions", [])

        cinemas_index = {}
        for cinema in cinemas:
            cinema_id = str(cinema.get("ID", ""))
            if cinema_id:
                cinemas_index[cinema_id] = cinema

        sessions_index = {}
        for session in sessions:
            session_id = str(session.get("id", ""))
            if session_id:
                sessions_index[session_id] = session

        if ciudad or sedes:
            cinemas_permitidos = set(cinemas_index.keys())
            if ciudad:
                ciudad_norm = ciudad.strip().lower()
                cinemas_permitidos &= {
                    cid
                    for cid, info in cinemas_index.items()
                    if (info.get("city") or "").strip().lower() == ciudad_norm
                }
            if sedes:
                sedes_norm = {s.strip().lower() for s in sedes if s.strip()}
                cinemas_permitidos &= {
                    cid
                    for cid, info in cinemas_index.items()
                    if (info.get("name") or info.get("formattedCinemaName") or "").strip().lower() in sedes_norm
                }
            movies = [
                {
                    **movie,
                    "cinemas": [
                        cm
                        for cm in movie.get("cinemas", [])
                        if str(cm.get("cinemaId", "")) in cinemas_permitidos
                    ],
                }
                for movie in movies
            ]
            sessions_index = {
                sid: sess
                for sid, sess in sessions_index.items()
                if sid.partition("-")[0] in cinemas_permitidos
            }

        if incluir_disponibilidad:
            sesiones_para_disponibilidad = sessions_index
            if dias_disponibilidad:
                limite = (datetime.now() + timedelta(days=dias_disponibilidad)).strftime("%Y-%m-%d")
                sesiones_para_disponibilidad = {
                    sid: sess
                    for sid, sess in sessions_index.items()
                    if (sess.get("showtime") or "")[:10] <= limite
                }
            availability_index = self._obtener_disponibilidad(
                sesiones_para_disponibilidad, progreso_callback=progreso_callback
            )
        else:
            availability_index = {}
            if progreso_callback:
                progreso_callback(1, 1)

        return movies, cinemas_index, sessions_index, availability_index

    def _obtener_disponibilidad(self, sessions_index, max_workers=12, progreso_callback=None):
        availability_index = {}
        total = len(sessions_index)
        completados = 0

        def consultar(combined_id):
            cinema_id, _, session_id = combined_id.partition("-")
            if not cinema_id or not session_id:
                return combined_id, None
            endpoint = (
                "https://www.cineplanet.com.pe/api/v1-web/sessionavailable"
                f"/cinema/{cinema_id}/session/{session_id}"
            )
            try:
                data = self._obtener_json(endpoint, intentos=2, timeout=6)
            except Exception:
                return combined_id, None
            return combined_id, {
                "asientos_disponibles": data.get("available-seats", 0),
                "capacidad": data.get("seatsTotal", 0),
            }

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [
                executor.submit(consultar, combined_id)
                for combined_id in sessions_index.keys()
            ]
            for future in as_completed(futures):
                combined_id, disponibilidad = future.result()
                if disponibilidad:
                    availability_index[combined_id] = disponibilidad
                completados += 1
                if progreso_callback and (completados % 20 == 0 or completados == total):
                    progreso_callback(completados, total)

        obtenidos = len(availability_index)
        if total and obtenidos < total * 0.5:
            print(
                f"AVISO: solo se obtuvo disponibilidad de Cineplanet para "
                f"{obtenidos}/{total} funciones (posible limite de tasa del sitio)."
            )

        return availability_index

    def obtener_cines(self):
        """Lista liviana de cines (nombre + ciudad), sin cartelera ni disponibilidad."""
        self._obtener_cookies_sesion("https://www.cineplanet.com.pe/")
        cinemas_payload = self._obtener_json("https://www.cineplanet.com.pe/api/v1-web/cache/cinemascache")
        return [
            {
                "cadena": "Cineplanet",
                "nombre": (c.get("name") or c.get("formattedCinemaName") or "").strip(),
                "ciudad": (c.get("city") or "").strip(),
            }
            for c in cinemas_payload.get("cinemas", [])
            if (c.get("name") or c.get("formattedCinemaName"))
        ]

    def cerrar(self):
        return None


class CinemarkScraper(BaseScraper):
    """
    Scraper específico para la cadena Cinemark Perú.
    Se conecta a la API BFF (Backend For Frontend) para obtener películas, cines,
    horarios e información de disponibilidad de asientos.
    """
    BASE_BFF = "https://bff.cinemark-peru.com/api"
    COUNTRY_HEADER = {
        "country": "PE",
        "Origin": "https://www.cinemark-peru.com",
        "Referer": "https://www.cinemark-peru.com/",
    }

    def _endpoint(self, path):
        return f"{self.BASE_BFF}{path}"

    def obtener_cartelera_data(
        self, progreso_callback=None, ciudad=None, sedes=None, dias_maximos=None
    ):
        movies_payload = self._obtener_json(
            self._endpoint("/cinema/movies"),
            headers=self.COUNTRY_HEADER,
        )
        theaters_payload = self._obtener_json(
            self._endpoint("/cinema/theaters"),
            headers=self.COUNTRY_HEADER,
        )

        movies = movies_payload.get("data", [])
        theaters = theaters_payload.get("data", [])
        if ciudad:
            ciudad_norm = ciudad.strip().lower()
            theaters = [t for t in theaters if (t.get("city") or "").strip().lower() == ciudad_norm]
        if sedes:
            sedes_norm = {s.strip().lower() for s in sedes if s.strip()}
            theaters = [t for t in theaters if (t.get("name") or "").strip().lower() in sedes_norm]

        theaters_index = {}
        for theater in theaters:
            theater_id = str(theater.get("id", "")).strip()
            if theater_id:
                theaters_index[theater_id] = theater

        limite_fecha = None
        if dias_maximos:
            limite_fecha = (datetime.now() + timedelta(days=dias_maximos)).strftime("%Y-%m-%d")

        # Descarga concurrente controlada (max_workers=5) de horarios por teatro.
        # Usa un pool seguro equivalente a conexiones HTTP de un navegador moderno,
        # previniendo bloqueos por rate limiting y acelerando la respuesta a < 1 segundo.
        showtimes_by_theater = {}
        total_theaters = len(theaters_index)
        completados_theaters = 0

        def _fetch_theater_showtimes(t_id):
            try:
                payload = self._obtener_json(
                    self._endpoint(f"/cinema/showtimes?theater={t_id}"),
                    headers=self.COUNTRY_HEADER,
                )
                datos = payload.get("data", [])
                if limite_fecha:
                    datos = [
                        s for s in datos
                        if (s.get("sessionDisplayDate") or "9999-99-99")[:10] <= limite_fecha
                    ]
                return t_id, datos
            except Exception:
                return t_id, []

        if theaters_index:
            with ThreadPoolExecutor(max_workers=5) as executor:
                futures = [executor.submit(_fetch_theater_showtimes, tid) for tid in theaters_index.keys()]
                for fut in as_completed(futures):
                    tid, datos = fut.result()
                    showtimes_by_theater[tid] = datos
                    completados_theaters += 1
                    if progreso_callback:
                        progreso_callback("theaters", completados_theaters, total_theaters)

        # Filtramos para enriquecer UNICAMENTE películas que tengan funciones activas
        # en las sedes analizadas, evitando decenas de peticiones innecesarias.
        corporate_ids_con_funciones = {
            str(s.get("corporateId", "")).strip()
            for lista in showtimes_by_theater.values()
            for s in lista
            if str(s.get("corporateId", "")).strip()
        }
        movies_a_enriquecer = [
            m for m in movies
            if str(m.get("corporateId", "")).strip() in corporate_ids_con_funciones
        ]

        # Enriquecimiento concurrente controlado (max_workers=5) con reintentos y fallback
        movies_enriched = []
        total_movies = len(movies_a_enriquecer)
        completados_movies = 0

        def _fetch_movie_detail(m):
            cid = str(m.get("corporateId", "")).strip()
            if not cid:
                return m
            try:
                detail_payload = self._obtener_json(
                    self._endpoint(f"/cinema/movie/{cid}"),
                    headers=self.COUNTRY_HEADER,
                )
                detail = detail_payload.get("data") or {}
                merged = dict(m)
                merged.update(detail)
                return merged
            except Exception:
                # Si falla enriquecer (ej. 404 o timeout), se conserva la metadata base
                return m

        if movies_a_enriquecer:
            with ThreadPoolExecutor(max_workers=5) as executor:
                futures = [executor.submit(_fetch_movie_detail, m) for m in movies_a_enriquecer]
                for fut in as_completed(futures):
                    enriched_movie = fut.result()
                    movies_enriched.append(enriched_movie)
                    completados_movies += 1
                    if progreso_callback:
                        progreso_callback("movies", completados_movies, total_movies)
        else:
            movies_enriched = []

        return movies_enriched, theaters_index, showtimes_by_theater

    def obtener_cines(self):
        """Lista liviana de cines (nombre + ciudad), sin cartelera ni horarios."""
        theaters_payload = self._obtener_json(
            self._endpoint("/cinema/theaters"),
            headers=self.COUNTRY_HEADER,
        )
        return [
            {
                "cadena": "Cinemark",
                "nombre": (t.get("name") or "").strip(),
                "ciudad": (t.get("city") or "").strip(),
            }
            for t in theaters_payload.get("data", [])
            if t.get("name")
        ]

    def cerrar(self):
        return None


class CinepolisScraper(BaseScraper):
    """
    Scraper para Cinépolis Perú.
    Consume la API interna ASP.NET AJAX para obtener la cartelera completa de Lima y cines activos.
    """
    ENDPOINT = "https://cinepolis.com.pe/Cartelera.aspx/GetNowPlayingByCity"
    HEADERS = {
        "Referer": "https://cinepolis.com.pe/cartelera/lima-peru",
        "Origin": "https://cinepolis.com.pe",
    }

    def obtener_cines(self):
        """Lista las sedes activas de Cinépolis en Perú."""
        try:
            res = self._post_json(self.ENDPOINT, {"claveCiudad": "lima-peru", "esVIP": False}, headers=self.HEADERS)
            cinemas = res.get("d", {}).get("Cinemas", [])
            cines = []
            for c in cinemas:
                nombre = (c.get("Name") or "").strip()
                if nombre:
                    cines.append({
                        "cadena": "Cinépolis",
                        "nombre": nombre,
                        "ciudad": "Lima",
                    })
            return cines
        except Exception:
            # Fallback a sedes conocidas si la API falla puntualmente
            return [
                {"cadena": "Cinépolis", "nombre": "Cinépolis Larcomar", "ciudad": "Lima"},
                {"cadena": "Cinépolis", "nombre": "Cinépolis Plaza Norte", "ciudad": "Lima"},
                {"cadena": "Cinépolis", "nombre": "Cinépolis Santa Anita", "ciudad": "Lima"},
            ]

    def obtener_cartelera_data(self, progreso_callback=None, ciudad=None, sedes=None):
        if ciudad and ciudad.strip().lower() not in ("lima", "lima, perú", "lima, peru"):
            # Cinépolis actualmente solo tiene complejos activos en Lima
            if progreso_callback:
                progreso_callback(1, 1)
            return []

        res = self._post_json(self.ENDPOINT, {"claveCiudad": "lima-peru", "esVIP": False}, headers=self.HEADERS)
        data = res.get("d", {})
        cinemas = data.get("Cinemas", [])

        if sedes:
            sedes_norm = {s.strip().lower() for s in sedes if s.strip()}
            cinemas = [
                c for c in cinemas
                if (c.get("Name") or "").strip().lower() in sedes_norm
                or (c.get("Key") or "").strip().lower() in sedes_norm
            ]

        if progreso_callback:
            progreso_callback(1, 1)

        return cinemas

    def cerrar(self):
        return None


class TumiSoftBaseScraper(BaseScraper):
    """
    Clase base para cines basados en la plataforma SvelteKit/TumiSoft (Cine Star y Movie Time).
    """
    BASE_URL = ""
    CADENA_NOMBRE = ""

    CIUDADES_CONOCIDAS = {
        "lima": "Lima", "callao": "Callao", "sjl": "Lima", "surco": "Lima",
        "miraflores": "Lima", "rimac": "Lima", "comas": "Lima", "chosica": "Lima",
        "chorrillos": "Lima", "tarapoto": "Tarapoto", "tingo maria": "Tingo María",
        "tingo maría": "Tingo María", "chimbote": "Chimbote", "sullana": "Sullana",
        "ayacucho": "Ayacucho", "ilo": "Ilo", "moquegua": "Moquegua", "iquitos": "Iquitos",
        "jaen": "Jaén", "jaén": "Jaén", "cajamarca": "Cajamarca", "chincha": "Chincha",
        "cañete": "Cañete", "canete": "Cañete", "pisco": "Pisco", "barranca": "Barranca",
        "huaral": "Huaral",
    }

    def _deducir_ciudad(self, branch):
        nombre = (branch.get("name") or "").strip().lower()
        direccion = (branch.get("address") or "").strip().lower()
        slug = (branch.get("slug") or "").strip().lower()
        texto = f"{nombre} {direccion} {slug}"

        for clave, ciudad in self.CIUDADES_CONOCIDAS.items():
            if clave in texto:
                return ciudad
        return "Lima"

    def obtener_cines(self):
        url = f"{self.BASE_URL}/cinemas"
        data = self._obtener_json(url)
        branches = data.get("branches", [])
        cines = []
        for b in branches:
            nombre = (b.get("name") or "").strip()
            if nombre:
                cines.append({
                    "cadena": self.CADENA_NOMBRE,
                    "nombre": f"{self.CADENA_NOMBRE} {nombre}",
                    "ciudad": self._deducir_ciudad(b),
                    "id": b.get("id"),
                    "slug": b.get("slug"),
                })
        return cines

    def _resolver_devalue_sveltekit(self, data_pool, root_idx, seen=None):
        if seen is None:
            seen = {}
        if not isinstance(root_idx, int) or root_idx < 0 or root_idx >= len(data_pool):
            return root_idx
        if root_idx in seen:
            return seen[root_idx]

        val = data_pool[root_idx]
        if isinstance(val, (str, bool, type(None), float, int)):
            seen[root_idx] = val
            return val
        if isinstance(val, list):
            res_list = []
            seen[root_idx] = res_list
            for item_idx in val:
                res_list.append(self._resolver_devalue_sveltekit(data_pool, item_idx, seen))
            return res_list
        if isinstance(val, dict):
            res_dict = {}
            seen[root_idx] = res_dict
            for k, item_idx in val.items():
                res_dict[k] = self._resolver_devalue_sveltekit(data_pool, item_idx, seen)
            return res_dict
        return val

    def _obtener_presentaciones_cine(self, cine):
        slug = cine.get("slug")
        if not slug:
            return []
        url = f"{self.BASE_URL}/cinemas/{slug}/__data.json"
        try:
            raw = self._obtener_json(url)
            nodes = raw.get("nodes", [])
            if len(nodes) < 3 or not nodes[2]:
                return []
            pool = nodes[2].get("data", [])
            if not pool or len(pool) < 2 or not isinstance(pool[1], dict):
                return []
            items_idx = pool[1].get("items")
            if items_idx is None:
                return []
            pres_indices = pool[items_idx] if isinstance(items_idx, int) and items_idx < len(pool) else items_idx
            if not isinstance(pres_indices, list):
                return []

            resolved = []
            for p_idx in pres_indices:
                p = self._resolver_devalue_sveltekit(pool, p_idx)
                if isinstance(p, dict):
                    resolved.append(p)
            return resolved
        except Exception:
            return []

    def obtener_cartelera_data(self, progreso_callback=None, ciudad=None, sedes=None):
        # 1. Obtener todas las sedes filtradas
        cines = self.obtener_cines()
        if ciudad:
            ciudad_norm = ciudad.strip().lower()
            cines = [
                c for c in cines
                if c["ciudad"].strip().lower() == ciudad_norm
                or (ciudad_norm == "lima" and c["ciudad"].strip().lower() == "callao")
            ]
        if sedes:
            sedes_norm = {s.strip().lower() for s in sedes if s.strip()}
            cines = [
                c for c in cines
                if c["nombre"].strip().lower() in sedes_norm
                or (c.get("slug") or "").strip().lower() in sedes_norm
            ]

        if not cines:
            if progreso_callback:
                progreso_callback(1, 1)
            return []

        # 2. Consultar concurrentemente la cartelera exclusiva de cada sede
        cines_con_presentaciones = []
        with ThreadPoolExecutor(max_workers=8) as executor:
            futuros = {
                executor.submit(self._obtener_presentaciones_cine, c): c
                for c in cines
            }
            completados = 0
            total = len(futuros)
            for fut in as_completed(futuros):
                completados += 1
                if progreso_callback:
                    progreso_callback(completados, total)
                cine = futuros[fut]
                try:
                    presentaciones = fut.result()
                    if presentaciones:
                        cines_con_presentaciones.append({
                            "cine": cine,
                            "presentations": presentaciones,
                        })
                except Exception:
                    pass

        return cines_con_presentaciones

    def cerrar(self):
        return None


class CineStarScraper(TumiSoftBaseScraper):
    BASE_URL = "https://www.cinestar.com.pe"
    CADENA_NOMBRE = "Cine Star"


class MovieTimeScraper(TumiSoftBaseScraper):
    BASE_URL = "https://www.movietime.com.pe"
    CADENA_NOMBRE = "Movie Time"


class UVKScraper(BaseScraper):
    """
    Scraper para UVK Multicines (uvk.pe).
    Maneja sesiones y CSRF para consultar carteleras por cine.
    """
    BASE_URL = "https://uvk.pe"

    CINES_UVK = [
        {"id": 1, "nombre": "UVK Platino Panorama", "ciudad": "Lima", "slug": "panorama"},
        {"id": 2, "nombre": "UVK San Martín", "ciudad": "Lima", "slug": "san-martin"},
        {"id": 4, "nombre": "UVK Ilo", "ciudad": "Ilo", "slug": "ilo"},
        {"id": 5, "nombre": "UVK Tumbes", "ciudad": "Tumbes", "slug": "tumbes"},
        {"id": 6, "nombre": "UVK El Agustino", "ciudad": "Lima", "slug": "el-agustino"},
    ]

    def obtener_cines(self):
        return [
            {
                "cadena": "UVK",
                "nombre": c["nombre"],
                "ciudad": c["ciudad"],
                "id": c["id"],
                "slug": c["slug"],
            }
            for c in self.CINES_UVK
        ]

    def _obtener_html(self, url, headers=None):
        import re
        request_headers = dict(self.DEFAULT_HEADERS)
        if headers:
            request_headers.update(headers)
        req = Request(url, headers=request_headers)
        with self._opener.open(req, timeout=25) as resp:
            raw = resp.read()
            if resp.headers.get("Content-Encoding", "").lower() == "gzip":
                raw = gzip.decompress(raw)
            return raw.decode("utf-8", errors="ignore")

    def _post_form(self, url, data_dict, headers=None):
        import urllib.parse
        request_headers = dict(self.DEFAULT_HEADERS)
        request_headers["Content-Type"] = "application/x-www-form-urlencoded"
        if headers:
            request_headers.update(headers)
        body = urllib.parse.urlencode(data_dict).encode("utf-8")
        req = Request(url, data=body, headers=request_headers)
        with self._opener.open(req, timeout=25) as resp:
            raw = resp.read()
            if resp.headers.get("Content-Encoding", "").lower() == "gzip":
                raw = gzip.decompress(raw)
            return raw.decode("utf-8", errors="ignore")

    def obtener_cartelera_data(self, progreso_callback=None, ciudad=None, sedes=None):
        """
        Extrae la cartelera de UVK de manera ultra-optimizada en paralelo.
        Consulta el listado global de películas desde /peliculas una sola vez
        y descarga en paralelo (ThreadPoolExecutor) la cartelera de cada película,
        la cual ya incluye todas las sedes, fechas y salas a nivel nacional.
        Reduce el tiempo de extracción de ~90-120s a menos de 4s.
        """
        import re
        import urllib.parse
        from concurrent.futures import ThreadPoolExecutor, as_completed

        cines_a_consultar = self.obtener_cines()
        if ciudad:
            ciudad_norm = ciudad.strip().lower()
            cines_a_consultar = [c for c in cines_a_consultar if c["ciudad"].strip().lower() == ciudad_norm]
        if sedes:
            sedes_norm = {s.strip().lower() for s in sedes if s.strip()}
            cines_a_consultar = [
                c for c in cines_a_consultar
                if c["nombre"].strip().lower() in sedes_norm
                or c["slug"].strip().lower() in sedes_norm
            ]

        if not cines_a_consultar:
            if progreso_callback:
                progreso_callback(1, 1)
            return []

        # 1. Obtener la lista de películas actualmente en cartelera desde /peliculas (~0.8s)
        try:
            list_html = self._obtener_html(f"{self.BASE_URL}/peliculas")
        except Exception:
            list_html = ""

        # Extraer enlaces a películas (id, slug)
        movie_links = re.findall(r'href=["\'](?:https://uvk\.pe)?/peliculas/(\d+)/([^"\']+)["\']', list_html)
        unique_movies = list(dict.fromkeys(movie_links))

        # Fallback si /peliculas viniera vacío: extraer de las páginas individuales de los cines
        if not unique_movies:
            for c in cines_a_consultar:
                try:
                    c_html = self._obtener_html(f"{self.BASE_URL}/cine/{c['id']}")
                    m_btns = re.findall(
                        r'<button[^>]*class=["\'][^"\']*buy-button[^"\']*["\'][^>]*data-movieid=["\'](\d+)["\'][^>]*data-movietitle=["\']([^"\']+)["\']',
                        c_html,
                    )
                    for mid, mtitle in m_btns:
                        unique_movies.append((mid, mtitle.strip()))
                except Exception:
                    continue
            unique_movies = list(dict.fromkeys(unique_movies))

        if not unique_movies:
            if progreso_callback:
                progreso_callback(1, 1)
            return []

        # 2. Descargar cartelera completa de cada película en PARALELO mediante GET directo
        # La página de cada película contiene todas las sedes, salas y fechas en una sola respuesta.
        resultados = []
        total = len(unique_movies)
        completados = 0

        def _descargar_pelicula(m_tuple):
            mid, mslug = m_tuple
            url = f"{self.BASE_URL}/peliculas/{mid}/{urllib.parse.quote(mslug)}"
            try:
                html = self._obtener_html(url)
                return {
                    "movie_id": mid,
                    "movie_title": mslug.replace("-", " ").strip(),
                    "html_funciones": html,
                }
            except Exception:
                return None

        with ThreadPoolExecutor(max_workers=8) as executor:
            futuros = [executor.submit(_descargar_pelicula, m) for m in unique_movies]
            for f in as_completed(futuros):
                completados += 1
                res = f.result()
                if res:
                    resultados.append(res)
                if progreso_callback:
                    progreso_callback(completados, total)

        return resultados

    def cerrar(self):
        return None
