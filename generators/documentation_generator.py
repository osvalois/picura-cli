# generators/documentation_generator.py
from typing import Dict, Any, List
from services.openai_service import OpenAIService

class DocumentationGenerator:
    def __init__(self):
        self.openai_service = OpenAIService()

    def generate_documentation(self, code: str, language: str, analysis: Dict[str, Any]) -> str:
        base_documentation = self.openai_service.generate_documentation(code, language)
        enhanced_documentation = self._enhance_documentation(base_documentation, analysis)
        return enhanced_documentation

    def _enhance_documentation(self, base_doc: str, analysis: Dict[str, Any]) -> str:
        enhanced_doc = base_doc

        if "complexity" in analysis:
            enhanced_doc += f"\n\nCode Complexity:\n"
            for metric, value in analysis["complexity"].items():
                enhanced_doc += f"- {metric}: {value}\n"

        if "key_concepts" in analysis:
            enhanced_doc += f"\n\nKey Concepts:\n"
            for concept in analysis["key_concepts"]:
                enhanced_doc += f"- {concept}\n"

        if "architecture_type" in analysis:
            enhanced_doc += f"\n\nArchitecture Type: {analysis['architecture_type']}\n"

        return enhanced_doc
