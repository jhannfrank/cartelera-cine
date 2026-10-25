# La Opción Definitiva de CERO SOLES (GitHub Pages + Actions)

Para tu caso de uso (consultar la cartelera cada vez que quieras ir al cine sin gastar un solo centavo), **esta es la opción número 1 recomendada**:

---

## ¿Por qué esta opción es CERO SOLES garantizado?
1. **No te pide tarjeta de crédito ni débito:** Jamás habrá sorpresas ni cobros inesperados.
2. **Alojamiento web gratuito de por vida (GitHub Pages):** Tu web estará disponible en un enlace público como `https://tu-usuario.github.io/cartelera/` que puedes abrir en tu celular, tablet o PC desde cualquier lugar.
3. **Actualización automática gratuita (GitHub Actions):** GitHub te regala **2,000 minutos gratis de servidores al mes**. Como el scraper optimizado demora solo **8 segundos**, usarlo dos veces al día consume apenas **8 minutos al mes** (el 0.4% de lo que te regalan).

---

## Pasos para activarlo (en 3 minutos)

### Paso 1: Crea un repositorio en GitHub
1. Entra a [github.com](https://github.com) e inicia sesión (o crea tu cuenta gratis).
2. Haz clic en **"New Repository"**.
3. Ponle de nombre `cartelera-cine` y déjalo como **Público**.
4. Haz clic en **Create repository**.

### Paso 2: Sube tu proyecto
En la terminal de tu computadora (dentro de esta carpeta), ejecuta:
```bash
git init
git add .
git commit -m "Mi cartelera nacional multacadena lista"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/cartelera-cine.git
git push -u origin main
```
*(Reemplaza `TU-USUARIO` por tu nombre de usuario en GitHub).*

### Paso 3: Activa tu web gratuita
1. En tu repositorio de GitHub, ve a **Settings** (pestaña superior derecha).
2. En el menú izquierdo, haz clic en **Pages**.
3. En **Branch**, selecciona `main` y la carpeta `/(root)`, luego haz clic en **Save**.
4. ¡Listo! En 1 minuto, GitHub te dará tu enlace oficial:
   `https://tu-usuario.github.io/cartelera-cine/`

---

## ¿Cómo se actualiza la cartelera?
* **Automático:** Ya dejé configurado el archivo `.github/workflows/actualizar_cartelera.yml`. Se ejecutará solo todos los días a las 6:00 AM y a las 2:00 PM.
* **Manual cuando quieras ir al cine:**
  1. Abres GitHub desde tu celular o computadora.
  2. Vas a la pestaña **Actions** de tu repositorio.
  3. Haces clic en **Actualizar Cartelera Nacional** y luego en el botón **"Run workflow"**.
  4. En 15 segundos la cartelera estará 100% fresca para que elijas tu película.
