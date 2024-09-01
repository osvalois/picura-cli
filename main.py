import os
import json
from typing import Dict, Any, List
import logging
import argparse
import traceback

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

try:
    from analyzers.code_analyzer import CodeAnalyzer
    from analyzers.documentation_analyzer import DocumentationAnalyzer
    from analyzers.architecture_analyzer import ArchitectureAnalyzer
    from generators.documentation_generator import DocumentationGenerator
    from utils.file_utils import get_project_structure, read_file_content, detect_language
    FULL_ANALYSIS_AVAILABLE = True
except ImportError as e:
    logger.warning(f"Some modules could not be imported: {str(e)}")
    logger.warning("Full analysis capabilities may not be available.")
    FULL_ANALYSIS_AVAILABLE = False

class AdvancedLocalSoftwareAnalyzer:
    def __init__(self):
        if FULL_ANALYSIS_AVAILABLE:
            self.code_analyzer = CodeAnalyzer()
            self.documentation_analyzer = DocumentationAnalyzer()
            self.architecture_analyzer = ArchitectureAnalyzer()
            self.documentation_generator = DocumentationGenerator()
        else:
            logger.warning("Analyzer initialized with limited capabilities.")

    def analyzeAndGenerateDocumentation(self, project_path: str) -> Dict[str, Any]:
        if not FULL_ANALYSIS_AVAILABLE:
            return {"error": "Full analysis capabilities are not available due to missing modules."}

        logger.info(f"Starting analysis of project: {project_path}")
        project_files = get_project_structure(project_path)
        
        documentation = {}
        code_analysis = {}
        code_embeddings = {}
        
        for file in project_files:
            if file["type"] == "file" and file["path"].endswith((".py", ".java", ".ts", ".js")):
                try:
                    content = read_file_content(project_path, file["path"])
                    language = detect_language(file["path"])
                    
                    logger.info(f"Analyzing file: {file['path']}")
                    code_analysis[file["path"]] = self.code_analyzer.analyze_code(content, language)
                    code_embeddings[file["path"]] = code_analysis[file["path"]]["embedding"]
                    
                    generated_doc = self.documentation_generator.generate_documentation(
                        content, language, code_analysis[file["path"]]
                    )
                    documentation[file["path"]] = generated_doc
                except Exception as e:
                    logger.error(f"Error analyzing file {file['path']}: {str(e)}")
                    logger.debug(traceback.format_exc())
        
        logger.info("Analyzing project architecture")
        architecture_analysis = self.architecture_analyzer.analyze_architecture(project_files, code_embeddings)
        
        project_documentation = self._generate_project_documentation(documentation, code_analysis, architecture_analysis)
        
        return {
            "file_documentation": documentation,
            "code_analysis": code_analysis,
            "architecture_analysis": architecture_analysis,
            "project_documentation": project_documentation
        }

    def _generate_project_documentation(self, file_documentation: Dict[str, str], 
                                        code_analysis: Dict[str, Dict[str, Any]], 
                                        architecture_analysis: Dict[str, Any]) -> str:
        project_summary = f"Project Overview\n\n"
        project_summary += f"Total files analyzed: {len(file_documentation)}\n"
        project_summary += f"Architecture type: {architecture_analysis.get('architecture_type', 'Unknown')}\n\n"
        
        project_summary += "Key Components:\n"
        for component in architecture_analysis.get('central_components', []):
            project_summary += f"- {component}\n"
        
        project_summary += "\nFile Summaries:\n"
        for file_path, doc in file_documentation.items():
            project_summary += f"\n{file_path}:\n"
            if file_path in code_analysis:
                project_summary += f"Complexity: {code_analysis[file_path].get('complexity', 'N/A')}\n"
            project_summary += f"Summary: {doc[:200]}...\n"  # First 200 characters of documentation
        
        return project_summary

def main():
    parser = argparse.ArgumentParser(description="Advanced Local Software Analyzer")
    parser.add_argument("project_path", help="Path to the local project to analyze")
    parser.add_argument("--output", help="Path to save the analysis results", default="analysis_results.json")
    args = parser.parse_args()

    analyzer = AdvancedLocalSoftwareAnalyzer()
    try:
        results = analyzer.analyzeAndGenerateDocumentation(args.project_path)

        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2)

        logger.info(f"Analysis complete. Results saved to {args.output}")
    except Exception as e:
        logger.error(f"An error occurred during analysis: {str(e)}")
        logger.debug(traceback.format_exc())

if __name__ == "__main__":
    main()