# Aditus (LeAI) - AI Coding Agent Instructions

## Project Overview
**Aditus** is an AI-powered career workflow automation tool for the Kenyan job market. It automates the entire job application pipeline: job data extraction → CV/cover letter generation → Gmail delivery, leveraging Google Gemini AI throughout.

**Core Workflow:** User submits job URL → LLM extracts structured data → Gemini drafts personalized CV/cover letter → User reviews → Sends via Gmail OAuth2 with PDFs attached.

## Architecture

### Stack
- **Backend:** FastAPI (async/await), SQLAlchemy async ORM, PostgreSQL + asyncpg
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI
- **AI:** Google Gemini API (`gemini-1.5-pro`) for all LLM operations
- **Deployment:** Docker Compose with PostgreSQL and Redis containers

### Key Components
- **Job Extraction** ([backend/app/api/job_extractor.py](backend/app/api/job_extractor.py)): Multimodal ingestion (URLs, images, text) with Gemini vision + HTML parsing
- **Master Profile** ([backend/app/db/models.py](backend/app/db/models.py)): User's career data (education, experience, skills) stored as JSON columns
- **Document Generation** ([backend/app/services/gemini_service.py](backend/app/services/gemini_service.py)): Gemini prompts in [backend/app/core/prompts.py](backend/app/core/prompts.py) for tailored CVs/letters
- **Gmail Integration** ([backend/app/services/gmail_service.py](backend/app/services/gmail_service.py)): OAuth2 flow with encrypted token storage using Fernet (AES-256)
- **PDF Export** ([backend/app/utils/pdf_generator.py](backend/app/utils/pdf_generator.py)): ReportLab for ATS-friendly single-column CVs

## Critical Patterns

### 1. Async Database Operations
**Always use async/await for DB queries:**
```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

async def get_user(db: AsyncSession, user_id: int):
    result = await db.execute(select(User).filter(User.id == user_id))
    return result.scalar_one_or_none()
```

### 2. Gemini API Calls
**All prompts live in [backend/app/core/prompts.py](backend/app/core/prompts.py).** Use helper functions:
```python
from app.core.prompts import get_extraction_prompts, get_cv_tailoring_prompts

prompts = get_extraction_prompts()
response = model.generate_content([{"role": "user", "parts": [{"text": prompts["system"]}]}])
```

**Critical:** Job extraction must capture `application_deadline` and `application_email` from Kenyan job boards (often in footers/sidebars).

### 3. JSON Column Structure (Master Profile)
Store structured data in JSON columns:
```python
education = Column(JSON, default=list)  # [{"institution": "", "degree": "", ...}]
experience = Column(JSON, default=list)  # [{"company": "", "title": "", ...}]
```

Access in code: `user.master_profile.education[0]["degree"]`

### 4. Gmail OAuth2 Flow
**Tokens are encrypted before storage:**
```python
from app.services.encryption_service import encrypt_token, decrypt_token

user.gmail_refresh_token = encrypt_token(refresh_token)
decrypted = decrypt_token(user.gmail_refresh_token)
```

**Frontend flow:** Settings → Connect Gmail → Redirects to Google → Callback stores tokens → Applications page can send emails.

### 5. Frontend API Client
Use centralized axios client ([frontend/src/lib/api.ts](frontend/src/lib/api.ts)) with JWT interceptors:
```typescript
const response = await api.jobExtractor.extractFromUrl(url)
```

Auth tokens stored in localStorage, auto-attached to requests, 401 redirects to login.

## Database Migrations
**Manual migrations in [backend/migrations/](backend/migrations/)** (no Alembic yet). Run directly:
```bash
cd backend
python migrations/add_gmail_oauth_fields.py
```

**Pattern:** Each migration file has `async def run_migration()` that executes raw SQL via asyncpg.

## Development Workflows

### Local Setup
```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload  # Runs on :8000

# Frontend  
cd frontend
npm install
npm run dev  # Runs on :3000

# Database (Docker)
docker-compose up postgres -d
```

### Environment Variables
**Backend (.env):**
- `GEMINI_API_KEY` - Required for all AI operations
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` - Gmail OAuth2
- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - For JWT tokens and encryption

**Frontend (.env.local):**
- `NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000`

### Testing Job Extraction
**Use Kenyan job boards:** BrighterMonday, Fuzu, LinkedIn Kenya. Critical fields:
- `application_deadline` (often in fine print)
- `application_email` (may include CC addresses)
- `location` (Nairobi CBD, Remote, Hybrid)

## Common Tasks

### Adding a New API Endpoint
1. Create route in [backend/app/api/](backend/app/api/)
2. Import in [backend/main.py](backend/main.py): `app.include_router(new_router, prefix="/api/v1")`
3. Use dependency injection: `db: AsyncSession = Depends(get_db)`

### Adding Frontend Components
- Place in [frontend/src/components/](frontend/src/components/)
- Use Tailwind + Shadcn patterns (see existing components)
- API calls via `api` client from [frontend/src/lib/api.ts](frontend/src/lib/api.ts)

### Modifying AI Prompts
Edit [backend/app/core/prompts.py](backend/app/core/prompts.py) only. Changes apply immediately (no DB updates needed).

## Project-Specific Conventions

1. **No Alembic:** Manual migrations in [backend/migrations/](backend/migrations/) directory
2. **Kenyan Market Focus:** All prompts/validation tailored for Kenyan job sites (dates, phone formats, locations)
3. **Single-Column CVs:** ATS-friendly format per Kenyan standards (no fancy layouts)
4. **Encrypted Tokens:** Gmail OAuth2 tokens encrypted with app `SECRET_KEY` before DB storage
5. **Admin Panel:** [frontend/src/app/admin/](frontend/src/app/admin/) requires `is_admin=True` flag on User model

## Key Files Reference
- **Config:** [backend/app/core/config.py](backend/app/core/config.py) (settings via Pydantic)
- **Models:** [backend/app/db/models.py](backend/app/db/models.py) (User, MasterProfile, JobApplication, ExtractedJobData)
- **Main App:** [backend/main.py](backend/main.py) (FastAPI app with CORS, lifespan events)
- **Auth Context:** [frontend/src/context/AuthContext.tsx](frontend/src/context/AuthContext.tsx) (JWT management)
- **Quick Reference:** [QUICK_REFERENCE.md](QUICK_REFERENCE.md) (Gmail setup), [DELIVERY_SUMMARY.md](DELIVERY_SUMMARY.md) (recent changes)

## Debugging Tips
- **Database:** Check `docker logs aditus-postgres` or connect via `psql postgresql://postgres:postgres@localhost:5432/aditus`
- **Gemini API errors:** Verify `GEMINI_API_KEY` in backend logs, check response parsing in [backend/app/services/gemini_service.py](backend/app/services/gemini_service.py)
- **Gmail OAuth:** Frontend must match redirect URI in Google Cloud Console (`http://localhost:8000/api/v1/auth/gmail/callback`)
- **Frontend 401s:** Check Network tab for missing/expired JWT tokens
