import re

def validate_quiz_file(text: str):
    """
    Validates the quiz file and returns detailed errors/warnings
    """
    errors = []
    warnings = []
    
    if not text or not text.strip():
        errors.append("Empty file")
        return errors, warnings
    
    blocks = re.split(r"Esercizio\s+\d+\.", text)
    blocks = [b.strip() for b in blocks if b.strip()]
    
    if not blocks:
        errors.append("No exercise found. Expected format: 'Esercizio 1.'")
        return errors, warnings
    
    for exercise_num, block in enumerate(blocks, 1):
        lines = [line.strip() for line in block.split("\n") if line.strip()]
        
        if not lines:
            errors.append(f"Exercise {exercise_num}: empty block")
            continue
        
        question = lines[0]
        if len(question) < 3:
            warnings.append(f"Exercise {exercise_num}: question too short")
        
        options = [line for line in lines[1:] if re.match(r"[A-D]\)", line)]
        if len(options) == 0:
            errors.append(f"Exercise {exercise_num}: no options A-D found")
        elif len(options) < 2:
            warnings.append(f"Exercise {exercise_num}: less than 2 options")
        
        risposta_lines = [line for line in lines if line.startswith("Risposta:")]
        if not risposta_lines:
            errors.append(f"Exercise {exercise_num}: missing 'Risposta:'")
        else:
            risposta = risposta_lines[0].replace("Risposta:", "").strip()
            if risposta not in "ABCD":
                errors.append(f"Exercise {exercise_num}: Answer '{risposta}' is invalid (must be A, B, C or D)")
    
    return errors, warnings
