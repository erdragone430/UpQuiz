FROM python:3.11-slim

# Imposta variabili d'ambiente
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Dipendenze per PostgreSQL
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

# Copia e installa requisiti
COPY app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia il codice del backend mantenendo la struttura app/
COPY app/ ./app/

# Comando per avviare
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3000"]
