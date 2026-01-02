# Quiz App with Authentication

## Setup con Docker (Consigliato per Testing)

### 1. Avvia PostgreSQL con Docker
```bash
docker-compose up -d
```

Questo avvia PostgreSQL su `localhost:5432` con:
- User: `quiz_user`
- Password: `quiz_password`
- Database: `quiz_db`

### 2. Installa dipendenze
```bash
cd backend
source venv/bin/activate  # o venv\Scripts\activate su Windows
pip install -r app/requirements.txt
```

### 3. Avvia il backend
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 4. Avvia il frontend (in un altro terminale)
```bash
cd frontend
npm install  # se non già fatto
npm run dev
```

Accedi a `http://127.0.0.1:5173`

---

## API Endpoints

### Autenticazione

**Registrazione:**
```bash
POST /auth/register
Content-Type: application/json

{
  "username": "test_user",
  "password": "password123"
}
```

**Login:**
```bash
POST /auth/login
Content-Type: application/json

{
  "username": "test_user",
  "password": "password123"
}
```

Response:
```json
{
  "access_token": "token_here",
  "token_type": "bearer",
  "username": "test_user"
}
```

**Statistiche Utente:**
```bash
GET /auth/stats
Authorization: Bearer {access_token}
```

Response:
```json
{
  "username": "test_user",
  "total_quizzes": 5,
  "average_score": 18.5,
  "total_correct": 92,
  "total_wrong": 8,
  "total_unanswered": 0,
  "total_time_spent": 3600
}
```

### Quiz

**Upload Quiz:**
```bash
POST /quiz/simulate
Content-Type: multipart/form-data

file: quiz_file.txt
```

**Submit Quiz:**
```bash
POST /quiz/submit
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "questions": [...],
  "original_file_content": "...",
  "time_spent": 120
}
```

---

## Docker Commands

**Vedere lo stato:**
```bash
docker-compose ps
```

**Visualizzare i log:**
```bash
docker-compose logs -f postgres
```

**Fermare il database:**
```bash
docker-compose down
```

**Eliminare completamente (inclusi dati):**
```bash
docker-compose down -v
```

---

## Variabili di Ambiente (.env)

Configurate in `backend/.env`:
- `DATABASE_URL`: Stringa di connessione PostgreSQL
- `SECRET_KEY`: Chiave segreta per JWT (cambiare in produzione!)
- `DEBUG`: True/False

---

## Troubleshooting

**Errore: "postgres connection refused"**
- Verificare che Docker è in esecuzione: `docker ps`
- Riavviare il container: `docker-compose restart postgres`

**Errore: "port 5432 already in use"**
- Cambiare la porta in `docker-compose.yml`:
  ```yaml
  ports:
    - "5433:5432"  # Usa 5433 invece di 5432
  ```
- Aggiornare `DATABASE_URL` in `.env`:
  ```
  postgresql://quiz_user:quiz_password@localhost:5433/quiz_db
  ```

**Tabelle non create**
- Le tabelle si creano automaticamente al primo avvio
- Se serve reset: eliminare il volume con `docker-compose down -v` e riavviare
