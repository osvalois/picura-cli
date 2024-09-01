# analyzers/code_analyzer.py
from typing import Dict, Any, List
from utils.code_parser import CodeParser
from models.code_embedding_model import CodeEmbeddingModel

class CodeAnalyzer:
    def __init__(self):
        self.embedding_model = CodeEmbeddingModel()

    def analyze_code(self, code: str, language: str) -> Dict[str, Any]:
        parser = CodeParser.get_parser(language)
        if not parser:
            raise ValueError(f"Unsupported language: {language}")

        ast = parser(code)
        embedding = self.embedding_model.get_embedding(code)

        analysis = {
            "ast": ast,
            "embedding": embedding,
            "metrics": self._calculate_metrics(ast, language),
            "complexity": self._calculate_complexity(ast, language),
        }

        return analysis

    def _calculate_metrics(self, ast: Any, language: str) -> Dict[str, int]:
        # Implement language-specific metric calculations
        # This is a placeholder implementation
        return {
            "num_functions": len([node for node in ast.body if isinstance(node, ast.FunctionDef)]) if language == "python" else 0,
            "num_classes": len([node for node in ast.body if isinstance(node, ast.ClassDef)]) if language == "python" else 0,
        }

    def _calculate_complexity(self, ast: Any, language: str) -> Dict[str, float]:
        # Implement language-specific complexity calculations
        # This is a placeholder implementation
        return {
            "cyclomatic_complexity": self._calculate_cyclomatic_complexity(ast) if language == "python" else 0,
        }

    def _calculate_cyclomatic_complexity(self, ast: ast.AST) -> int:
        complexity = 1
        for node in ast.body:
            if isinstance(node, (ast.If, ast.For, ast.While, ast.And, ast.Or)):
                complexity += 1
        return complexity