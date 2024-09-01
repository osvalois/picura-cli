# utils/code_parser.py
import ast
import javalang
from typing import Any, Dict, List, Callable

try:
    import typescript
    TYPESCRIPT_AVAILABLE = True
except ImportError:
    TYPESCRIPT_AVAILABLE = False

class CodeParser:
    @staticmethod
    def parse_python(code: str) -> ast.AST:
        return ast.parse(code)

    @staticmethod
    def parse_java(code: str) -> javalang.tree.CompilationUnit:
        return javalang.parse.parse(code)

    @staticmethod
    def parse_typescript(code: str) -> Any:
        if not TYPESCRIPT_AVAILABLE:
            raise ImportError("TypeScript parsing is not available. Please install the 'typescript' package.")
        return typescript.parse(code)

    @staticmethod
    def get_parser(language: str) -> Callable[[str], Any]:
        parsers = {
            "python": CodeParser.parse_python,
            "java": CodeParser.parse_java,
            "typescript": CodeParser.parse_typescript,
        }
        parser = parsers.get(language.lower())
        if parser is None:
            raise ValueError(f"Unsupported language: {language}")
        return parser