import json
import os
import tempfile
from datetime import datetime, timezone


def guardar_json(peliculas, path="data/peliculas.json", metadata=None):
    """
    Guarda la lista de películas extraídas de forma atómica en un archivo JSON.
    Escribe primero en un archivo temporal en el mismo directorio y luego realiza
    un reemplazo atómico (os.replace) para evitar lecturas concurrentes corruptas.
    
    Args:
        peliculas (list): Lista de diccionarios que representan las películas.
        path (str): Ruta donde se guardará el archivo JSON. Por defecto 'data/peliculas.json'.
        metadata (dict, optional): Metadatos adicionales (ej. telemetría o estado de cadenas).
    """
    directorio = os.path.dirname(os.path.abspath(path))
    os.makedirs(directorio, exist_ok=True)

    payload = {
        "scraped_at": datetime.now(timezone.utc).astimezone().isoformat(),
        "peliculas": peliculas,
    }
    if metadata and isinstance(metadata, dict):
        payload.update(metadata)

    # Creamos el temporal en el mismo directorio para asegurar que esté en el mismo filesystem/partición
    temp_fd, temp_path = tempfile.mkstemp(dir=directorio, prefix="peliculas_", suffix=".tmp")
    try:
        with open(temp_fd, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        os.replace(temp_path, path)
    except Exception:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
        raise


def leer_json(path="data/peliculas.json", default=None):
    """
    Lee un archivo JSON de forma segura. Si el archivo no existe o está corrupto,
    devuelve el valor por defecto en lugar de romper el flujo.
    """
    if not os.path.exists(path):
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return default
