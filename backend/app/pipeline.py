"""PDF/OCR extraction with lightweight question and option detection."""
import re


QUESTION_START = re.compile(r"(?im)^\s*(?:question\s*)?(\d+)[.)]\s+(.+?)(?=\n\s*(?:question\s*)?\d+[.)]\s+|\Z)", re.S)
OPTION_LINE = re.compile(r"(?im)^\s*([A-H])[\.)]\s+(.+?)\s*(?=\n|$)")


def extract_questions(text: str) -> list[dict]:
    questions = []
    for match in QUESTION_START.finditer(text):
        prompt = re.sub(r"\s+", " ", match.group(2)).strip()
        options = [{"label": label.upper(), "text": value.strip()} for label, value in OPTION_LINE.findall(match.group(2))]
        if prompt:
            questions.append({"number": int(match.group(1)), "prompt": prompt, "options": options})
    return questions


def extract_pdf(path):
    try:
        import fitz
        from PIL import Image
        doc=fitz.open(path); text="\n".join(p.get_text() for p in doc)
        if not text.strip():
            try:
                import pytesseract
                def ocr_page(page):
                    pix = page.get_pixmap()
                    image = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    return pytesseract.image_to_string(image)
                text="\n".join(ocr_page(p) for p in doc)
            except Exception: pass
        yield {"kind":"full_text","value":{"text":text[:100000]},"confidence":90 if text else 10}
        questions = extract_questions(text)
        if questions:
            yield {"kind":"questions","value":{"items":questions,"count":len(questions)},"confidence":78}
        yield {"kind":"metadata","value":{"pages":len(doc),"characters":len(text),"questions_detected":len(questions)},"confidence":95}
    except Exception as exc:
        yield {"kind":"error","value":{"message":str(exc)},"confidence":0}
