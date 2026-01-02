import re
import random

def parse_quiz_text(text: str):
    questions = []

    # Divide il testo in blocchi "Esercizio X."
    blocks = re.split(r"Esercizio\s+\d+\.", text)
    blocks = [b.strip() for b in blocks if b.strip()]

    for block in blocks:
        lines = [line.strip() for line in block.split("\n") if line.strip()]

        question = lines[0]
        options = []
        correct_letter = None
        comment = None

        for line in lines[1:]:
            if re.match(r"[A-D]\)", line):
                options.append(line[3:].strip())
            elif line.startswith("Risposta:"):
                correct_letter = line.replace("Risposta:", "").strip()
            elif line.startswith("Commento:"):
                comment = line.replace("Commento:", "").strip()

        # Validazione: salta se non ha risposta valida o opzioni
        if not correct_letter or correct_letter not in "ABCD" or len(options) == 0:
            continue
        
        correct_index = ord(correct_letter) - ord("A")

        # Shuffle delle opzioni
        indexed_options = list(enumerate(options))
        random.shuffle(indexed_options)

        new_options = []
        new_correct_index = None

        for new_index, (old_index, text_opt) in enumerate(indexed_options):
            new_options.append(text_opt)
            if old_index == correct_index:
                new_correct_index = new_index

        questions.append({
            "question": question,
            "options": new_options,
            "correct": new_correct_index,
            "comment": comment
        })

    # Shuffle delle domande
    random.shuffle(questions)

    return questions
