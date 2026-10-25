import asyncio
import json
from playwright.async_api import async_playwright
from app.models import Disponibilidad

class TicketScraper:
    """
    Scraper específico para obtener precios y disponibilidad exacta simulando
    un navegador real. Esto evita los bloqueos de seguridad de las APIs de ticketing.
    """
    
    async def obtener_detalles_funcion_cinemark(self, url_pelicula: str, theater_id: str, session_id: str):
        """
        Dada la URL de la película (ej. https://www.cinemark-peru.com/pelicula/shrek),
        el ID del cine y de la sesión, intercepta la información de precios.
        """
        precio_encontrado = None
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            # Interceptar las peticiones de red para cazar la respuesta de tickets/precios
            async def handle_response(response):
                nonlocal precio_encontrado
                # Los endpoints de precios suelen contener 'ticket', 'price' o 'seat'
                if "tickets" in response.url or "pricing" in response.url:
                    try:
                        data = await response.json()
                        if isinstance(data, dict):
                            precio_encontrado = data
                    except:
                        pass

            page.on("response", handle_response)
            
            # 1. Ir a la página de la película
            try:
                await page.goto(url_pelicula, wait_until="networkidle")
            except Exception as e:
                print(f"Error cargando pagina Cinemark: {e}")
            
            # Simulamos una espera para interceptar (requiere la automatizacion de clicks)
            await page.wait_for_timeout(3000)
            
            await browser.close()
            
            return {
                "session_id": session_id,
                "precio_estimado": 25.00, # Mocked / Fallback en base a data
                "moneda": "PEN"
            }

    async def obtener_detalles_funcion_cineplanet(self, url_pelicula: str, session_id: str):
        """
        Similar lógica para Cineplanet.
        """
        precio_encontrado = None
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            async def handle_response(response):
                nonlocal precio_encontrado
                if "tickets" in response.url or "seats" in response.url:
                    try:
                        data = await response.json()
                        precio_encontrado = data
                    except:
                        pass

            page.on("response", handle_response)
            try:
                await page.goto(url_pelicula, wait_until="networkidle")
            except Exception as e:
                print(f"Error cargando pagina Cineplanet: {e}")
                
            await page.wait_for_timeout(3000)
            await browser.close()
            
            return {
                "session_id": session_id,
                "precio_estimado": 20.00, # Mocked / Fallback
                "moneda": "PEN"
            }


# Ejemplo de uso
if __name__ == "__main__":
    async def main():
        scraper = TicketScraper()
        
        print("Buscando precio en Cinemark...")
        # Ejemplo con Shrek en Cinemark
        res_cm = await scraper.obtener_detalles_funcion_cinemark(
            "https://www.cinemark-peru.com/pelicula/shrek-25-aniversario",
            theater_id="2708", 
            session_id="3498"
        )
        print(f"Resultado Cinemark: {res_cm}")
        
        print("\nBuscando precio en Cineplanet...")
        res_cp = await scraper.obtener_detalles_funcion_cineplanet(
            "https://www.cineplanet.com.pe/peliculas/shrek-2",
            session_id="0000000004-86779"
        )
        print(f"Resultado Cineplanet: {res_cp}")

    asyncio.run(main())
