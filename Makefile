# ============================================================================
# Aditus Development Makefile
# ============================================================================
# Quick commands for common development tasks

.PHONY: help install run test migrate ngrok docker clean

# Default target
help:
	@echo "Aditus Development Commands"
	@echo "============================"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make install          Install all dependencies (backend + frontend)"
	@echo "  make install-backend  Install Python dependencies"
	@echo "  make install-frontend Install Node.js dependencies"
	@echo ""
	@echo "Running the App:"
	@echo "  make run              Run backend + frontend concurrently"
	@echo "  make run-backend      Run FastAPI backend only"
	@echo "  make run-frontend     Run Next.js frontend only"
	@echo ""
	@echo "Database:"
	@echo "  make migrate          Run all pending migrations"
	@echo "  make migrate-create   Create a new migration file"
	@echo "  make db-shell         Open PostgreSQL shell"
	@echo "  make db-reset         Reset database (WARNING: deletes all data)"
	@echo ""
	@echo "M-Pesa Development:"
	@echo "  make ngrok            Start ngrok tunnel for M-Pesa callbacks"
	@echo "  make ngrok-status     Check ngrok tunnel status"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-up        Start PostgreSQL + Redis containers"
	@echo "  make docker-down      Stop Docker containers"
	@echo "  make docker-logs      View Docker logs"
	@echo ""
	@echo "Testing & Quality:"
	@echo "  make test             Run all tests"
	@echo "  make lint             Run linters"
	@echo "  make format           Format code (black + prettier)"
	@echo ""
	@echo "Maintenance:"
	@echo "  make clean            Remove cache files and build artifacts"
	@echo "  make logs             Tail application logs"

# ============================================================================
# INSTALLATION
# ============================================================================

install: install-backend install-frontend
	@echo "✅ All dependencies installed!"

install-backend:
	@echo "📦 Installing backend dependencies..."
	cd backend && pip install -r requirements.txt

install-frontend:
	@echo "📦 Installing frontend dependencies..."
	cd frontend && npm install

# ============================================================================
# RUNNING THE APPLICATION
# ============================================================================

run:
	@echo "🚀 Starting Aditus (backend + frontend)..."
	@echo "Backend: http://localhost:8000"
	@echo "Frontend: http://localhost:3000"
	@make -j2 run-backend run-frontend

run-backend:
	@echo "🐍 Starting FastAPI backend..."
	cd backend && uvicorn main:app --reload --port 8000

run-frontend:
	@echo "⚛️  Starting Next.js frontend..."
	cd frontend && npm run dev

# ============================================================================
# DATABASE MANAGEMENT
# ============================================================================

migrate:
	@echo "🗄️  Running database migrations..."
	cd backend && PYTHONPATH=$$(pwd) python3 -c "import os; [os.system(f'python3 {f}') for f in sorted([f'migrations/{m}' for m in os.listdir('migrations') if m.endswith('.py')])]"

migrate-create:
	@read -p "Migration name: " name; \
	cd backend/migrations && \
	cp template.py add_$${name}.py && \
	echo "✅ Created migrations/add_$${name}.py"

db-shell:
	@echo "🐘 Opening PostgreSQL shell..."
	psql postgresql://postgres:postgres@localhost:5432/aditus

db-reset:
	@echo "⚠️  WARNING: This will delete ALL data!"
	@read -p "Are you sure? (yes/no): " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		psql postgresql://postgres:postgres@localhost:5432/postgres -c "DROP DATABASE IF EXISTS aditus;"; \
		psql postgresql://postgres:postgres@localhost:5432/postgres -c "CREATE DATABASE aditus;"; \
		make migrate; \
		echo "✅ Database reset complete!"; \
	else \
		echo "❌ Cancelled."; \
	fi

# ============================================================================
# M-PESA DEVELOPMENT (NGROK)
# ============================================================================

ngrok:
	@echo "🌐 Starting ngrok tunnel for M-Pesa callbacks..."
	@echo "Backend must be running on port 8000"
	@echo ""
	@echo "📋 IMPORTANT: Copy the HTTPS URL and update .env:"
	@echo "   DARAJA_CALLBACK_URL=https://xxxx-xxxx.ngrok.io/api/v1/payments/callback"
	@echo ""
	@echo "Monitor callbacks at: http://127.0.0.1:4040"
	@echo ""
	ngrok http 8000

ngrok-status:
	@echo "🔍 Checking ngrok tunnel status..."
	@curl -s http://127.0.0.1:4040/api/tunnels | python3 -m json.tool || echo "❌ Ngrok not running. Start with: make ngrok"

# ============================================================================
# DOCKER MANAGEMENT
# ============================================================================

docker-up:
	@echo "🐳 Starting Docker containers (PostgreSQL + Redis)..."
	docker-compose up -d
	@echo "✅ Containers started!"
	@echo "PostgreSQL: localhost:5432"
	@echo "Redis: localhost:6379"

docker-down:
	@echo "🛑 Stopping Docker containers..."
	docker-compose down

docker-logs:
	@echo "📜 Viewing Docker logs..."
	docker-compose logs -f

# ============================================================================
# TESTING & CODE QUALITY
# ============================================================================

test:
	@echo "🧪 Running tests..."
	cd backend && pytest
	cd frontend && npm run test

lint:
	@echo "🔍 Running linters..."
	cd backend && flake8 app
	cd frontend && npm run lint

format:
	@echo "✨ Formatting code..."
	cd backend && black app
	cd frontend && npm run format

# ============================================================================
# MAINTENANCE
# ============================================================================

clean:
	@echo "🧹 Cleaning cache files and build artifacts..."
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	cd frontend && rm -rf .next
	@echo "✅ Cleanup complete!"

logs:
	@echo "📊 Tailing application logs..."
	tail -f backend/app.log

# ============================================================================
# PRODUCTION DEPLOYMENT
# ============================================================================

build-frontend:
	@echo "📦 Building frontend for production..."
	cd frontend && npm run build

deploy:
	@echo "🚀 Deploying to production..."
	@echo "Not implemented yet. Use your deployment script."

# ============================================================================
# ADMIN TASKS
# ============================================================================

create-admin:
	@echo "👤 Creating admin user..."
	cd backend && python create_admin.py

seed-plans:
	@echo "💳 Seeding subscription plans..."
	cd backend/migrations && python add_subscription_tables.py

# ============================================================================
# QUICK DIAGNOSTICS
# ============================================================================

check:
	@echo "🔍 Running system diagnostics..."
	@echo ""
	@echo "Python version:"
	@python3 --version
	@echo ""
	@echo "Node.js version:"
	@node --version
	@echo ""
	@echo "PostgreSQL status:"
	@pg_isready -h localhost -p 5432 && echo "✅ PostgreSQL is running" || echo "❌ PostgreSQL is not running"
	@echo ""
	@echo "Backend health:"
	@curl -s http://localhost:8000/health | python3 -m json.tool || echo "❌ Backend not responding"
	@echo ""
	@echo "Frontend status:"
	@curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend is running" || echo "❌ Frontend is not running"
