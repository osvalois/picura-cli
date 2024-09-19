# PICURA CLI Makefile
# Author: Oscar Valois
# Version: 1.0.7
# Description: Professional-grade Makefile for PICURA CLI with Prisma integration and debug options

# --- Variables ---
SHELL := /bin/bash
NODE := node
NPM := npm
NPX := npx
PICURA := ./bin/run

# Project configuration
PROJECT_NAME := picura-cli
PROJECT_PATH := /Users/oscarvalois/Documents/Archtools/tod-p2m
PROJECT_ID := cm0s4wo1p000013w73hd0kc4e

# Environment
ENV ?= development
ifeq ($(ENV),production)
    NODE_ENV := production
else
    NODE_ENV := development
endif

# Debug mode
DEBUG ?= false
ifeq ($(DEBUG),true)
    DEBUG_ENV := DEBUG=*
else
    DEBUG_FLAG :=
    DEBUG_ENV :=
endif

# Colors and formatting
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
BOLD := \033[1m
NC := \033[0m # No Color

# --- Main Targets ---
.DEFAULT_GOAL := help

.PHONY: help install build clean test lint start dev analyze docker-up docker-down update-local prisma-generate prisma-migrate prisma-studio

help:
	@echo -e "$(BOLD)$(CYAN)PICURA CLI Makefile Commands:$(NC)"
	@echo -e "  $(GREEN)make install$(NC)      - Install project dependencies and generate Prisma client"
	@echo -e "  $(GREEN)make build$(NC)        - Build the project and generate Prisma client"
	@echo -e "  $(GREEN)make clean$(NC)        - Remove build artifacts and dependencies"
	@echo -e "  $(GREEN)make test$(NC)         - Run tests"
	@echo -e "  $(GREEN)make lint$(NC)         - Run linter"
	@echo -e "  $(GREEN)make start$(NC)        - Start the PICURA CLI"
	@echo -e "  $(GREEN)make dev$(NC)          - Start the PICURA CLI in development mode"
	@echo -e "  $(GREEN)make analyze$(NC)      - Analyze project and generate documentation"
	@echo -e "  $(GREEN)make docker-up$(NC)    - Start Docker containers"
	@echo -e "  $(GREEN)make docker-down$(NC)  - Stop Docker containers"
	@echo -e "  $(GREEN)make update-local$(NC) - Install or update local CLI dependency"
	@echo -e "  $(GREEN)make prisma-generate$(NC) - Generate Prisma client"
	@echo -e "  $(GREEN)make prisma-migrate$(NC)  - Run Prisma migrations"
	@echo -e "  $(GREEN)make prisma-studio$(NC)   - Open Prisma Studio"
	@echo -e "\nUse $(YELLOW)ENV=production$(NC) before any command to run in production mode"
	@echo -e "Use $(YELLOW)DEBUG=true$(NC) with any command to enable debug mode and verbose output"

install: prisma-generate
	@echo -e "$(YELLOW)Installing dependencies for $(NODE_ENV) environment...$(NC)"
	@$(NPM) ci

build: install prisma-generate
	@echo -e "$(YELLOW)Building project for $(NODE_ENV) environment...$(NC)"
	@$(NPM) run build
	@echo -e "$(GREEN)Build completed successfully.$(NC)"

clean:
	@echo -e "$(YELLOW)Cleaning build artifacts and dependencies...$(NC)"
	@rm -rf dist node_modules
	@echo -e "$(GREEN)Cleanup completed.$(NC)"

test: build
	@echo -e "$(YELLOW)Running tests...$(NC)"
	@$(DEBUG_ENV) $(NPM) test || (echo -e "$(RED)Tests failed.$(NC)" && exit 1)

lint:
	@echo -e "$(YELLOW)Running linter...$(NC)"
	@$(DEBUG_ENV) $(NPM) run lint || (echo -e "$(RED)Linting failed.$(NC)" && exit 1)

start: build
	@echo -e "$(YELLOW)Starting PICURA CLI in $(NODE_ENV) mode...$(NC)"
	@NODE_ENV=$(NODE_ENV) $(DEBUG_ENV) $(NODE) $(DEBUG_FLAG) $(PICURA)

dev: prisma-generate
	@echo -e "$(YELLOW)Starting PICURA CLI in development mode...$(NC)"
	@$(DEBUG_ENV) $(NPM) run dev

# --- Project Analysis and Documentation Generation ---
analyze: build
	@echo -e "$(YELLOW)Analyzing $(PROJECT_NAME) project...$(NC)"
	@NODE_ENV=$(NODE_ENV) $(DEBUG_ENV) $(NODE) $(DEBUG_FLAG) $(PICURA) generate --type=ARCHITECTURE --project=$(PROJECT_ID)
	@NODE_ENV=$(NODE_ENV) $(DEBUG_ENV) $(NODE) $(DEBUG_FLAG) $(PICURA) generate --type=DATA_SCHEMA --project=$(PROJECT_ID)
	@NODE_ENV=$(NODE_ENV) $(DEBUG_ENV) $(NODE) $(DEBUG_FLAG) $(PICURA) generate --type=API_SPECIFICATION --project=$(PROJECT_ID)
	@NODE_ENV=$(NODE_ENV) $(DEBUG_ENV) $(NODE) $(DEBUG_FLAG) $(PICURA) generate --type=USER_MANUAL --project=$(PROJECT_ID)
	@NODE_ENV=$(NODE_ENV) $(DEBUG_ENV) $(NODE) $(DEBUG_FLAG) $(PICURA) generate --type=DEPLOYMENT --project=$(PROJECT_ID)
	@echo -e "$(GREEN)Project analysis and documentation generation completed.$(NC)"

# --- Docker Commands ---
docker-up:
	@echo -e "$(YELLOW)Starting Docker containers...$(NC)"
	@$(DEBUG_ENV) docker-compose up -d
	@echo -e "$(GREEN)Docker containers started successfully.$(NC)"

docker-down:
	@echo -e "$(YELLOW)Stopping Docker containers...$(NC)"
	@$(DEBUG_ENV) docker-compose down
	@echo -e "$(GREEN)Docker containers stopped successfully.$(NC)"

# --- Update Local CLI Dependency ---
update-local: build
	@echo -e "$(YELLOW)Updating local CLI dependency...$(NC)"
	@$(DEBUG_ENV) npm unlink picura-cli || true
	@$(DEBUG_ENV) npm uninstall picura-cli || true
	@rm -f /Users/oscarvalois/.nvm/versions/node/v20.17.0/bin/picura || true
	@$(DEBUG_ENV) npm link --force
	@echo -e "$(GREEN)Local CLI dependency updated and linked successfully.$(NC)"

# --- Prisma Commands ---
prisma-generate:
	@echo -e "$(YELLOW)Generating Prisma client...$(NC)"
	@$(DEBUG_ENV) $(NPX) prisma generate
	@echo -e "$(GREEN)Prisma client generated successfully.$(NC)"

prisma-migrate:
	@echo -e "$(YELLOW)Running Prisma migrations...$(NC)"
	@$(DEBUG_ENV) $(NPX) prisma migrate dev
	@echo -e "$(GREEN)Prisma migrations completed successfully.$(NC)"

prisma-studio:
	@echo -e "$(YELLOW)Opening Prisma Studio...$(NC)"
	@$(DEBUG_ENV) $(NPX) prisma studio

# --- Utility Functions ---
define log
	@echo -e "$(YELLOW)$(1)$(NC)"
endef

define check_env
	@if [ -z "$(ENV)" ]; then \
		echo -e "$(RED)Error: ENV variable is not set. Use ENV=production or ENV=development$(NC)"; \
		exit 1; \
	fi
endef

# --- Advanced Features ---
# Parallel execution example (use with caution)
.PHONY: parallel-test
parallel-test:
	@echo -e "$(YELLOW)Running tests in parallel...$(NC)"
	@$(MAKE) -j4 unit-tests integration-tests e2e-tests performance-tests

unit-tests:
	@$(DEBUG_ENV) $(NPM) run test:unit

integration-tests:
	@$(DEBUG_ENV) $(NPM) run test:integration

e2e-tests:
	@$(DEBUG_ENV) $(NPM) run test:e2e

performance-tests:
	@$(DEBUG_ENV) $(NPM) run test:performance

# --- Error Handling ---
%:
	@echo -e "$(RED)Error: Command '$@' not found. Use 'make help' to see available commands.$(NC)"
	@exit 1