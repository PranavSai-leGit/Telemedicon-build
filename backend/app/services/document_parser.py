import hashlib
import os
import fitz  # PyMuPDF
from PIL import Image
from typing import List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

def calculate_sha256(file_path: str) -> str:
    """Compute SHA-256 hash of a file for exact duplicate detection."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(65536), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def extract_text_from_pdf(file_path: str) -> Tuple[str, List[Tuple[int, str]]]:
    """
    Extract text from a PDF file using PyMuPDF.
    Returns (full_text, [(page_number, page_text)]).
    """
    full_text_parts = []
    page_texts = []
    try:
        doc = fitz.open(file_path)
        for page_idx in range(len(doc)):
            page_num = page_idx + 1
            page = doc[page_idx]
            text = page.get_text("text").strip()
            if text:
                full_text_parts.append(text)
                page_texts.append((page_num, text))
            else:
                page_texts.append((page_num, ""))
        doc.close()
    except Exception as e:
        logger.warning(f"PyMuPDF error extracting text from {file_path}: {e}")
        return "", []

    return "\n\n".join(full_text_parts), page_texts

def extract_text_from_image(file_path: str) -> Tuple[str, List[Tuple[int, str]]]:
    """
    Attempt OCR on image file if pytesseract is installed and configured,
    otherwise fallback gracefully without crashing.
    """
    try:
        import pytesseract
        image = Image.open(file_path)
        text = pytesseract.image_to_string(image).strip()
        if text:
            return text, [(1, text)]
    except Exception as e:
        logger.info(f"Tesseract OCR not configured or failed for {file_path}: {e}")

    # Fallback: Image preserved for human review / manual entry
    return "", [(1, "[Image document preserved. OCR unavailable; manual review available.]")]

def extract_document_content(file_path: str, mime_type: str) -> Tuple[str, List[Tuple[int, str]]]:
    """
    Unified entry point for document text extraction.
    Never crashes the application on bad files.
    """
    if "pdf" in mime_type.lower() or file_path.lower().endswith(".pdf"):
        text, pages = extract_text_from_pdf(file_path)
        if text:
            return text, pages
        # If PDF was scanned and had no direct text, try OCR on rendered pages if needed
        return text, pages
    elif any(img_type in mime_type.lower() for img_type in ["image", "png", "jpeg", "jpg"]) or any(file_path.lower().endswith(ext) for ext in [".png", ".jpg", ".jpeg"]):
        return extract_text_from_image(file_path)
    else:
        return "", []
