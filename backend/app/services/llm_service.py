import json
import google.generativeai as genai
from typing import Optional
from app.models.pdf_schema import ParsedExam


SYSTEM_PROMPT = """You are a Universal Academic Document Parser specialized in extracting quiz questions from Moodle exam PDFs.

IMPORTANT: PDFs may be incomplete, truncated, or partially corrupted. Work with whatever data is available.

Your task is to:
1. **Context Detection** (OPTIONAL): Try to identify student details (name, ID, date) from the header
   - If missing or unclear, set these fields to null
   - Don't fail if metadata is not found

2. **Structural Mapping**: Locate questions by identifying patterns like:
   - "Domanda X" or "Question X" or numbered questions (1., 2., etc.)
   - "Punteggio ottenuto" or "Score" or "Points"
   - "La risposta corretta è" or "Correct answer is" or "Risposta corretta:"
   - Look for answer indicators like ✓, ✗, "Corretto", "Sbagliato"

3. **Mathematical Fidelity**: Convert all mathematical notations, formulas, and symbols into LaTeX format
   - Examples: $H(z)$, $\delta[n-1]$, $\frac{1}{2}$

4. **Question Type Detection**:
   - Multiple choice: Questions with 2-4 options (A, B, C, D or 1, 2, 3, 4)
   - Numeric: Questions expecting a numerical answer
   - If unclear, make your best guess based on context

5. **Partial Data Handling**:
   - If correct answer is not found, set it to null
   - If options are incomplete, include what you find
   - If question text is cut off, include what's available
   - Better to have partial data than no data

6. **Sign Awareness**: Capture numerical scores exactly, including negative values

OUTPUT FORMAT:
Return a JSON object following this schema:
{
  "student_name": "string or null (can be null if not found)",
  "student_id": "string or null (can be null if not found)",
  "exam_date": "string or null (can be null if not found)",
  "course_name": "string or null (can be null if not found)",
  "total_score": number or null (can be null if not found),
  "max_score": number or null (can be null if not found),
  "questions": [
    {
      "question_number": 1,
      "question_text": "The question text here (include even if partial)",
      "question_type": "multiple_choice" or "numeric",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"] or null,
      "correct_answer_letter": "A" or "B" or "C" or "D" or null (null if not found),
      "correct_answer_numeric": 42.5 or null (null if not found),
      "points": 1.0 or null (null if not found),
      "explanation": "Optional explanation" or null (null if not found)"
    }
  ]
}

CRITICAL RULES:
- For multiple_choice: provide options array (even if partial) and correct_answer_letter (if found)
- For numeric: provide correct_answer_numeric (if found)
- Include explanation/comments if available in the PDF
- Return ONLY valid JSON, no additional text
- ALWAYS include at least the questions array, even if other fields are null
- Don't fail if data is incomplete - extract what you can find
"""


class LLMService:
    """Service for parsing PDFs using Google Gemini"""
    
    def __init__(self, api_key: str, model_name: str = None):
        """
        Initialize with user's API key
        
        Args:
            api_key: User's Gemini API key
            model_name: Model to use. Defaults to 'gemini-2.0-flash' (fastest and most efficient)
                       Options: 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-pro-latest', 'gemini-2.5-flash'
        """
        genai.configure(api_key=api_key)
        
        # Use gemini-2.0-flash as default (fastest, best for large documents)
        if model_name is None:
            model_name = 'gemini-2.0-flash'
        
        try:
            self.model = genai.GenerativeModel(model_name)
            self.model_name = model_name
        except Exception as e:
            # Fallback to gemini-2.0-flash if specified model fails
            print(f"Failed to load model {model_name}: {e}. Falling back to gemini-2.0-flash")
            self.model = genai.GenerativeModel('gemini-2.0-flash')
            self.model_name = 'gemini-2.0-flash'
    
    async def parse_pdf_content(self, text_content: str) -> ParsedExam:
        """
        Parse PDF text content using Gemini and return structured data
        
        Args:
            text_content: Extracted text from PDF
            
        Returns:
            ParsedExam: Validated Pydantic model with parsed questions
            
        Raises:
            ValueError: If parsing fails or JSON is invalid
        """
        try:
            # Prepare the prompt
            user_prompt = f"""Parse the following Moodle exam document and extract all questions.

Document content:
{text_content}

Remember to return ONLY a valid JSON object following the schema provided in the system instructions."""
            
            # Call Gemini
            response = self.model.generate_content(
                f"{SYSTEM_PROMPT}\n\n{user_prompt}",
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,  # Low temperature for consistent output
                    top_p=0.8,
                    top_k=40,
                )
            )
            
            # Extract JSON from response (handle complex response structure)
            response_text = ""
            try:
                # Try simple accessor first
                response_text = response.text.strip()
            except:
                # Fall back to parts accessor for complex responses
                if response.candidates and len(response.candidates) > 0:
                    parts = response.candidates[0].content.parts
                    if parts and len(parts) > 0:
                        response_text = parts[0].text.strip()
            
            if not response_text:
                raise ValueError("Empty response from Gemini API")
            
            # Remove markdown code blocks if present
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            elif response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()
            
            # Parse JSON
            parsed_json = json.loads(response_text)
            
            # Validate with Pydantic
            parsed_exam = ParsedExam(**parsed_json)
            
            return parsed_exam
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse LLM response as JSON: {str(e)}\nResponse: {response_text[:500]}")
        except Exception as e:
            raise ValueError(f"Error during LLM parsing: {str(e)}")
    
    async def parse_with_retry(self, text_content: str, max_retries: int = 3) -> ParsedExam:
        """
        Parse with automatic retry on failure
        
        Args:
            text_content: Extracted text from PDF
            max_retries: Maximum number of retry attempts
            
        Returns:
            ParsedExam: Validated parsed exam
            
        Raises:
            ValueError: If all retries fail
        """
        last_error = None
        
        for attempt in range(max_retries):
            try:
                return await self.parse_pdf_content(text_content)
            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    print(f"Attempt {attempt + 1} failed: {e}. Retrying...")
                    continue
                else:
                    raise ValueError(f"Failed after {max_retries} attempts. Last error: {str(last_error)}")
