# Makefile para el Analizador Avanzado de Software Local

# Variables
PYTHON = python3.9
VENV = venv
VENV_BIN = $(VENV)/bin
VENV_PYTHON = $(VENV_BIN)/python
VENV_PIP = $(VENV_BIN)/pip
ANALYZER_PATH = .
PROJECT_PATH = $(HOME)/Documents/Hergon/at-sync-data-settings-ms
OUTPUT_FILE = analysis_results.json
REQUIREMENTS_IN = requirements.in
REQUIREMENTS_TXT = requirements.txt

# Phony targets
.PHONY: setup venv run clean analyze help install-dependencies install-spacy-model compile-requirements

# Crear entorno virtual
venv:
	$(PYTHON) -m venv $(VENV)

# Compilar requisitos
compile-requirements: venv
	. $(VENV_BIN)/activate && \
	$(VENV_PIP) install pip-tools && \
	pip-compile $(REQUIREMENTS_IN) -o $(REQUIREMENTS_TXT)

# Instalar dependencias
install-dependencies: compile-requirements
	. $(VENV_BIN)/activate && \
	$(VENV_PIP) install --upgrade pip setuptools wheel && \
	$(VENV_PIP) install -r $(REQUIREMENTS_TXT)

# Instalar modelo de spacy
install-spacy-model: install-dependencies
	. $(VENV_BIN)/activate && \
	$(VENV_PYTHON) -m spacy download en_core_web_sm

# Configurar el entorno
setup: install-dependencies install-spacy-model

# Ejecutar el analizador
run:
	. $(VENV_BIN)/activate && \
	$(VENV_PYTHON) $(ANALYZER_PATH)/main.py "$(PROJECT_PATH)" --output $(OUTPUT_FILE)

# Limpiar archivos temporales y caché
clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	rm -rf .pytest_cache
	rm -rf .mypy_cache
	rm -f $(OUTPUT_FILE)
	rm -f $(REQUIREMENTS_TXT)

# Eliminar el entorno virtual
clean-venv:
	rm -rf $(VENV)

# Analizar el proyecto
analyze: setup run

# Mostrar ayuda
help:
	@echo "Uso del Makefile:"
	@echo "  make setup     : Crea un entorno virtual e instala las dependencias"
	@echo "  make run       : Ejecuta el analizador en el proyecto especificado"
	@echo "  make clean     : Limpia archivos temporales y caché"
	@echo "  make clean-venv: Elimina el entorno virtual"
	@echo "  make analyze   : Configura el entorno y ejecuta el análisis"
	@echo "  make help      : Muestra este mensaje de ayuda"

# Objetivo por defecto
.DEFAULT_GOAL := help