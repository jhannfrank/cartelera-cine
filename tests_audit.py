import json
import os
import sys
import tempfile
import unittest

# Aseguramos path del proyecto
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)

from app.storage import guardar_json, leer_json
from app.progreso import (
    inicializar_monitoreo_cadenas,
    registrar_progreso_cadena,
    finalizar_monitoreo_cadenas,
    ESTADO_PATH,
)
from server import _sanitizar_texto_parametro


class TestAuditoriaSeguridadYData(unittest.TestCase):
    def test_sanitizacion_flags(self):
        # Flags inyectadas deben ser rechazadas
        self.assertIsNone(_sanitizar_texto_parametro("--sin-disponibilidad"))
        self.assertIsNone(_sanitizar_texto_parametro("-v"))
        self.assertIsNone(_sanitizar_texto_parametro("--sede=hack"))
        self.assertIsNone(_sanitizar_texto_parametro("Sede; rm -rf /"))
        self.assertIsNone(_sanitizar_texto_parametro("Sede && ls"))
        
        # Nombres válidos deben permitirse y recortarse a longitud segura
        self.assertEqual(_sanitizar_texto_parametro("Lima"), "Lima")
        self.assertEqual(_sanitizar_texto_parametro("Cineplanet Alcázar"), "Cineplanet Alcázar")
        self.assertEqual(_sanitizar_texto_parametro("Cinépolis Plaza Norte (Sala 1)"), "Cinépolis Plaza Norte (Sala 1)")
        self.assertEqual(_sanitizar_texto_parametro("Arequipa - Real Plaza"), "Arequipa - Real Plaza")

    def test_guardado_atomico(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            test_path = os.path.join(tmpdir, "data", "test_peliculas.json")
            peliculas_mock = [
                {"titulo": "Película 1", "cadena": "Cineplanet"},
                {"titulo": "Película 2", "cadena": "Cinemark"},
            ]
            guardar_json(peliculas_mock, path=test_path, metadata={"estado_cadenas": {"ok": True}})
            
            self.assertTrue(os.path.exists(test_path))
            datos = leer_json(test_path)
            self.assertIsNotNone(datos)
            self.assertEqual(len(datos["peliculas"]), 2)
            self.assertTrue(datos["estado_cadenas"]["ok"])
            self.assertIn("scraped_at", datos)

    def test_leer_json_archivo_inexistente_o_corrupto(self):
        self.assertIsNone(leer_json("ruta_que_no_existe_12345.json"))
        with tempfile.TemporaryDirectory() as tmpdir:
            bad_path = os.path.join(tmpdir, "bad.json")
            with open(bad_path, "w", encoding="utf-8") as f:
                f.write("{ json truncado...")
            # Debe retornar None de manera segura sin crash
            self.assertIsNone(leer_json(bad_path))

    def test_monitoreo_progreso_concurrente_thread_safe(self):
        import concurrent.futures
        cadenas_test = ["Cinépolis", "Cinemark", "Cine Star", "Movie Time", "UVK", "Cineplanet"]
        inicializar_monitoreo_cadenas(cadenas_test, etapa="Prueba concurrente")
        
        def simular_cadena(nombre):
            for i in range(1, 11):
                registrar_progreso_cadena(
                    nombre,
                    f"Etapa {i}",
                    completados=i,
                    total=10,
                    detalle=f"{i}/10 pasos",
                    tiempo_s=0.1 * i,
                    activo=(i < 10),
                    ok=(True if i == 10 else None),
                    peliculas=(20 if i == 10 else None),
                    imprimir_consola=False,
                )

        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
            list(ex.map(simular_cadena, cadenas_test))

        finalizar_monitoreo_cadenas(120)

        # Verificar que el archivo generado sea JSON válido y consistente
        self.assertTrue(os.path.exists(ESTADO_PATH))
        with open(ESTADO_PATH, "r", encoding="utf-8") as f:
            datos = json.load(f)

        self.assertFalse(datos["en_progreso"])
        self.assertEqual(datos["porcentaje"], 100.0)
        self.assertIn("cadenas", datos)
        self.assertEqual(len(datos["cadenas"]), 6)
        for c_nom in cadenas_test:
            self.assertIn(c_nom, datos["cadenas"])
            self.assertTrue(datos["cadenas"][c_nom]["ok"])
            self.assertEqual(datos["cadenas"][c_nom]["completados"], 10)
            self.assertEqual(datos["cadenas"][c_nom]["peliculas"], 20)


if __name__ == "__main__":
    unittest.main()
