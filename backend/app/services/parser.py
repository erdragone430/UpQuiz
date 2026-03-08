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
        correct_answer = None
        comment = None

        for line in lines[1:]:
            if re.match(r"[A-D]\)", line):
                options.append(line[3:].strip())
            elif line.startswith("Risposta:"):
                correct_answer = line.replace("Risposta:", "").strip()
            elif line.startswith("Commento:"):
                comment = line.replace("Commento:", "").strip()

        # Determina il tipo di domanda
        if len(options) > 0:
            # Domanda a risposta multipla
            if not correct_answer or correct_answer not in "ABCD":
                continue
            
            correct_index = ord(correct_answer) - ord("A")

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
                "type": "multiple_choice",
                "options": new_options,
                "correct": new_correct_index,
                "comment": comment
            })
        else:
            # Domanda numerica
            if not correct_answer:
                continue
            
            # Prova a convertire in numero
            try:
                numeric_value = float(correct_answer.replace(",", "."))
                questions.append({
                    "question": question,
                    "type": "numeric",
                    "correct_value": numeric_value,
                    "comment": comment
                })
            except ValueError:
                # Non è un numero valido, salta la domanda
                continue

    # Shuffle delle domande
    random.shuffle(questions)

    return questions
