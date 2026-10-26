import json
import os
import sys
import tempfile
import threading
import time
from datetime import datetime, timezone

# Asegurar soporte de caracteres especiales en terminales Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ESTADO_PATH = os.path.join("data", "actualizacion_estado.json")
_lock = threading.Lock()
_ultimo_guardado = 0.0

_estado_global = {
    "en_progreso": False,
    "porcentaje": 0.0,
    "etapa": "",
    "iniciado": None,
    "actualizado": None,
    "finalizado": None,
    "cadenas": {},
}


def ahora_iso():
    return datetime.now(timezone.utc).astimezone().isoformat()


def _guardar_estado_atomico(forzar=False):
    global _ultimo_guardado
    ahora = time.time()
    # Limitar escritura en disco a intervalos de mínimo 120ms salvo que sea un hito forzado
    if not forzar and (ahora - _ultimo_guardado) < 0.12:
        return

    os.makedirs("data", exist_ok=True)
    _estado_global["actualizado"] = ahora_iso()
    
    # Escritura atómica mediante archivo temporal en el mismo directorio data/
    tmp_fd, tmp_path = tempfile.mkstemp(prefix="estado_", suffix=".tmp", dir="data")
    try:
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as f:
            json.dump(_estado_global, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, ESTADO_PATH)
        _ultimo_guardado = ahora
    except Exception:
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass


def escribir_progreso(porcentaje, etapa, **extra):
    """Mantiene compatibilidad hacia atrás con scripts existentes."""
    with _lock:
        _estado_global["en_progreso"] = True
        _estado_global["porcentaje"] = round(max(0.0, min(100.0, float(porcentaje))), 1)
        _estado_global["etapa"] = etapa
        _estado_global.update(extra)
        _guardar_estado_atomico(forzar=True)


def inicializar_monitoreo_cadenas(nombres_cadenas, iniciado_iso=None, etapa="Iniciando escaneo nacional"):
    """Prepara el monitor en vivo con todas las cadenas en estado inicial."""
    with _lock:
        inicio = iniciado_iso or ahora_iso()
        _estado_global["en_progreso"] = True
        _estado_global["porcentaje"] = 5.0
        _estado_global["etapa"] = etapa
        _estado_global["iniciado"] = inicio
        _estado_global["finalizado"] = None
        _estado_global["cadenas"] = {
            nombre: {
                "estado": "En cola...",
                "completados": 0,
                "total": 1,
                "detalle": "Esperando inicio",
                "tiempo_s": 0.0,
                "activo": False,
                "ok": None,
                "error": None,
                "peliculas": 0,
            }
            for nombre in nombres_cadenas
        }
        _guardar_estado_atomico(forzar=True)
    print(f"[{datetime.now().strftime('%H:%M:%S')}] 🚀 {etapa}", flush=True)


def registrar_progreso_cadena(
    nombre_cadena,
    etapa,
    completados=0,
    total=1,
    detalle="",
    tiempo_s=None,
    activo=True,
    ok=None,
    error=None,
    peliculas=None,
    sin_presencia=False,
    imprimir_consola=True,
):
    """
    Registra el avance en tiempo real de una cadena específica de forma thread-safe,
    calcula el porcentaje global ponderado y emite logs a consola y a data/actualizacion_estado.json.
    """
    with _lock:
        cadenas = _estado_global.setdefault("cadenas", {})
        cad = cadenas.setdefault(nombre_cadena, {})

        cad["estado"] = etapa
        cad["completados"] = completados
        cad["total"] = max(1, total)
        cad["detalle"] = detalle or f"{completados}/{total}"
        if tiempo_s is not None:
            cad["tiempo_s"] = round(float(tiempo_s), 2)
        cad["activo"] = activo
        if ok is not None:
            cad["ok"] = ok
        if error is not None:
            cad["error"] = error
        if peliculas is not None:
            cad["peliculas"] = peliculas
        if sin_presencia:
            cad["sin_presencia"] = True
            cad["activo"] = False
            cad["ok"] = True
            if peliculas is None:
                cad["peliculas"] = 0

        # Cálculo de porcentaje ponderado global:
        # 10% preparación + 85% progreso de cadenas + 5% unificación final
        if cadenas:
            sum_pct = 0.0
            for c_info in cadenas.values():
                if c_info.get("sin_presencia") or c_info.get("ok") is not None:
                    sum_pct += 1.0  # Si terminó (éxito, error u omitido por sin presencia), 100% de esa cadena
                else:
                    t = max(1, c_info.get("total", 1))
                    comp = min(t, max(0, c_info.get("completados", 0)))
                    sum_pct += (comp / t)
            promedio_cadenas = sum_pct / len(cadenas)
            nuevo_porcentaje = 10.0 + (promedio_cadenas * 85.0)
            _estado_global["porcentaje"] = round(max(_estado_global.get("porcentaje", 0.0), min(95.0, nuevo_porcentaje)), 1)

        # Actualizar etapa global
        activas = [nom for nom, c in cadenas.items() if c.get("activo")]
        if activas:
            _estado_global["etapa"] = f"Extrayendo: {', '.join(activas[:3])}" + ("..." if len(activas) > 3 else "")
        elif all(c.get("ok") is not None or c.get("sin_presencia") for c in cadenas.values()):
            _estado_global["etapa"] = "Unificando cartelera regional..."

        # Guardar en disco (forzar si finalizó, omitió o hubo error)
        hitos = (ok is not None) or sin_presencia or (completados == total) or (completados == 1)
        _guardar_estado_atomico(forzar=hitos)

    if imprimir_consola and hitos:
        tiempo_str = f" [{tiempo_s:.1f}s]" if tiempo_s is not None else ""
        hora_str = datetime.now().strftime("%H:%M:%S")
        if sin_presencia:
            print(f"[{hora_str}] 📍 [{nombre_cadena}] {etapa} ({detalle or 'Sin presencia territorial'})", flush=True)
        elif ok is True:
            pelis_str = f" ({peliculas} pelis)" if peliculas is not None else ""
            print(f"[{hora_str}] ✅ [{nombre_cadena}] {etapa}{pelis_str}{tiempo_str}", flush=True)
        elif ok is False or error:
            print(f"[{hora_str}] ❌ [{nombre_cadena}] Error: {error or etapa}{tiempo_str}", flush=True)
        else:
            print(f"[{hora_str}] ⏳ [{nombre_cadena}] {etapa} - {detalle}{tiempo_str}", flush=True)


def finalizar_monitoreo_cadenas(total_peliculas, error=None):
    """Marca la finalización de todo el proceso de scraping."""
    with _lock:
        _estado_global["en_progreso"] = False
        _estado_global["porcentaje"] = 100.0
        _estado_global["finalizado"] = ahora_iso()
        if error:
            _estado_global["error"] = str(error)
            _estado_global["etapa"] = f"Error en actualización: {error}"
        else:
            _estado_global["error"] = None
            _estado_global["etapa"] = f"Actualización finalizada con éxito ({total_peliculas} películas totales)"
        
        # Desactivar flags activas en cadenas
        for cad in _estado_global.get("cadenas", {}).values():
            cad["activo"] = False

        _guardar_estado_atomico(forzar=True)
    
    hora_str = datetime.now().strftime("%H:%M:%S")
    if error:
        print(f"[{hora_str}] ❌ Actualización finalizada con error: {error}", flush=True)
    else:
        print(f"[{hora_str}] 🎉 Actualización completada: {total_peliculas} películas unificadas.", flush=True)
