import json
import os
import re
import subprocess
import sys
import threading
import time
import urllib.parse
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# Ancla la carpeta de trabajo a la raiz del proyecto (donde vive este archivo),
# sin importar si se ejecuta con `python server.py`, desde VS Code (Run/F5,
# clic derecho > Run Python File) o con otra carpeta activa en la terminal.
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(PROJECT_ROOT)

from app.scraper import (  # noqa: E402
    CineplanetScraper,
    CinemarkScraper,
    CinepolisScraper,
    CineStarScraper,
    MovieTimeScraper,
    UVKScraper,
)

UPDATE_STATUS_PATH = os.path.join("data", "actualizacion_estado.json")
UBICACIONES_TTL_SEGUNDOS = 6 * 60 * 60  # 6 horas

update_lock = threading.Lock()
update_running = False
proceso_actual = None
cancelacion_solicitada = False

ubicaciones_lock = threading.Lock()
ubicaciones_cache = {"datos": None, "obtenido_en": 0}


def _sanitizar_texto_parametro(texto, max_len=80):
    """
    Sanitiza un parámetro string para prevenir inyección de argumentos CLI o flags.
    Rechaza cualquier valor que inicie con '-' o contenga caracteres sospechosos.
    """
    if not texto or not isinstance(texto, str):
        return None
    limpio = texto.strip()
    if limpio.startswith("-"):
        return None
    if not re.match(r"^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s\-_.,()']+$", limpio):
        return None
    return limpio[:max_len]


def _obtener_ubicaciones(forzar=False):
    """Lista completa de ciudades/sedes de las 6 cadenas, independiente de lo
    que haya en data/peliculas.json -- asi el selector de provincia/sede
    siempre puede ofrecer TODAS las opciones reales, sin necesitar antes un
    escaneo nacional completo para "descubrirlas"."""
    with ubicaciones_lock:
        vencido = (time.time() - ubicaciones_cache["obtenido_en"]) > UBICACIONES_TTL_SEGUNDOS
        if not forzar and ubicaciones_cache["datos"] is not None and not vencido:
            return ubicaciones_cache["datos"]

    cines = []
    errores = []

    scrapers = [
        ("Cineplanet", CineplanetScraper),
        ("Cinemark", CinemarkScraper),
        ("Cinépolis", CinepolisScraper),
        ("Cine Star", CineStarScraper),
        ("Movie Time", MovieTimeScraper),
        ("UVK", UVKScraper),
    ]

    for nombre_cadena, scraper_cls in scrapers:
        try:
            cines += scraper_cls().obtener_cines()
        except Exception as e:
            errores.append(f"{nombre_cadena}: {e}")

    error = "; ".join(errores) if errores else None

    ciudades = sorted({c["ciudad"] for c in cines if c.get("ciudad")}, key=str.lower)
    sedes = sorted(
        ({"nombre": c["nombre"], "cadena": c["cadena"], "ciudad": c.get("ciudad", "Lima")} for c in cines if c.get("nombre")),
        key=lambda s: s["nombre"].lower(),
    )
    datos = {"ciudades": ciudades, "sedes": sedes, "error": error, "obtenido_en": _ahora_iso()}

    with ubicaciones_lock:
        ubicaciones_cache["datos"] = datos
        ubicaciones_cache["obtenido_en"] = time.time()

    return datos


def _ahora_iso():
    return datetime.now(timezone.utc).astimezone().isoformat()


def _escribir_estado(estado):
    os.makedirs("data", exist_ok=True)
    with open(UPDATE_STATUS_PATH, "w", encoding="utf-8") as f:
        json.dump(estado, f, ensure_ascii=False, indent=2)


