# Makefile for PICURA CLI

# Variables
NODE := node
NPM := npm
NPX := npx
PICURA := ./bin/run

# Colors
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

# Help target
help:
	@echo "$(CYAN)Available commands:$(NC)"
	@echo "  $(GREEN)make install$(NC)      - Install project dependencies"
	@echo "  $(GREEN)make build$(NC)        - Build the project"
	@echo "  $(GREEN)make clean$(NC)        - Remove build artifacts and dependencies"
	@echo "  $(GREEN)make test$(NC)         - Run tests"
	@echo "  $(GREEN)make lint$(NC)         - Run linter"
	@echo "  $(GREEN)make start$(NC)        - Start the PICURA CLI"
	@echo "  $(GREEN)make link$(NC)         - Create a global link to the CLI"
	@echo "  $(GREEN)make unlink$(NC)       - Remove the global link to the CLI"
	@echo "  $(GREEN)make version$(NC)      - Check PICURA CLI version"
	@echo "  $(GREEN)make run-init$(NC)     - Run PICURA init command (example)"
	@echo "  $(GREEN)make run-generate$(NC) - Run PICURA generate command (example)"
	@echo "  $(GREEN)make analyze-at-sync$(NC) - Analyze at-sync-data-states-ms project"
	@echo "  $(GREEN)make run$(NC)          - Run any PICURA command (usage: make run CMD='command [args]')"
	@echo "  $(GREEN)make update-local$(NC) - Update local PICURA CLI dependency"

# Install dependencies
install:
	@echo "$(YELLOW)Installing dependencies...$(NC)"
	@$(NPM) install

# Build the project
build: install
	@echo "$(YELLOW)Building project...$(NC)"
	@$(NPM) run build

# Clean build artifacts and dependencies
clean:
	@echo "$(YELLOW)Cleaning build artifacts and dependencies...$(NC)"
	@rm -rf dist node_modules

# Run tests
test: build
	@echo "$(YELLOW)Running tests...$(NC)"
	@$(NPM) test

# Run linter
lint:
	@echo "$(YELLOW)Running linter...$(NC)"
	@$(NPM) run lint

# Start the CLI
start: build
	@echo "$(YELLOW)Starting PICURA CLI...$(NC)"
	@$(NODE) $(PICURA)

# Create a global link to the CLI
link: build
	@echo "$(YELLOW)Creating global link to PICURA CLI...$(NC)"
	@$(NPM) link

# Remove the global link to the CLI
unlink:
	@echo "$(YELLOW)Removing global link to PICURA CLI...$(NC)"
	@$(NPM) unlink picura

# Check PICURA CLI version
version: build
	@echo "$(YELLOW)Checking PICURA CLI version...$(NC)"
	@$(NODE) $(PICURA) --version

# Run PICURA init command (example)
run-init: build
	@echo "$(YELLOW)Running PICURA init command...$(NC)"
	@$(NODE) $(PICURA) init --name="TestProject" --description="A test project" --path="./test-project"

# Run PICURA generate command (example)
run-generate: build
	@echo "$(YELLOW)Running PICURA generate command...$(NC)"
	@$(NODE) $(PICURA) generate --type=ARCHITECTURE --project=test-project-id

# Analyze at-sync-data-states-ms project
analyze-at-sync: build
	@echo "$(YELLOW)Analyzing at-sync-data-states-ms project...$(NC)"
	@$(NODE) $(PICURA) init --name="at-sync-data-states-ms" --description="Data states synchronization microservice" --path="/Users/oscarvalois/Documents/Hergon/at-sync-data-states-ms"
	@$(NODE) $(PICURA) generate --type=ARCHITECTURE --project=p361QH-gB7LKF_06lA-gh
	@$(NODE) $(PICURA) generate --type=DATA_SCHEMA --project=p361QH-gB7LKF_06lA-gh
	@$(NODE) $(PICURA) generate --type=DEPLOYMENT --project=p361QH-gB7LKF_06lA-gh
	@$(NODE) $(PICURA) generate --type=API_SPECIFICATION --project=p361QH-gB7LKF_06lA-gh
	@$(NODE) $(PICURA) generate --type=USER_MANUAL --project=p361QH-gB7LKF_06lA-gh
# Run any PICURA command
run: build
	@echo "$(YELLOW)Running PICURA command: $(CMD)$(NC)"
	@$(NODE) $(PICURA) $(CMD)

# Update local PICURA CLI dependency
update-local: unlink
	@echo "$(YELLOW)Updating local PICURA CLI dependency...$(NC)"
	@$(NPM) install
	@$(NPM) run build
	@$(MAKE) link

# Phony targets
.PHONY: help install build clean test lint start link unlink version run-init run-generate analyze-at-sync run update-local