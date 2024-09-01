# utils/nlp_utils.py
import spacy
from typing import List

nlp = spacy.load("en_core_web_sm")

def extract_key_phrases(text: str) -> List[str]:
    doc = nlp(text)
    return [chunk.text for chunk in doc.noun_chunks]

def calculate_text_similarity(text1: str, text2: str) -> float:
    doc1 = nlp(text1)
    doc2 = nlp(text2)
    return doc1.similarity(doc2)