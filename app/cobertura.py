import json
import os
import unicodedata
from typing import Dict, List, Optional, Set, Tuple

UBICACIONES_PATH = os.path.join("data", "ubicaciones.json")


def normalizar_texto(texto: Optional[str]) -> str:
    """Normaliza cadenas eliminando tildes, diacríticos y espacios sobrantes para comparación robusta."""
    if not texto:
        return ""
    texto = texto.strip().lower()
    return "".join(
        c for c in unicodedata.normalize("NFD", texto)
        if unicodedata.category(c) != "Mn"
    )


def cargar_catalogo_ubicaciones(ruta: str = UBICACIONES_PATH) -> Tuple[List[str], List[dict]]:
    """Carga la lista oficial de ciudades y sedes desde data/ubicaciones.json."""
    if not os.path.exists(ruta):
        return [], []
    try:
        with open(ruta, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("ciudades", []), data.get("sedes", [])
    except Exception:
        return [], []


def analizar_presencia_territorial(
    ciudad: Optional[str] = None,
    sedes_filtro: Optional[List[str]] = None,
    ruta_ubicaciones: str = UBICACIONES_PATH,
) -> dict:
    """
    Determina qué cadenas tienen presencia física en la ciudad/sedes seleccionadas
    y cuáles deben omitirse.
    
    Retorna un diccionario con:
    - cadenas_activas: set de nombres de cadenas con sedes reales en esa selección.
    - cadenas_omitidas: set de nombres de cadenas que NO operan en esa selección.
    - sedes_disponibles: lista de sedes que coinciden con el filtro.
    - sedes_por_cadena: dict con el conteo de sedes por cadena.
    - detalle_omision: dict indicando el motivo de omisión por cadena.
    """
    ciudades_cat, sedes_cat = cargar_catalogo_ubicaciones(ruta_ubicaciones)
    todas_cadenas = {"Cineplanet", "Cinemark", "Cinépolis", "Cine Star", "Movie Time", "UVK"}

    # Si no hay filtros territoriales (alcance nacional completo), todas las cadenas están activas
    if not ciudad and not sedes_filtro:
        conteo = {}
        for s in sedes_cat:
            cad = s.get("cadena")
            if cad:
                conteo[cad] = conteo.get(cad, 0) + 1
        return {
            "nacional": True,
            "ciudad": None,
            "cadenas_activas": todas_cadenas,
            "cadenas_omitidas": set(),
            "sedes_disponibles": sedes_cat,
            "sedes_por_cadena": conteo,
            "detalle_omision": {},
        }

    ciudad_norm = normalizar_texto(ciudad) if ciudad else None
    sedes_filtro_norm = {normalizar_texto(s) for s in (sedes_filtro or [])}

    sedes_coincidentes = []
    for s in sedes_cat:
        s_ciudad_norm = normalizar_texto(s.get("ciudad", ""))
        s_nombre_norm = normalizar_texto(s.get("nombre", ""))

        # Casos especiales de área metropolitana: Lima incluye sedes de Callao
        coincide_ciudad = True
        if ciudad_norm:
            if ciudad_norm == "lima":
                coincide_ciudad = s_ciudad_norm in ("lima", "callao")
            else:
                coincide_ciudad = (s_ciudad_norm == ciudad_norm)

        coincide_sede = True
        if sedes_filtro_norm:
            coincide_sede = s_nombre_norm in sedes_filtro_norm or any(sf in s_nombre_norm for sf in sedes_filtro_norm)

        if coincide_ciudad and coincide_sede:
            sedes_coincidentes.append(s)

    cadenas_activas = {s["cadena"] for s in sedes_coincidentes if s.get("cadena")}
    cadenas_omitidas = todas_cadenas - cadenas_activas

    conteo = {}
    for s in sedes_coincidentes:
        cad = s.get("cadena")
        if cad:
            conteo[cad] = conteo.get(cad, 0) + 1

    nombre_ambito = ciudad if ciudad else "la selección de sedes"
    detalle_omision = {
        cad: f"Sin sedes físicas en {nombre_ambito}"
        for cad in cadenas_omitidas
    }

    return {
        "nacional": False,
        "ciudad": ciudad,
        "cadenas_activas": cadenas_activas,
        "cadenas_omitidas": cadenas_omitidas,
        "sedes_disponibles": sedes_coincidentes,
        "sedes_por_cadena": conteo,
        "detalle_omision": detalle_omision,
    }
