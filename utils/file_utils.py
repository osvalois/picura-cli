# utils/file_utils.py
import os
from typing import List, Dict

def get_project_structure(project_path: str) -> List[Dict[str, str]]:
    project_files = []
    for root, _, files in os.walk(project_path):
        for file in files:
            file_path = os.path.join(root, file)
            relative_path = os.path.relpath(file_path, project_path)
            project_files.append({
                "path": relative_path,
                "type": "file"
            })
    return project_files

def read_file_content(project_path: str, file_path: str) -> str:
    with open(os.path.join(project_path, file_path), 'r', encoding='utf-8') as file:
        return file.read()

def detect_language(file_path: str) -> str:
    extension = os.path.splitext(file_path)[1].lower()
    language_map = {
        '.py': 'python',
        '.java': 'java',
        '.ts': 'typescript',
        '.js': 'javascript'
    }
    return language_map.get(extension, 'unknown')
