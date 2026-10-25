# Imagen base oficial y liviana de Python
FROM python:3.12-slim

# Evitar escritura de bytecode en disco y forzar stdout sin buffer
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Directorio de trabajo en el contenedor
WORKDIR /app

# Copiar dependencias e instalarlas
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fuente y assets
COPY app/ ./app/
COPY data/ ./data/
COPY web/ ./web/
COPY main.py server.py ./

# Exponer puerto configurado
EXPOSE 8000

# Ejecutar el servidor web nativo
CMD ["python", "server.py"]
