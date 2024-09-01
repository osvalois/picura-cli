# models/architecture_classification_model.py
import torch
import torch.nn as nn
from typing import List

class ArchitectureClassificationModel(nn.Module):
    def __init__(self, input_dim: int, hidden_dim: int, num_classes: int):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, num_classes)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.layers(x)

    @staticmethod
    def load_model(model_path: str) -> 'ArchitectureClassificationModel':
        model = torch.load(model_path)
        model.eval()
        return model

    def predict(self, embedding: torch.Tensor) -> int:
        with torch.no_grad():
            outputs = self.forward(embedding)
            return outputs.argmax().item()