# analyzers/architecture_analyzer.py
from typing import Dict, Any, List
from utils.dependency_graph import DependencyGraph
from models.architecture_classification_model import ArchitectureClassificationModel
from config import MODEL_PATH
import torch

class ArchitectureAnalyzer:
    def __init__(self):
        self.dependency_graph = DependencyGraph()
        self.classification_model = ArchitectureClassificationModel.load_model(f"{MODEL_PATH}/architecture_model.pth")

    def analyze_architecture(self, project_files: List[Dict[str, str]], code_embeddings: Dict[str, torch.Tensor]) -> Dict[str, Any]:
        for file in project_files:
            self._analyze_file_dependencies(file)

        central_components = self.dependency_graph.get_central_components()
        overall_embedding = self._calculate_project_embedding(code_embeddings)
        architecture_type = self.classification_model.predict(overall_embedding)

        analysis = {
            "dependency_graph": self.dependency_graph.get_dependencies(),
            "central_components": central_components,
            "architecture_type": self._get_architecture_type(architecture_type),
            "modularity_score": self._calculate_modularity_score(),
        }

        return analysis

    def _analyze_file_dependencies(self, file: Dict[str, str]):
        # Implement file dependency analysis
        # This is a placeholder implementation
        pass

    def _calculate_project_embedding(self, code_embeddings: Dict[str, torch.Tensor]) -> torch.Tensor:
        # Calculate the average embedding across all files
        embeddings = list(code_embeddings.values())
        return torch.mean(torch.stack(embeddings), dim=0)

    def _get_architecture_type(self, type_index: int) -> str:
        architecture_types = [
            "Monolithic",
            "Microservices",
            "Layered",
            "Event-Driven",
            "Plugin-based",
            "Service-Oriented",
            "Pipe and Filter",
            "Client-Server",
        ]
        return architecture_types[type_index]

    def _calculate_modularity_score(self) -> float:
        # Implement modularity score calculation
        # This is a placeholder implementation
        return len(self.dependency_graph.get_central_components()) / len(self.dependency_graph.get_dependencies())
