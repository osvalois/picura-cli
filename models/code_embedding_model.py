# models/code_embedding_model.py
import torch
import torch.nn as nn
from transformers import RobertaModel, RobertaTokenizer

class CodeEmbeddingModel(nn.Module):
    def __init__(self, model_name: str = "microsoft/codebert-base"):
        super().__init__()
        self.tokenizer = RobertaTokenizer.from_pretrained(model_name)
        self.model = RobertaModel.from_pretrained(model_name)

    def forward(self, input_ids, attention_mask):
        outputs = self.model(input_ids=input_ids, attention_mask=attention_mask)
        return outputs.last_hidden_state[:, 0, :]  # Use [CLS] token embedding

    def get_embedding(self, code: str) -> torch.Tensor:
        inputs = self.tokenizer(code, return_tensors="pt", max_length=512, truncation=True, padding="max_length")
        with torch.no_grad():
            return self.forward(inputs["input_ids"], inputs["attention_mask"]).squeeze()
