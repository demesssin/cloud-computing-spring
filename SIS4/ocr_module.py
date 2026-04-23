import pytesseract
from pdf2image import convert_from_bytes
from PIL import Image

def extract_text_from_image(file_stream):
    image = Image.open(file_stream)
    return pytesseract.image_to_string(image)

def process_pdf(file_stream):
    pdf_bytes = file_stream.read()
    images = convert_from_bytes(pdf_bytes, first_page=1, last_page=1)
    if images:
        return pytesseract.image_to_string(images[0])
    return "No text content found."
