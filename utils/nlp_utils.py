# utils/nlp_utils.py
import spacy
from typing import List
import logging

logger = logging.getLogger(__name__)

try:
    nlp = spacy.load("en_core_web_sm")
    SPACY_AVAILABLE = True
except IOError:
    logger.warning("Spacy model 'en_core_web_sm' not found. NLP functions will be limited.")
    SPACY_AVAILABLE = False

def extract_key_phrases(text: str) -> List[str]:
    if not SPACY_AVAILABLE:
        return []
    doc = nlp(text)
    return [chunk.text for chunk in doc.noun_chunks]

def calculate_text_similarity(text1: str, text2: str) -> float:
    if not SPACY_AVAILABLE:
        return 0.0
    doc1 = nlp(text1)
    doc2 = nlp(text2)
    return doc1.similarity(doc2)