# Domande con Risposta Numerica - Guida

## Nuova Funzionalità Aggiunta ✨

Ora UpQuiz supporta **domande con risposta numerica** oltre alle classiche domande a risposta multipla!

## Come Funziona

### Tolleranza di Errore
- Le risposte numeriche vengono valutate con una **tolleranza del ±5%**
- Esempio: se la risposta corretta è 100, sono accettate risposte tra 95 e 105

### Formato del File

#### Domanda a Risposta Multipla (formato classico)
```
Esercizio 1.
Qual è la capitale della Francia?
A) Roma
B) Parigi
C) Madrid
D) Berlino
Risposta: B
Commento: Parigi è la capitale della Francia.
```

#### Domanda con Risposta Numerica (nuovo formato)
```
Esercizio 2.
Quanto fa la radice quadrata di 144?
Risposta: 12
Commento: La radice quadrata di 144 è 12.
```

**Nota:** Per le domande numeriche **non è necessario** inserire le opzioni A, B, C, D.

### Caratteristiche

1. **Formato Flessibile:**
   - Supporta numeri interi: `100`
   - Supporta numeri decimali: `3.14` o `3,14`
   - Il sistema accetta sia il punto che la virgola come separatore decimale

2. **Validazione Automatica:**
   - Il parser riconosce automaticamente il tipo di domanda
   - Le domande senza opzioni A-D vengono trattate come numeriche
   - Le domande con opzioni vengono trattate come risposta multipla

3. **Tolleranza del 5%:**
   - Calcolo: `valore_corretto ± (valore_corretto × 0.05)`
   - Esempio con risposta corretta = 100:
     - Range accettato: 95 ≤ risposta ≤ 105
   - Esempio con risposta corretta = 50:
     - Range accettato: 47.5 ≤ risposta ≤ 52.5

4. **Interfaccia Utente:**
   - Domande multiple choice → Radio buttons
   - Domande numeriche → Campo di input testuale con indicazione della tolleranza

## File di Esempio

È stato creato un file di esempio `esempio_quiz_misto.txt` nella root del progetto che contiene:
- 5 domande a risposta multipla
- 5 domande con risposta numerica

Puoi usarlo per testare la nuova funzionalità!

## Modifiche Tecniche

### Backend
- **parser.py**: Riconosce e gestisce domande numeriche
- **validator.py**: Valida domande con risposte numeriche
- **quiz.py**: Implementa la logica di correzione con tolleranza del 5%

### Frontend
- **Quiz.jsx**: Mostra input numerico per domande numeriche
- **Result.jsx**: Visualizza i risultati con indicazione della tolleranza
- **FileFormatInfo.jsx**: Aggiornata la guida al formato
- **index.css**: Aggiunti stili per input e risultati numerici

## Esempi di Utilizzo

### Nel Frontend
Quando carichi un quiz con domande numeriche, vedrai:
- Un campo input al posto dei radio button
- L'indicazione "Your numeric answer (±5% tolerance)"

### Nei Risultati
Per ogni domanda numerica vedrai:
- La tua risposta
- La risposta corretta
- L'indicazione della tolleranza applicata (±5%)

## Test

Per testare la nuova funzionalità:
1. Avvia l'applicazione
2. Carica il file `esempio_quiz_misto.txt`
3. Prova a rispondere alle domande numeriche con valori leggermente diversi per vedere la tolleranza in azione

Esempio:
- Risposta corretta: 100
- Prova con: 98 → ✓ Corretto (entro il 5%)
- Prova con: 94 → ✗ Sbagliato (oltre il 5%)
