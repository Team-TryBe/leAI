# 🚀 Aditus - AI-Powered Career Workflow Agent

**Automate your entire job application process for the Kenyan job market** - From saving a job URL to submitting complete, AI-tailored application materials.

> **Status**: MVP Foundation Complete ✅ | Ready for Feature Implementation

---

## 🎯 Project Overview

Aditus is an intelligent career automation platform designed specifically for Kenyan job seekers. It dramatically reduces the time spent on job applications by automating the extraction of job requirements, generation of tailored CVs, personalized cover letters, and cold outreach messages.

### What Aditus Does

```
Job URL → Extraction → CV Generation → Cover Letter → Outreach → Submission
   ↓          ↓           ↓              ↓             ↓          ↓
[Save]   [Scrape &    [Tailor to    [Personalize  [Email &   [Track &
        Parse HTML]  Job Required]  to Company]   LinkedIn]   Review]
```

---

## 🏗️ Tech Stack

### Backend
- **FastAPI** 0.104+ (Async Python web framework)
- **PostgreSQL** 13+ (Database)
- **asyncpg** (Async PostgreSQL driver)
- **SQLAlchemy** 2.0+ (Async ORM)
- **Google Gemini API** (LLM for extraction & generation)
- **WeasyPrint** (PDF generation)
- **BeautifulSoup4 + Trafilatura** (HTML parsing)

### Frontend (Upcoming)
- **Next.js** 14+ (React framework)
- **Tailwind CSS** (Styling)
- **Shadcn UI** (Component library)

---

## 📁 Project Structure

```
leia/
├── 📘 README.md                    (Original project README)
├── 📗 README_ADITUS.md             (This file - Setup guide)
├── 🐳 docker-compose.yml           (Full stack with Docker)
├── 🚀 setup.sh                     (Quick setup script)
├── docs/                           (📚 Complete documentation)
│
├── backend/                        # FastAPI Backend
│   ├── app/
│   │   ├── api/                   # Route handlers (routes.py, etc) - TODO
│   │   ├── core/
│   │   │   ├── config.py          # ✅ Settings & environment
│   │   │   ├── prompts.py         # ✅ Modularized Gemini prompts
│   │   │   └── __init__.py
│   │   ├── db/
│   │   │   ├── database.py        # ✅ Async SQLAlchemy setup
│   │   │   ├── models.py          # ✅ Database models
│   │   │   └── __init__.py
│   │   ├── schemas/
│   │   │   ├── __init__.py        # ✅ Pydantic models
│   │   ├── services/
│   │   │   ├── gemini_service.py  # ✅ Gemini API integration
│   │   │   └── __init__.py
│   │   └── __init__.py
│   ├── main.py                    # ✅ FastAPI entry point
│   ├── requirements.txt           # ✅ Python dependencies
│   ├── .env.example               # ✅ Environment template
│   ├── Dockerfile                 # ✅ Container image
│   └── README.md                  # Backend documentation
│
├── frontend/                      # Next.js Frontend (placeholder)
│
└── docs/                          # 📚 Documentation (all guides here)
    ├── INDEX.md                   # Documentation index
    ├── SETUP_SUMMARY.md           # What was built
    ├── QUICK_REFERENCE.md         # Common commands
    ├── PROJECT_TREE.md            # Visual structure
    ├── IMPLEMENTATION_CHECKLIST.md # Feature roadmap
    └── MANIFEST.md                # File inventory
```

✅ = Core MVP files completed

---

## ⚡ Quick Start

### Prerequisites
```
- Python 3.11+
- PostgreSQL 13+
- Gemini API key (free from https://ai.google.dev/)
- Docker & Docker Compose (optional but recommended)
```

### 1. Automated Setup
```bash
bash setup.sh
```

### 2. Manual Backend Setup
```bash
cd backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add GEMINI_API_KEY

# Start PostgreSQL
docker run --name aditus-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=aditus \
  -p 5432:5432 \
  -d postgres:15

# Start server
uvicorn main:app --reload --port 8000
```

### 3. Access API
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 4. Docker Setup
```bash
docker-compose up -d
```

---

## 🗄️ Database Schema

### Core Models
- **User**: User account and basic profile
- **MasterProfile**: Complete career data (education, experience, skills, projects, referees)
- **JobApplication**: Main workflow entity (pending → extracting → drafting → review → sent)
- **ExtractedJobData**: LLM-extracted job posting structure
- **ApplicationReview**: User feedback on generated materials
- **ProcessingLog**: Audit trail for background tasks

---

## 🧠 Key Features (Implementation Roadmap)

### ✅ Phase 1: Foundation (COMPLETE)
- [x] Async database with SQLAlchemy + asyncpg
- [x] Pydantic schemas for validation
- [x] Modularized AI prompts
- [x] Gemini service integration
- [x] FastAPI entry point
- [x] Docker support

### 📋 Phase 2: Core API Routes
- [ ] Authentication & user management
- [ ] Master profile CRUD operations
- [ ] Job application submission
- [ ] Material generation endpoints

### 🎨 Phase 3: Frontend
- [ ] Next.js dashboard
- [ ] Application tracker UI
- [ ] Material review interface
- [ ] PDF preview

### 🔄 Phase 4: Enhancement
- [ ] Background job queue (ARQ)
- [ ] Email notifications
- [ ] Analytics
- [ ] Mobile app

---

## 🔧 Configuration

Create `.env` file (or copy from `.env.example`):

```env
GEMINI_API_KEY=your_api_key_here
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/aditus
SECRET_KEY=your-secret-key
DEBUG=False
```

See [backend/.env.example](../backend/.env.example) for complete reference.

---

## 📚 API Endpoints

### Health
- `GET /health` - Application status
- `GET /health/db` - Database connectivity

### MVP Routes (Coming Soon)
- **User**: Register, Login, Profile
- **Master Profile**: CRUD, CV import
- **Applications**: Submit URL, View, List, Update status
- **Generation**: Extract, Generate CV, Cover Letter, Outreach
- **Export**: Download PDF

Full docs at `/docs` when server running.

---

## 🚀 Development

### Run Tests
```bash
cd backend
pytest
```

### Code Quality
```bash
black app/          # Format
flake8 app/         # Lint
mypy app/           # Type check
```

### Database Migrations
```bash
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

---

## 📝 Documentation

All documentation is in the `docs/` folder:
- [docs/INDEX.md](./INDEX.md) - Documentation index
- [docs/SETUP_SUMMARY.md](./SETUP_SUMMARY.md) - What was built
- [docs/QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Common commands
- [docs/PROJECT_TREE.md](./PROJECT_TREE.md) - Project structure
- [docs/IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) - Feature roadmap
- [docs/MANIFEST.md](./MANIFEST.md) - Complete inventory
- [backend/README.md](../backend/README.md) - Backend details

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Database connection error | Check DATABASE_URL in .env; ensure PostgreSQL running |
| Gemini API error | Verify GEMINI_API_KEY is set and valid |
| Port 8000 in use | Change SERVER_PORT in .env or: `lsof -i :8000` |
| Virtual env issues | Recreate: `rm -rf venv && python3.11 -m venv venv` |

---

## 📝 License

MIT License

---

## 🙏 Made for Kenyan Job Seekers

Built with ❤️ using FastAPI, PostgreSQL, and Google Gemini AI

- **Docs**: [docs/](./INDEX.md)
- **Issues**: Report via GitHub
- **Contact**: support@aditus.ke
