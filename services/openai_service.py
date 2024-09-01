# services/openai_service.py
import openai
from typing import List, Dict, Any
from config import OPENAI_API_KEY

openai.api_key = OPENAI_API_KEY

class OpenAIService:
    @staticmethod
    def generate_documentation(code: str, language: str) -> str:
        prompt = f"Generate comprehensive documentation for the following {language} code:\n\n{code}\n\nDocumentation:"
        response = openai.Completion.create(
            engine="text-davinci-002",
            prompt=prompt,
            max_tokens=500,
            n=1,
            stop=None,
            temperature=0.7,
        )
        return response.choices[0].text.strip()

    @staticmethod
    def analyze_architecture(project_summary: str) -> Dict[str, Any]:
        prompt = f"Analyze the following project summary and provide insights about its architecture:\n\n{project_summary}\n\nArchitecture Analysis:"
        response = openai.Completion.create(
            engine="text-davinci-002",
            prompt=prompt,
            max_tokens=500,
            n=1,
            stop=None,
            temperature=0.7,
        )
        return {
            "analysis": response.choices[0].text.strip(),
            "confidence": response.choices[0].logprobs.token_logprobs[-1] if response.choices[0].logprobs else None
        }