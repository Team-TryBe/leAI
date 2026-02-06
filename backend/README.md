# 🚀 Aditus - Career Workflow Agent

**Automate your job application process for the Kenyan job market.** From job URL to complete application materials in minutes.

## 📋 Overview

Aditus is an AI-powered career automation tool that streamlines the entire job application workflow:

1. **📎 Ingestion**: Submit job URLs from BrighterMonday, LinkedIn, Fuzu, etc.
2. **🔍 Extraction**: LLM-powered HTML scraping to extract structured job data
3. **✨ Generation**: AI-tailored CV, Cover Letter, and Cold Outreach messages
4. **📊 Review**: Dashboard to review, edit, and track applications
5. **📤 Export**: PDF-ready documents optimized for ATS systems

## 🏗️ Architecture

```
aditus/
├── backend/                 # FastAPI async backend
│   ├── app/
│   │   ├── api/            # API route handlers (todo)
│   │   ├── db/
│   │   │   ├── models.py   # SQLAlchemy async models
│   │   │   └── database.py # PostgreSQL + asyncpg config
│   │   ├── core/
│   │   │   ├── config.py   # Environment & settings
│   │   │   └── prompts.py  # Modularized Gemini prompts
│   │   ├── schemas/        # Pydantic models for validation
│   │   └── services/       # Business logic (Gemini, PDF, etc)
│   ├── main.py            # FastAPI entry point
│   └── requirements.txt    # Python dependencies
└── frontend/              # Next.js frontend (todo)
```

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11+) with async/await
- **Database**: PostgreSQL with SQLAlchemy async ORM + asyncpg driver
- **AI/LLM**: Google Generative AI (Gemini API)
- **PDF Generation**: WeasyPrint (ATS-friendly CVs)
- **Background Tasks**: FastAPI BackgroundTasks (MVP) → ARQ (production)
- **Web Scraping**: BeautifulSoup4, Trafilatura

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + Shadcn UI
- **State Management**: React hooks / TanStack Query

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- PostgreSQL 13+
- Node.js 18+ (for frontend)
- Gemini API key from [Google AI Studio](https://ai.google.dev/)

### Backend Setup

1. **Clone and navigate to backend**
   ```bash
   cd backend
   ```

2. **Create Python virtual environment**
   ```bash
   python3.11 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your settings:
   ```env
   GEMINI_API_KEY=your_api_key_here
   DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/aditus
   SECRET_KEY=your-secret-key
   FRONTEND_URL=http://localhost:3000
   ```

5. **Setup PostgreSQL Database**
   ```bash
   # Create database
   createdb aditus
   
   # Or use Docker
   docker run --name aditus-db \
     -e POSTGRES_PASSWORD=postgres \
     -e POSTGRES_DB=aditus \
     -p 5432:5432 \
     -d postgres:15
   ```

6. **Start FastAPI server**
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   
   Visit: http://localhost:8000/docs (Swagger UI)

### Docker Setup (Recommended)

```bash
# Start both backend and database
docker-compose up -d

# Run migrations (if using Alembic)
docker-compose exec backend alembic upgrade head
```

See [docker-compose.yml](docker-compose.yml) for configuration.

## 📚 API Endpoints (MVP Roadmap)

### Health Check
- `GET /health` - Application health status
- `GET /health/db` - Database connectivity check

### User Management (To be implemented)
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile

### Master Profile (To be implemented)
- `GET /api/master-profile` - Get master career profile
- `PUT /api/master-profile` - Update master profile
- `POST /api/master-profile/upload-cv` - Import from CV file

### Job Applications (To be implemented)
- `POST /api/applications/submit-job-url` - Submit job URL (starts workflow)
- `GET /api/applications/{id}` - Get application details
- `GET /api/applications` - List all applications
- `PATCH /api/applications/{id}/status` - Update application status

### AI Generation (To be implemented)
- `GET /api/applications/{id}/extracted-data` - Get extracted job data
- `POST /api/applications/{id}/generate-cv` - Generate tailored CV
- `POST /api/applications/{id}/generate-cover-letter` - Generate cover letter
- `POST /api/applications/{id}/generate-outreach` - Generate email + LinkedIn

### PDF Export (To be implemented)
- `GET /api/applications/{id}/export-cv` - Download CV as PDF
- `GET /api/applications/{id}/export-cover-letter` - Download letter as PDF

## 🗄️ Database Schema

### Key Models
- **User**: User account with basic profile
- **MasterProfile**: Complete career data (education, experience, skills, projects, referees)
- **JobApplication**: Workflow entity tracking each application through statuses
- **ExtractedJobData**: LLM-extracted structured job posting data
- **ApplicationReview**: User feedback on generated materials
- **ProcessingLog**: Audit trail for background tasks

### Application Statuses
- `pending` - Awaiting processing
- `extracting` - LLM extracting job data
- `drafting` - Generating CV/letter/outreach
- `review` - Awaiting user approval
- `sent` - Application submitted
- `archived` - Old/completed applications

## 🧠 AI Prompts Architecture

All Gemini API prompts are **modularized in `app/core/prompts.py`**:

### Prompt Categories
1. **Job Extraction** - Parse HTML → structured JSON
2. **CV Tailoring** - Master profile + job requirements → tailored CV
3. **Cover Letter** - Candidate + job → personalized letter
4. **Cold Outreach** - Email + LinkedIn messages
5. **Quality Checks** - Validate generated content

### Why Modularized?
- ✅ Easy A/B testing
- ✅ Version control for prompt changes
- ✅ Reuse across different AI providers
- ✅ Better maintenance and debugging
- ✅ Support for prompt iterations

## 🔌 Async/Await Implementation

The backend uses **full async/await** with SQLAlchemy:

```python
# Database operations are fully async
async def get_job_application(app_id: int, db: AsyncSession):
    result = await db.execute(
        select(JobApplication).where(JobApplication.id == app_id)
    )
    return result.scalars().first()

# FastAPI routes are async-first
@app.post("/api/applications/submit-job-url")
async def submit_job_url(
    data: JobApplicationCreate,
    db: AsyncSession = Depends(get_db)
):
    # All database operations await
    ...
```

### Database Layer
- **Driver**: asyncpg (async PostgreSQL)
- **ORM**: SQLAlchemy with async session
- **Connection**: NullPool for development, connection pooling for production

## 📝 Environment Variables

See `.env.example` for complete reference. Key variables:

```env
# Gemini API
GEMINI_API_KEY=sk-...
GEMINI_MODEL=gemini-1.5-pro

# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db

# Security
SECRET_KEY=your-secret-key-min-32-chars

# Paths
UPLOAD_DIR=uploads
PDF_OUTPUT_DIR=pdfs
```

## 🧪 Testing

```bash
# Run tests
pytest

# With coverage
pytest --cov=app

# Async tests
pytest -v tests/ -k "async"
```

## 🚢 Deployment

### Production Checklist
- [ ] Set `DEBUG=False`
- [ ] Change `SECRET_KEY`
- [ ] Use environment variables for all secrets
- [ ] Configure PostgreSQL connection pooling
- [ ] Set up ARQ for background tasks (instead of BackgroundTasks)
- [ ] Enable HTTPS/SSL
- [ ] Set proper CORS origins
- [ ] Configure logging and monitoring
- [ ] Set up PDF storage (S3, GCS, etc.)

### Scaling Strategy
1. **MVP**: FastAPI BackgroundTasks
2. **Growth**: ARQ + Redis for background job queue
3. **Scale**: Kubernetes + managed PostgreSQL + Cloud Storage

## 📖 Documentation

- **FastAPI Docs**: http://localhost:8000/docs
- **OpenAPI Schema**: http://localhost:8000/openapi.json
- **API Routes**: See `app/api/` (to be implemented)

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes following async patterns
3. Test with: `pytest`
4. Submit PR

## 📝 License

MIT License - See LICENSE file

## 🙋 Support

For issues or questions:
- GitHub Issues: [Aditus/issues](https://github.com/kiptoo/aditus/issues)
- Email: support@aditus.ke

---

**Made for Kenyan job seekers. Built with ❤️ using FastAPI, PostgreSQL, and Gemini AI.**
