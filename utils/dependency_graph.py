# utils/dependency_graph.py
import networkx as nx
import matplotlib.pyplot as plt
from typing import List, Tuple

class DependencyGraph:
    def __init__(self):
        self.graph = nx.DiGraph()

    def add_dependency(self, source: str, target: str):
        self.graph.add_edge(source, target)

    def get_dependencies(self) -> List[Tuple[str, str]]:
        return list(self.graph.edges())

    def get_central_components(self, top_n: int = 5) -> List[str]:
        centrality = nx.betweenness_centrality(self.graph)
        return sorted(centrality, key=centrality.get, reverse=True)[:top_n]

    def visualize(self, output_path: str):
        nx.draw(self.graph, with_labels=True)
        plt.savefig(output_path)
        plt.close()
