import json
import os
import sys
import tempfile
import unittest

# Aseguramos path del proyecto
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)

from app.storage import guardar_json, leer_json
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


if __name__ == "__main__":
    unittest.main()
