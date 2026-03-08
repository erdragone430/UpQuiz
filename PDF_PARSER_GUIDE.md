# PDF Quiz Parser - Setup & Usage Guide

## 🚀 Nuova Funzionalità: Parse PDF con AI

Ora puoi caricare direttamente PDF di esami Moodle e l'AI estrarrà automaticamente le domande!

## 📋 Installazione Dipendenze Backend

```bash
cd backend
pip install -r app/requirements.txt
```

Nuove dipendenze aggiunte:
- `pdfplumber==0.11.0` - Estrazione testo da PDF
- `google-generativeai==0.3.2` - API Gemini per parsing AI

## 🔑 API Key Setup (BYOK - Bring Your Own Key)

L'applicazione usa il modello **"Bring Your Own Key"**: ogni utente fornisce la propria chiave API Gemini.

### Come ottenere una Gemini API Key (GRATIS):

1. Vai su [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Accedi con il tuo account Google
3. Clicca "Create API Key"  
4. Copia la chiave (formato: `AIzaSy...`)

### Free Tier Limits (più che sufficienti!):
- ✅ 15 richieste al minuto
- ✅ 1 milione di token al giorno
- ✅ 1500 richieste al giorno

## 🎯 Come Usare

### 1. Avvia il Backend
```bash
cd backend
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Avvia il Frontend
```bash
cd frontend
npm run dev
```

### 3. Nell'interfaccia Quiz:
1. **Seleziona tab "🤖 Parse PDF with AI"**
2. **Upload il PDF** di un esame Moodle
3. **Inserisci la tua Gemini API Key**
4. **Clicca "Parse PDF with AI"**
5. Attendi 10-30 secondi (dipende dalla dimensione)
6. **Rivedi le domande** parsed nella preview
7. Clicca **"Use This Quiz"** per iniziare il quiz!

## 📄 Formato PDF Supportato

### Cosa funziona:
✅ PDF di esami Moodle (vecchi e nuovi layout)  
✅ Domande a risposta multipla (A, B, C, D)  
✅ Domande numeriche  
✅ Formule matematiche (vengono convertite in LaTeX)  
✅ PDF parzialmente tagliati o incompleti  

### Limitazioni:
⚠️ PDF image-based (scannerizzati) potrebbero non funzionare bene  
⚠️ Massimo 10MB per file  
⚠️ Se il PDF è molto complesso, potrebbe richiedere 2-3 tentativi  

## 🔧 Architettura

```
User Upload PDF + API Key
         ↓
Frontend (React)
         ↓
Backend FastAPI: /api/pdf/parse
         ↓
1. pdfplumber → Estrae testo
2. Gemini AI → Analizza e struttura
3. Pydantic → Valida JSON
4. Converte → Formato .txt quiz
         ↓
Quiz Engine (formato esistente)
```

## 📊 Gestione Dati Incompleti

Il sistema è robusto e gestisce PDF incompleti:

- ✅ **Metadata opzionali**: Nome studente, corso, data (se non trovati → null)
- ✅ **Risposte mancanti**: Se non trova la risposta corretta, inserisce placeholder con warning
- ✅ **Opzioni incomplete**: Funziona anche con 2-3 opzioni invece di 4
- ✅ **Warnings dettagliati**: Ti avvisa di cosa manca nel PDF

Esempio warning:
```
⚠️ Warnings:
- Student name not found in PDF
- Question 5: correct answer not found
- Question 8: missing or incomplete options
```

Puoi comunque usare il quiz, ma potresti dover correggere manualmente alcune domande.

## 🧪 Testing

### Test Manuale Rapido:

1. **Test estrazione testo** (senza AI):
```bash
curl -X POST "http://127.0.0.1:8000/api/pdf/extract-text" \
  -F "file=@test_exam.pdf"
```

2. **Test parsing completo**:
```bash
curl -X POST "http://127.0.0.1:8000/api/pdf/parse" \
  -H "X-Gemini-API-Key: YOUR_KEY_HERE" \
  -F "file=@test_exam.pdf"
```

## 📁 File Struttura

```
backend/app/
├── models/
│   └── pdf_schema.py          # Schema Pydantic (ParsedExam, ParsedQuestion)
├── services/
│   ├── pdf_extractor.py       # Estrazione testo con pdfplumber
│   └── llm_service.py         # Parsing con Gemini AI
└── routes/
    └── pdf_parser.py          # Endpoint FastAPI

frontend/src/components/
├── PDFUpload.jsx              # Componente upload PDF standalone
└── Quiz.jsx                   # Integrazione tabs (txt/pdf)
```

## 🔐 Sicurezza & Privacy

### API Key:
- ✅ Mai salvata sul backend
- ✅ Passata solo via HTTP header (`X-Gemini-API-Key`)
- ✅ Inviata direttamente da browser a Google
- ✅ Non loggata o memorizzata
- ✅ Storage opzionale in localStorage (solo frontend)

### PDF:
- ✅ Processato in memoria (non salvato su disco)
- ✅ Limite 10MB
- ✅ Solo formato PDF accettato
- ✅ Validazione contenuto

## 🐛 Troubleshooting

### Problema: "No text could be extracted"
**Soluzione**: Il PDF potrebbe essere image-based. Prova con un PDF testuale.

### Problema: "Failed to parse LLM response"
**Soluzione**: Riprova (max 3 retry automatici). A volte Gemini restituisce formato non valido.

### Problema: "Invalid API key"
**Soluzione**: 
1. Verifica la chiave su [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Assicurati di non avere spazi prima/dopo quando la incolli

### Problema: "No questions found"
**Soluzione**: Il PDF potrebbe avere un formato non standard. Prova il debug endpoint:
```bash
curl -X POST "http://127.0.0.1:8000/api/pdf/extract-text" \
  -F "file=@tuo_pdf.pdf"
```
Controlla se il testo estratto è leggibile.

## 🚀 Prossimi Miglioramenti (Opzionali)

- [ ] Supporto Docling per formule matematiche complesse
- [ ] Supporto OpenAI come alternativa a Gemini
- [ ] Cache dei parsing per PDF già processati
- [ ] Editing inline delle domande parsed
- [ ] Batch processing (multipli PDF)
- [ ] Export in altri formati (JSON, CSV)

## 💡 Consigli d'Uso

1. **Inizia con PDF semplici** per testare il sistema
2. **Controlla sempre la preview** prima di usare il quiz
3. **Salva come .txt** i quiz ben parsed per riutilizzarli
4. **Usa la tua API key personale** per rate limits dedicati
5. **Se un PDF fallisce, prova a semplificarlo** (es. stampa solo le domande)

## 📝 Esempio Output JSON

```json
{
  "success": true,
  "parsed_data": {
    "student_name": "Mario Rossi",
    "course_name": "Elettronica Digitale",
    "questions": [
      {
        "question_number": 1,
        "question_text": "Qual è la capitale d'Italia?",
        "question_type": "multiple_choice",
        "options": ["Roma", "Milano", "Napoli", "Torino"],
        "correct_answer_letter": "A"
      }
    ]
  },
  "quiz_txt_format": "Esercizio 1.\nQual è la capitale d'Italia?\nA) Roma\n...",
  "warnings": [],
  "metadata": {
    "filename": "exam.pdf",
    "pages": 3,
    "questions_found": 15
  }
}
```

## 📞 Supporto

Per problemi o domande:
1. Controlla i warnings nel response
2. Testa con l'endpoint `/extract-text` per debug
3. Verifica che il PDF sia testuale (non scannerizzato)
4. Prova con un PDF diverso per escludere problemi specifici

---

**Enjoy! 🎉** Ora puoi convertire i tuoi esami Moodle in quiz interattivi in pochi secondi!
