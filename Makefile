.PHONY: install dev dev-client dev-server build test typecheck clean db-start db-stop db-migrate db-seed db-reset setup help

# Default target
help:
	@echo "SlideCraft - Available commands:"
	@echo ""
	@echo "  make setup        - Full setup (install + db + migrate + seed)"
	@echo "  make dev          - Start client and server"
	@echo "  make dev-client   - Start client only"
	@echo "  make dev-server   - Start server only"
	@echo ""
	@echo "  make install      - Install dependencies"
	@echo "  make build        - Build all packages"
	@echo "  make test         - Run all tests"
	@echo "  make typecheck    - Run TypeScript checks"
	@echo ""
	@echo "  make db-start     - Start PostgreSQL in Docker"
	@echo "  make db-stop      - Stop PostgreSQL"
	@echo "  make db-migrate   - Run database migrations"
	@echo "  make db-seed      - Seed database with test puzzle"
	@echo "  make db-reset     - Reset database (stop, remove, start, migrate, seed)"
	@echo ""
	@echo "  make env          - Copy .env.example files"
	@echo "  make clean        - Remove build artifacts"

# Full setup for new developers
setup: install env db-start db-wait db-migrate db-seed
	@echo ""
	@echo "Setup complete! Run 'make dev' to start."

# Install dependencies
install:
	bun install

# Copy environment files
env:
	@test -f server/.env || cp server/.env.example server/.env
	@test -f client/.env || cp client/.env.example client/.env
	@echo "Environment files ready"

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

# Docker/Database commands
db-start:
	docker compose up -d
	@echo "PostgreSQL starting on localhost:5432"

db-stop:
	docker compose down

db-wait:
	@echo "Waiting for PostgreSQL to be ready..."
	@until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do \
		sleep 1; \
	done
	@echo "PostgreSQL is ready"

db-migrate:
	bun run --cwd server db:migrate

db-seed:
	bun run --cwd server db:seed

db-reset: db-stop
	docker compose down -v
	@$(MAKE) db-start
	@$(MAKE) db-wait
	@$(MAKE) db-migrate
	@$(MAKE) db-seed
	@echo "Database reset complete"

db-logs:
	docker compose logs -f postgres

db-shell:
	docker compose exec postgres psql -U postgres -d slidecraft

# Clean build artifacts
clean:
	rm -rf client/dist
	rm -rf server/dist
	rm -rf shared/dist
	rm -rf node_modules/.cache
