from app.pipeline import extract_pdf, extract_questions
def test_missing_pdf_returns_error():
    result=list(extract_pdf("does-not-exist.pdf")); assert result[0]["kind"]=="error"


def test_extracts_questions_and_options():
    result = extract_questions("1. Which color?\nA. Blue\nB. Green\n\n2) Which shape?\nA) Circle")
    assert result == [
        {"number": 1, "prompt": "Which color? A. Blue B. Green", "options": [{"label": "A", "text": "Blue"}, {"label": "B", "text": "Green"}]},
        {"number": 2, "prompt": "Which shape? A) Circle", "options": [{"label": "A", "text": "Circle"}]},
    ]
