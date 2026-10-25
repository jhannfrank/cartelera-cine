# Guía de Despliegue en la Nube y Automatización de Cartelera

Esta guía explica cómo desplegar **CineScope Perú** en la nube utilizando tu cuenta de Google, aclarando el alcance de tu suscripción **Google One AI** y brindándote las mejores alternativas de hosting gratuito o de mínimo costo.

---

## 1. Google One AI vs. Google Cloud Platform (GCP)

Es muy común confundir ambos servicios porque ambos usan la misma cuenta `@gmail.com`:

* **Google One AI Premium:**
  - Es una suscripción de almacenamiento y productividad para usuarios finales (2 TB en Google Drive, Fotos, Gmail y acceso al modelo Gemini Advanced en Google Docs/Sheets).
  - **No es un servicio de servidores:** Google Drive no puede ejecutar scripts de Python continuamente en segundo plano como un servidor web ni correr tareas programadas (*cron jobs*).
* **Google Cloud Platform (GCP):**
  - Es la infraestructura profesional para desarrolladores de Google.
  - **Ventaja:** Con tu misma cuenta de Google puedes ingresar a [console.cloud.google.com](https://console.cloud.google.com) y acceder al **Free Tier perpetuo de Google Cloud** (servicios 100% gratuitos para siempre) más **\$300 USD de crédito de bienvenida**.

---

## 2. Opciones Recomendadas de Despliegue

### Opción A: Google Cloud Run (La más recomendada en Google)
**Costo:** \$0.00 / mes (entra dentro de la capa gratuita perpetua: 2 millones de peticiones/mes gratis).

Cloud Run es la plataforma Serverless de Google. Si nadie entra a la web, se apaga (costo cero); cuando un usuario entra, se enciende en menos de 1 segundo.

#### Pasos para Desplegar:
1. Instala el SDK de Google Cloud en tu PC si no lo tienes ([cloud.google.com/sdk](https://cloud.google.com/sdk)).
2. Abre la terminal en esta carpeta y autentícate con tu cuenta de Google:
   ```bash
   gcloud auth login
   ```
3. Crea un proyecto en Google Cloud (o selecciona uno existente):
   ```bash
   gcloud projects create cinescope-peru-2026
   gcloud config set project cinescope-peru-2026
   ```
4. Despliega la aplicación directamente con 1 solo comando usando el `Dockerfile` ya preparado:
   ```bash
   gcloud run deploy cinescope-web --source . --region us-central1 --allow-unauthenticated
   ```
5. Google te entregará una URL HTTPS segura como:  
   `https://cinescope-web-xyz-uc.a.run.app/web/`

#### ¿Cómo se actualiza la cartelera en Cloud Run?
* **Manual:** Entras a la web y presionas el botón **"Actualizar datos"**. Tarda ~8 segundos.
* **Automática (Cloud Scheduler):** Creas una tarea programada gratuita en Google Cloud Scheduler que llame al endpoint cada mañana a las 7:00 AM:
  ```bash
  gcloud scheduler jobs create http actualizar-cartelera-diaria \
    --schedule="0 7 * * *" \
    --uri="https://cinescope-web-xyz-uc.a.run.app/api/actualizar" \
    --http-method=POST \
    --message-body='{"provincia": "", "sedes": [], "disponibilidad": false}' \
    --headers="Content-Type=application/json" \
    --time-zone="America/Lima"
  ```

---

### Opción B: GitHub Pages + GitHub Actions (100% Gratuito y sin registrar tarjeta)
Si quieres evitar configurar Google Cloud o no deseas registrar ninguna tarjeta de crédito, esta es la opción más popular y elegante del mundo open-source:

1. Subes tu proyecto a un repositorio en **GitHub**.
2. **GitHub Pages** aloja tu página web (`web/`) de forma gratuita con dominio `https://tu-usuario.github.io/cartelera/`.
3. Creas una tarea en **GitHub Actions** (`.github/workflows/scraper.yml`) que se ejecuta todos los días a las 6:00 AM:
   - Levanta una máquina virtual gratuita de GitHub.
   - Ejecuta `python main.py --sin-disponibilidad` (~8 segundos).
   - Hace commit automático del archivo `data/peliculas.json` actualizado.
   - La web se refresca sola sin que tengas que prender tu computadora ni pagar un solo centavo.

---

### Opción C: Máquina Virtual Gratuita de Google (GCP Compute Engine e2-micro)
Google Cloud regala **1 máquina virtual `e2-micro` para siempre** (1 GB de RAM, 30 GB de disco) en regiones de Estados Unidos (`us-central1` o `us-east1`):

1. Creas una instancia VM `e2-micro` con Ubuntu 22.04 / Debian.
2. Clonas este repositorio en la VM.
3. Instalas las dependencias: `pip install -r requirements.txt`.
4. Ejecutas el servidor como servicio en segundo plano con `systemd` o `pm2`:
   ```bash
   python server.py
   ```
5. En el crontab de Linux (`crontab -e`), agregas la sincronización automática:
   ```cron
   0 7,14 * * * cd /home/usuario/app && python3 main.py --sin-disponibilidad
   ```
