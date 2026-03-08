from fastapi import APIRouter, UploadFile, File, HTTPException, Header
from pydantic import BaseModel
from app.services.pdf_extractor import PDFExtractor
from app.services.llm_service import LLMService
from app.models.pdf_schema import ParsedExam, convert_to_quiz_format
import google.generativeai as genai

router = APIRouter(prefix="/pdf", tags=["PDF Parsing"])

# Security settings
MAX_PDF_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_TYPES = ["application/pdf"]


class ParsePDFResponse(BaseModel):
    """Response model for PDF parsing"""
    success: bool
    parsed_data: ParsedExam
    quiz_txt_format: str
    metadata: dict
    warnings: list[str] = []  # Warnings about incomplete or missing data


@router.post("/parse", response_model=ParsePDFResponse)
async def parse_pdf_to_quiz(
    file: UploadFile = File(...),
    gemini_api_key: str = Header(..., alias="X-Gemini-API-Key"),
    model_name: str = None  # Optional: specify model (default: gemini-flash-latest)
):
    """
    Parse a Moodle PDF exam and extract quiz questions using Gemini AI
    
    Args:
        file: PDF file to parse (max 10MB)
        gemini_api_key: User's Gemini API key (passed in header)
        model_name: Optional Gemini model name (default: gemini-2.0-flash - fastest)
                   Options: 'gemini-2.0-flash', 'gemini-flash-latest', 'gemini-pro-latest', 'gemini-2.5-flash'
        
    Returns:
        ParsePDFResponse: Parsed exam data and quiz format
        
    Raises:
        HTTPException: If parsing fails
    """
    
    # Validate file type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type. Only PDF files are allowed. Got: {file.content_type}"
        )
    
    # Check file size
    file_content = await file.read()
    await file.seek(0)
    
    if len(file_content) > MAX_PDF_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size: {MAX_PDF_SIZE / 1024 / 1024:.1f} MB"
        )
    
    try:
        # Step 1: Extract text from PDF
        pdf_extractor = PDFExtractor()
        extracted_text = pdf_extractor.extract_text_from_pdf(file.file)
        metadata = pdf_extractor.get_pdf_metadata(file.file)
        
        if not extracted_text or len(extracted_text.strip()) < 50:
            raise HTTPException(
                status_code=400,
                detail="Could not extract sufficient text from PDF. The file might be image-based or corrupted."
            )
        
        # Limit text length to avoid timeout (max ~30000 chars = ~7500 tokens)
        MAX_TEXT_LENGTH = 30000
        if len(extracted_text) > MAX_TEXT_LENGTH:
            extracted_text = extracted_text[:MAX_TEXT_LENGTH] + "\n\n[Text truncated due to length]"
        
        # Step 2: Parse with Gemini LLM
        llm_service = LLMService(api_key=gemini_api_key, model_name=model_name)
        parsed_exam = await llm_service.parse_with_retry(extracted_text, max_retries=2)
        
        if not parsed_exam.questions or len(parsed_exam.questions) == 0:
            raise HTTPException(
                status_code=400,
                detail="No questions were found in the PDF. Please check the file format."
            )
        
        # Step 3: Check data completeness and generate warnings
        completeness_warnings = parsed_exam.get_completeness_warnings()
        
        # Step 4: Convert to quiz .txt format
        quiz_txt = convert_to_quiz_format(parsed_exam)
        
        return ParsePDFResponse(
            success=True,
            parsed_data=parsed_exam,
            quiz_txt_format=quiz_txt,
            warnings=completeness_warnings,
            metadata={
                "filename": file.filename,
                "pages": metadata.get("pages", 0),
                "questions_found": len(parsed_exam.questions),
                "extracted_text_length": len(extracted_text),
                "has_metadata": bool(parsed_exam.student_name or parsed_exam.course_name),
                "incomplete_questions": len([q for q in parsed_exam.questions 
                    if (q.question_type == "multiple_choice" and not q.correct_answer_letter) 
                    or (q.question_type == "numeric" and q.correct_answer_numeric is None)])
            }
        )
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing PDF: {str(e)}"
        )


@router.post("/extract-text")
async def extract_text_only(file: UploadFile = File(...)):
    """
    Extract text from PDF without LLM parsing (for debugging)
    
    Args:
        file: PDF file
        
    Returns:
        dict: Extracted text and metadata
    """
    
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        pdf_extractor = PDFExtractor()
        extracted_text = pdf_extractor.extract_text_from_pdf(file.file)
        metadata = pdf_extractor.get_pdf_metadata(file.file)
        
        return {
            "success": True,
            "text": extracted_text,
            "metadata": metadata,
            "text_length": len(extracted_text)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test-api-key")
async def test_gemini_api_key(gemini_api_key: str = Header(..., alias="X-Gemini-API-Key")):
    """
    Test if the provided Gemini API key is valid
    
    Args:
        gemini_api_key: User's Gemini API key
        
    Returns:
        dict: Status and available models
    """
    
    try:
        llm_service = LLMService(api_key=gemini_api_key)
        
        # Try a simple generation to test the key
        test_response = llm_service.model.generate_content(
            "Say 'API key is valid' and nothing else.",
            generation_config=genai.types.GenerationConfig(
                temperature=0,
                max_output_tokens=10,
            )
        )
        
        # Extract text from response (handle complex response structure)
        response_text = ""
        try:
            # Try simple accessor first
            response_text = test_response.text
        except:
            # Fall back to parts accessor for complex responses
            if test_response.candidates and len(test_response.candidates) > 0:
                parts = test_response.candidates[0].content.parts
                if parts and len(parts) > 0:
                    response_text = parts[0].text
        
        return {
            "success": True,
            "message": "API key is valid",
            "model": llm_service.model_name,
            "test_response": response_text if response_text else "OK"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid API key or API error: {str(e)}"
        )
