# analyzers/documentation_analyzer.py
from typing import Dict, Any, List
from utils.nlp_utils import extract_key_phrases, calculate_text_similarity

class DocumentationAnalyzer:
    def analyze_documentation(self, code: str, documentation: str) -> Dict[str, Any]:
        code_phrases = extract_key_phrases(code)
        doc_phrases = extract_key_phrases(documentation)
        
        analysis = {
            "completeness": self._calculate_completeness(code_phrases, doc_phrases),
            "clarity": self._calculate_clarity(documentation),
            "consistency": calculate_text_similarity(code, documentation),
            "key_concepts": list(set(code_phrases + doc_phrases)),
        }

        return analysis

    def _calculate_completeness(self, code_phrases: List[str], doc_phrases: List[str]) -> float:
        covered_phrases = set(code_phrases) & set(doc_phrases)
        return len(covered_phrases) / len(code_phrases) if code_phrases else 0.0

    def _calculate_clarity(self, documentation: str) -> float:
        # Implement clarity calculation (e.g., using readability scores)
        # This is a placeholder implementation
        words = documentation.split()
        avg_word_length = sum(len(word) for word in words) / len(words) if words else 0
        return 1.0 - (avg_word_length / 10)  # Normalize to 0-1 range
