.PHONY: install dev dev-client dev-server build test typecheck clean db-create db-migrate db-seed db-reset setup help

# Default target
help:
	@echo "SlideCraft - Available commands:"
	@echo ""
	@echo "  make setup        - Full setup (install + db + seed)"
	@echo "  make dev          - Start client and server"
	@echo "  make dev-client   - Start client only"
	@echo "  make dev-server   - Start server only"
	@echo ""
	@echo "  make install      - Install dependencies"
	@echo "  make build        - Build all packages"
	@echo "  make test         - Run all tests"
	@echo "  make typecheck    - Run TypeScript checks"
	@echo ""
	@echo "  make db-create    - Create PostgreSQL database"
	@echo "  make db-migrate   - Run database migrations"
	@echo "  make db-seed      - Seed database with test puzzle"
	@echo "  make db-reset     - Drop and recreate database"
	@echo ""
	@echo "  make env          - Copy .env.example files"
	@echo "  make clean        - Remove build artifacts"

# Full setup for new developers
setup: install env db-create db-migrate db-seed
	@echo "Setup complete! Run 'make dev' to start."

# Install dependencies
install:
	bun install

# Copy environment files
env:
	@test -f server/.env || cp server/.env.example server/.env
	@test -f client/.env || cp client/.env.example client/.env
	@echo "Environment files ready (edit server/.env for database config)"

# Development
dev:
	bun run dev

dev-client:
	bun run dev:client

dev-server:
	bun run dev:server

# Build
build:
	bun run build

# Testing
test:
	bun run test

test-client:
	bun run test:client

test-server:
	bun run test:server

test-shared:
	bun run test:shared

# Type checking
typecheck:
	bun run typecheck

# Database commands
db-create:
	@createdb slidecraft 2>/dev/null || echo "Database 'slidecraft' already exists"

db-migrate:
	bun run --cwd server db:migrate

db-seed:
	bun run --cwd server db:seed

db-reset:
	@dropdb slidecraft 2>/dev/null || true
	@createdb slidecraft
	@$(MAKE) db-migrate
	@$(MAKE) db-seed
	@echo "Database reset complete"

# Clean build artifacts
clean:
	rm -rf client/dist
	rm -rf server/dist
	rm -rf shared/dist
	rm -rf node_modules/.cache