def _leer_estado():
    if not os.path.exists(UPDATE_STATUS_PATH):
        return {"en_progreso": False}
    with open(UPDATE_STATUS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def _ejecutar_scraper_en_segundo_plano(
    provincia=None, incluir_disponibilidad=True, dias_disponibilidad=None, sedes=None
):
    global update_running, proceso_actual, cancelacion_solicitada
    _escribir_estado({"en_progreso": True, "iniciado": _ahora_iso(), "error": None})

    comando = [sys.executable, "main.py"]
    if provincia:
        comando += ["--provincia", provincia]
    for sede in sedes or []:
        comando += ["--sede", sede]
    if not incluir_disponibilidad:
        comando.append("--sin-disponibilidad")
    elif dias_disponibilidad:
        comando += ["--dias-disponibilidad", str(dias_disponibilidad)]
    else:
        # Salvaguarda de rendimiento: si se pide disponibilidad pero se deja dias vacio,
        # acotamos a 2 dias (hoy y mañana) para evitar consultar mas de 10,000 sesiones en Cineplanet.
        comando += ["--dias-disponibilidad", "2"]

    try:
        proceso = subprocess.Popen(
            comando,
            cwd=PROJECT_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        with update_lock:
            proceso_actual = proceso

        try:
            _, stderr = proceso.communicate(timeout=1800)
        except subprocess.TimeoutExpired:
            proceso.kill()
            proceso.communicate()
            _escribir_estado({
                "en_progreso": False,
                "finalizado": _ahora_iso(),
                "error": "Tiempo de espera agotado (30 min).",
            })
            return

        with update_lock:
            fue_cancelado = cancelacion_solicitada
            cancelacion_solicitada = False

        if fue_cancelado:
            _escribir_estado({
                "en_progreso": False,
                "finalizado": _ahora_iso(),
                "error": None,
                "cancelado": True,
            })
            return

        if proceso.returncode == 0:
            _escribir_estado({"en_progreso": False, "finalizado": _ahora_iso(), "error": None})
        else:
            _escribir_estado({
                "en_progreso": False,
                "finalizado": _ahora_iso(),
                "error": (stderr or "Error desconocido")[-2000:],
            })
    except Exception as error:
        _escribir_estado({"en_progreso": False, "finalizado": _ahora_iso(), "error": str(error)})
    finally:
        with update_lock:
            update_running = False
            proceso_actual = None


class AppHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Es un servidor de desarrollo local: la frescura de los archivos importa
        # mas que el rendimiento de cache. Sin esto, el navegador puede quedarse
        # con una copia vieja de index.html/app.js/styles.css indefinidamente.
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        # Encabezados de Ciberseguridad (Security Hardening)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "SAMEORIGIN")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https: http: blob:; "
            "connect-src 'self';"
        )
        super().end_headers()

    def translate_path(self, path):
        # Desglosar path relativo limpio sin query string ni fragmentos
        url_path = urllib.parse.urlsplit(path).path
        if url_path in ("/", ""):
            return os.path.join(PROJECT_ROOT, "web", "index.html")

        # Sanitizar decodificando y eliminando barras iniciales
        normalized = os.path.normpath(urllib.parse.unquote(url_path)).lstrip("/\\")
        partes = [p for p in normalized.split(os.sep) if p and p != "."]

        # Evitar path traversal
        if ".." in partes:
            return os.path.join(PROJECT_ROOT, "__403_forbidden__")

        # Permitir exclusivamente rutas dentro de 'web' o archivos públicos de 'data'
        es_web = bool(partes and partes[0] == "web")
        es_data_publica = bool(
            partes
            and partes[0] == "data"
            and len(partes) == 2
            and partes[1] in ("peliculas.json", "actualizacion_progreso.json", "actualizacion_estado.json")
        )

        if not (es_web or es_data_publica):
            # Prohibir acceso fuera de las carpetas públicas autorizadas (código fuente .py, .git, etc.)
            return os.path.join(PROJECT_ROOT, "__403_forbidden__")

        full_path = os.path.abspath(os.path.join(PROJECT_ROOT, *partes))
        if not full_path.startswith(PROJECT_ROOT):
            return os.path.join(PROJECT_ROOT, "__403_forbidden__")
        return full_path

    def do_POST(self):
        if self.path == "/api/actualizar":
            self._iniciar_actualizacion()
            return
        if self.path == "/api/detener":
            self._detener_actualizacion()
            return
        self.send_error(404, "No encontrado")

    def do_GET(self):
        url_path = urllib.parse.urlsplit(self.path).path
        if url_path == "/":
            self.send_response(302)
            self.send_header("Location", "/web/")
            self.end_headers()
            return
        if url_path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return

        if self.path == "/api/actualizar":
            self._responder_json(200, _leer_estado())
            return
        if self.path in ("/api/ubicaciones", "/api/ubicaciones?forzar=1"):
            forzar = self.path.endswith("forzar=1")
            self._responder_json(200, _obtener_ubicaciones(forzar=forzar))
            return

        translated = self.translate_path(self.path)
        if "__403_forbidden__" in translated:
            self.send_error(403, "Acceso denegado: recurso protegido")
            return

        super().do_GET()

    def _responder_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _iniciar_actualizacion(self):
        global update_running

        opciones = {}
        length = int(self.headers.get("Content-Length", 0) or 0)
        if length:
            try:
                opciones = json.loads(self.rfile.read(length).decode("utf-8")) or {}
            except json.JSONDecodeError:
                opciones = {}

        # Sanitización estricta contra inyección de argumentos
        provincia_raw = (opciones.get("provincia") or "").strip()
        provincia = _sanitizar_texto_parametro(provincia_raw, max_len=60) if provincia_raw else None

        incluir_disponibilidad = opciones.get("disponibilidad", True) is not False
        try:
            dias_val = int(opciones.get("dias") or 0)
            dias_disponibilidad = dias_val if (0 < dias_val <= 30) else None
        except (TypeError, ValueError):
            dias_disponibilidad = None

        sedes_crudas = opciones.get("sedes") or []
        sedes = []
        for s in sedes_crudas:
            sanitizada = _sanitizar_texto_parametro(str(s), max_len=80)
            if sanitizada:
                sedes.append(sanitizada)
        sedes = sedes or None

        with update_lock:
            if update_running:
                self._responder_json(409, {"ok": False, "mensaje": "Ya hay una actualizacion en curso"})
                return
            update_running = True
        threading.Thread(
            target=_ejecutar_scraper_en_segundo_plano,
            args=(provincia, incluir_disponibilidad, dias_disponibilidad, sedes),
            daemon=True,
        ).start()
        self._responder_json(202, {"ok": True, "mensaje": "Actualizacion iniciada"})

    def _detener_actualizacion(self):
        global cancelacion_solicitada
        with update_lock:
            if not update_running or proceso_actual is None:
                self._responder_json(400, {"ok": False, "mensaje": "No hay ninguna actualizacion en curso"})
                return
            cancelacion_solicitada = True
            proceso_actual.terminate()
        self._responder_json(202, {"ok": True, "mensaje": "Cancelando actualizacion..."})


if __name__ == "__main__":
    # Si el servidor se reinicio a media actualizacion, el estado quedaria
    # colgado en en_progreso=True para siempre; lo limpiamos al arrancar.
    estado_previo = _leer_estado()
    if estado_previo.get("en_progreso"):
        _escribir_estado({
            "en_progreso": False,
            "finalizado": estado_previo.get("iniciado"),
            "error": "El servidor se reinicio antes de terminar la actualizacion anterior.",
        })

    port = int(os.environ.get("PORT", 8000))
    try:
        server = ThreadingHTTPServer(("0.0.0.0", port), AppHandler)
    except OSError as error:
        if error.errno in (98, 10048):  # puerto ocupado (Linux/Windows)
            print(
                f"ERROR: el puerto {port} ya esta en uso. Seguramente ya tienes "
                f"otra instancia de server.py corriendo (revisa otras pestañas de "
                f"terminal o sesiones de 'Run' en VS Code) y cierrala antes de "
                f"volver a ejecutar este archivo."
            )
            sys.exit(1)
        raise

    print(f"Proyecto: {PROJECT_ROOT}")
    print(f"Servidor corriendo en http://localhost:{port}/web/")
    server.serve_forever()
