# Aditus Development Quick Reference
# ==================================
# Copy this file to your notes or save as a bookmark!

## 🚀 Quick Commands

# Start Backend (Development)
cd backend && source venv/bin/activate && uvicorn main:app --reload

# Start Database
docker run --name aditus-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=aditus -p 5432:5432 -d postgres:15

# Start Everything (Docker)
docker-compose up -d

# Stop Everything
docker-compose down

# View Logs
docker-compose logs -f backend

# Run Tests
pytest -v

# Format Code
black app/

# Type Check
mypy app/

## 📍 Important URLs

# Swagger API Docs:        http://localhost:8000/docs
# ReDoc Docs:              http://localhost:8000/redoc
# OpenAPI Schema:          http://localhost:8000/openapi.json
# Health Check:            http://localhost:8000/health
# pgAdmin:                 http://localhost:5050

## 🗄️ Database Credentials

# Host:     localhost
# Port:     5432
# User:     postgres
# Password: postgres
# Database: aditus

## 🔑 Environment Variables (Add to .env)

# Required:
GEMINI_API_KEY=your_key_here
SECRET_KEY=your_secret_key_here

# Optional (defaults shown):
DEBUG=False
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/aditus
SERVER_PORT=8000
FRONTEND_URL=http://localhost:3000

## 📂 File Locations

# Main FastAPI App:        backend/main.py
# Database Models:         backend/app/db/models.py
# AI Prompts:              backend/app/core/prompts.py
# Gemini Service:          backend/app/services/gemini_service.py
# Pydantic Schemas:        backend/app/schemas/__init__.py
# Configuration:           backend/app/core/config.py

## 🔄 Workflow

# 1. Job URL submitted
# 2. HTML scraped (BeautifulSoup4)
# 3. Gemini extracts structure → ExtractedJobData
# 4. CV generated (tailored + HTML)
# 5. Cover letter generated (HTML)
# 6. Cold outreach generated (email + LinkedIn)
# 7. User reviews in dashboard
# 8. User submits application
# 9. PDFs generated from HTML (WeasyPrint)

## 🧠 Key Services

# GeminiService
# - extract_job_data(job_html)
# - generate_tailored_cv(master_profile, job_details)
# - generate_cover_letter(candidate_info, job_details)
# - generate_cold_outreach(candidate_info, job_details)

## 🗄️ Database Statuses

# PENDING    → waiting to process
# EXTRACTING → extracting job data
# DRAFTING   → generating materials
# REVIEW     → awaiting user approval
# SENT       → application submitted
# ARCHIVED   → old/completed

## 🔐 Important Files to Secure

# backend/.env           (Add to .gitignore)
# GEMINI_API_KEY        (Never commit)
# SECRET_KEY            (Never commit)
# Database password     (Use env vars)

## 🧪 Testing Commands

# All tests
pytest

# With coverage
pytest --cov=app

# Async tests only
pytest -v -k async

# Single test file
pytest tests/test_gemini_service.py

# With output
pytest -v -s

## 🐛 Debugging

# Enable SQL logging
SQL_ECHO=True

# Enable debug mode
DEBUG=True

# Check database connection
curl http://localhost:8000/health/db

# Check for port conflicts
lsof -i :8000  # or :5432, :6379, etc

## 📊 Performance Tips

# Add database indexes to frequently queried fields
# Use connection pooling for PostgreSQL
# Cache LLM responses for same job requirements
# Use background tasks for PDF generation
# Enable CORS selectively (not *)

## 🚢 Production Checklist

- [ ] Set DEBUG=False
- [ ] Change SECRET_KEY
- [ ] Use strong database password
- [ ] Set up HTTPS/SSL
- [ ] Configure proper CORS origins
- [ ] Set up logging aggregation
- [ ] Use managed PostgreSQL service
- [ ] Use Redis for session/cache
- [ ] Set up monitoring alerts
- [ ] Configure backups
- [ ] Enable rate limiting
- [ ] Set up API documentation protection

## 🤔 Common Issues & Solutions

# Port already in use
sudo lsof -i :8000
kill -9 <PID>

# Database won't connect
# Check: host, port, user, password in DATABASE_URL
psql -U postgres -h localhost -c "SELECT 1"

# Gemini API rate limited
# Check quota at https://ai.google.dev/
# Add retry logic in gemini_service.py

# Virtual environment issues
rm -rf venv
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Migration needed
# When schema changes:
alembic revision --autogenerate -m "Description"
alembic upgrade head

## 🔗 Useful Links

# Gemini API Docs:          https://ai.google.dev/
# FastAPI Docs:             https://fastapi.tiangolo.com/
# SQLAlchemy Async:         https://sqlalchemy.org/
# Pydantic Docs:            https://docs.pydantic.dev/
# PostgreSQL:               https://www.postgresql.org/
# Docker Docs:              https://docs.docker.com/
# BeautifulSoup:            https://www.crummy.com/software/BeautifulSoup/

## 👨‍💻 Development Flow

# 1. Create feature branch
git checkout -b feature/your-feature

# 2. Make changes following async patterns
# 3. Format code
black app/

# 4. Run tests
pytest

# 5. Type check
mypy app/

# 6. Commit
git add .
git commit -m "Add your feature"

# 7. Push and create PR
git push origin feature/your-feature

## 📝 Documentation Commands

# Generate OpenAPI schema
curl http://localhost:8000/openapi.json > openapi.json

# View docs in browser
# Development: http://localhost:8000/docs
# Production: export from /openapi.json

## 🎯 MVP Feature Priorities

# Phase 2 (Must Have):
# - User authentication
# - Master profile management
# - Job application submission
# - Material generation endpoints

# Phase 3 (Should Have):
# - Frontend dashboard
# - PDF export
# - Email notifications
# - Quality checks

# Phase 4 (Nice to Have):
# - Analytics
# - Templates
# - Bulk operations
# - Mobile app

## 📞 Support References

# Project: https://github.com/kiptoo/aditus
# Docs: docs/INDEX.md
# Issues: GitHub Issues
# Email: support@aditus.ke

---
Last Updated: 2026-02-01
