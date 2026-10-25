import json
import os
from datetime import datetime, timezone

ESTADO_PATH = os.path.join("data", "actualizacion_estado.json")


def ahora_iso():
    return datetime.now(timezone.utc).astimezone().isoformat()


def escribir_progreso(porcentaje, etapa, **extra):
    estado = {
        "en_progreso": True,
        "porcentaje": round(max(0, min(100, porcentaje)), 1),
        "etapa": etapa,
        "actualizado": ahora_iso(),
    }
    estado.update(extra)
    os.makedirs("data", exist_ok=True)
    with open(ESTADO_PATH, "w", encoding="utf-8") as f:
        json.dump(estado, f, ensure_ascii=False, indent=2)
