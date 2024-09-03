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
	@echo "  $(GREEN)make dev$(NC)          - Start the PICURA CLI in development mode"
	@echo "  $(GREEN)make prisma-generate$(NC) - Generate Prisma client"
	@echo "  $(GREEN)make prisma-migrate$(NC)  - Run Prisma migrations"
	@echo "  $(GREEN)make prisma-studio$(NC)   - Open Prisma Studio"
	@echo "  $(GREEN)make docker-up$(NC)    - Start Docker containers"
	@echo "  $(GREEN)make docker-down$(NC)  - Stop Docker containers"

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

analyze-at-sync:
	@echo "$(YELLOW)Analyzing at-sync-data-states-ms project...$(NC)"
#	@$(NODE) $(PICURA) init --name="at-sync-data-states-ms" --description="Data states synchronization microservice" --path="/Users/oscarvalois/Documents/Hergon/at-sync-data-states-ms"
	@$(NODE) $(PICURA) generate --type=ARCHITECTURE --project=cm0lupjsd0000137ea9ng8ll2
	@$(NODE) $(PICURA) generate --type=DATA_SCHEMA --project=cm0lupjsd0000137ea9ng8ll2
	@$(NODE) $(PICURA) generate --type=API_SPECIFICATION --project=cm0lupjsd0000137ea9ng8ll2
	@$(NODE) $(PICURA) generate --type=USER_MANUAL --project=cm0lupjsd0000137ea9ng8ll2
	@$(NODE) $(PICURA) generate --type=DEPLOYMENT --project=cm0lupjsd0000137ea9ng8ll2
update-local:
	@echo "$(YELLOW)Updating local PICURA CLI dependency...$(NC)"
	@$(NPM) run update-local

# Run linter
lint:
	@echo "$(YELLOW)Running linter...$(NC)"
	@$(NPM) run lint

# Start the CLI
start: build
	@echo "$(YELLOW)Starting PICURA CLI...$(NC)"
	@$(NODE) $(PICURA)

# Start the CLI in development mode
dev:
	@echo "$(YELLOW)Starting PICURA CLI in development mode...$(NC)"
	@$(NPM) run dev

# Generate Prisma client
prisma-generate:
	@echo "$(YELLOW)Generating Prisma client...$(NC)"
	@$(NPX) prisma generate

# Run Prisma migrations
prisma-migrate:
	@echo "$(YELLOW)Running Prisma migrations...$(NC)"
	@$(NPX) prisma migrate dev

# Open Prisma Studio
prisma-studio:
	@echo "$(YELLOW)Opening Prisma Studio...$(NC)"
	@$(NPX) prisma studio

# Start Docker containers
docker-up:
	@echo "$(YELLOW)Starting Docker containers...$(NC)"
	@docker-compose up -d

# Stop Docker containers
docker-down:
	@echo "$(YELLOW)Stopping Docker containers...$(NC)"
	@docker-compose down

# Phony targets
.PHONY: help install build clean test lint start dev prisma-generate prisma-migrate prisma-studio docker-up docker-down