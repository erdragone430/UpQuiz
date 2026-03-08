import pdfplumber
from io import BytesIO
from typing import BinaryIO


class PDFExtractor:
    """Service for extracting text from PDF files"""
    
    @staticmethod
    def extract_text_from_pdf(pdf_file: BinaryIO) -> str:
        """
        Extract text content from a PDF file
        
        Args:
            pdf_file: Binary file object (e.g., from FastAPI UploadFile)
            
        Returns:
            str: Extracted text content from all pages
            
        Raises:
            ValueError: If PDF extraction fails
        """
        try:
            # Read the PDF content
            pdf_bytes = pdf_file.read()
            
            # Reset file position for potential re-reading
            pdf_file.seek(0)
            
            # Use pdfplumber to extract text
            with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
                extracted_text = []
                
                for page_num, page in enumerate(pdf.pages, 1):
                    page_text = page.extract_text()
                    
                    if page_text:
                        extracted_text.append(f"--- Page {page_num} ---\n{page_text}")
                
                if not extracted_text:
                    raise ValueError("No text could be extracted from the PDF")
                
                full_text = "\n\n".join(extracted_text)
                return full_text
                
        except Exception as e:
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")
    
    @staticmethod
    def get_pdf_metadata(pdf_file: BinaryIO) -> dict:
        """
        Extract metadata from PDF
        
        Args:
            pdf_file: Binary file object
            
        Returns:
            dict: PDF metadata (pages, title, author, etc.)
        """
        try:
            pdf_bytes = pdf_file.read()
            pdf_file.seek(0)
            
            with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
                metadata = {
                    "pages": len(pdf.pages),
                    "metadata": pdf.metadata if pdf.metadata else {}
                }
                return metadata
                
        except Exception as e:
            return {"error": str(e)}
