# Job Extractor - The "Aditus Engine" 🚀

## Quick Start

✅ **Just added Firecrawl API key?**

1. Paste your key in `/backend/.env`:
   ```env
   FIRECRAWL_API_KEY=your_key_here
   ```

2. Restart backend: `uvicorn main:app --reload`

3. Try extracting from BrighterMonday or Fuzu ✨

Done! The system automatically uses Firecrawl for better extraction.

---

## Overview

The Job Extractor is a multimodal AI-powered system that extracts structured job data from various sources:

- **URL Scraping**: BrighterMonday, Fuzu, MyJobMag, LinkedIn, and other job boards
- **Screenshot OCR**: WhatsApp forwards, Instagram posts, physical posters
- **Manual Input**: Copy-paste from PDFs or any text source

## Architecture

### Backend (`/backend/app/api/job_extractor.py`)

**Key Components:**

1. **Multi-Channel Ingestion**
   - Channel A (URLs): Uses Firecrawl API (with Jina AI Reader fallback)
   - Channel B (Images): Gemini 1.5 Flash multimodal vision
   - Channel C (Text): Direct text analysis

2. **AI Extraction**
   - Uses Google Gemini 1.5 Flash for intelligent extraction
   - Structured output via custom prompt engineering
   - Handles Kenyan job board quirks (deadlines, formats, etc.)

3. **Data Persistence**
   - Saves to PostgreSQL `extracted_job_data` table
   - Links to job applications workflow

**Endpoints:**

```
POST /api/v1/job-extractor/extract
- Accepts: url (form), image (file), raw_text (form)
- Returns: ExtractedJobDataResponse

GET /api/v1/job-extractor/recent
- Returns: List of recent extractions (limit=10)
```

### Frontend (`/frontend/src/app/dashboard/job-extractor/page.tsx`)

**Features:**

- **Mode Selection**: Toggle between URL, Image, Manual input
- **Real-time Preview**: Shows image previews before upload
- **Structured Display**: Beautiful cards showing extracted data
- **Error Handling**: Clear error messages with retry options
- **Next Steps**: Direct link to start application with extracted data

## Setup

### 1. Google Gemini API (REQUIRED)

**Get Your API Key:**
1. Visit: https://ai.google.dev/
2. Sign in with Google account
3. Go to "Get API Key" → "Create new API key"
4. Copy the key and add to `/backend/.env`:
   ```env
   GEMINI_API_KEY=your_key_here
   ```

**What it does:**
- Extracts structured job data from text/images
- Handles all three modes (URL, image, manual text)
- Processes job requirements, salary, location, etc.
- Cost: FREE (generous free tier)

---

### 2. Firecrawl API (RECOMMENDED for best results)

**Get Your API Key:**
1. Visit: https://www.firecrawl.dev/
2. Sign up for free account
3. Go to dashboard → copy your API key
4. Add to `/backend/.env`:
   ```env
   FIRECRAWL_API_KEY=your_key_here
   ```

**What it does:**
- Fetches job posting HTML/content from URLs
- Handles JavaScript-rendered pages
- Extracts clean markdown optimized for AI
- Built-in anti-blocking (rotates user agents, proxies)

**Best Use Cases:**
| Site | Firecrawl? | Why |
|------|-----------|-----|
| BrighterMonday | ⭐⭐⭐ **Recommended** | JavaScript-heavy, modern layout |
| Fuzu | ⭐⭐⭐ **Recommended** | Dynamic content loading |
| MyJobMag | ⭐⭐ Optional | Works fine with Jina AI |
| LinkedIn | ❌ Won't work | Requires login, use screenshot instead |

**Cost Analysis:**
- Free tier: 500 requests/month (enough for ~16 extractions per day)
- Paid: $0.10 per request (after free tier)
- Jina AI fallback: Completely free if you skip Firecrawl

**Recommendation:**
✅ Use Firecrawl for BrighterMonday, Fuzu → Better extraction quality  
✅ Skip Firecrawl for MyJobMag → Jina AI works fine  
❌ Never works with LinkedIn → Use screenshot mode instead  

---

### 3. Scraping Hierarchy (Automatic Fallback)

When you submit a URL, the system tries in this order:

```
1. Firecrawl API (if FIRECRAWL_API_KEY is set)
   ✓ Best for JavaScript-heavy sites
   ✓ Handles anti-scraping measures
   ✗ Costs $0.10 per request

2. Jina AI Reader (always available)
   ✓ Free
   ✓ Works for most job boards
   ✗ Struggles with JS-rendered content

3. Basic HTTP (last resort)
   ✓ No dependencies
   ✗ Often blocked or incomplete
```

**Smart Decision Tree:**
- BrighterMonday/Fuzu? → Set FIRECRAWL_API_KEY ✅
- MyJobMag/static sites? → Skip Firecrawl, use free Jina ✅
- LinkedIn? → Switch to screenshot mode 📸
- Any site? → Manual copy-paste mode works always 📝

---

### 4. Installation

```bash
cd backend
pip install -r requirements.txt
```

All dependencies already included!

### 5. Start Backend

```bash
cd backend
uvicorn main:app --reload
```

Check logs for `Routes: ['/job-extractor/extract', '/job-extractor/recent']` ✅

### 3. Start Services

```bash
# Backend
cd backend
source ~/venv/bin/activate
uvicorn main:app --reload

# Frontend
cd frontend
npm run dev
```

### 4. Access

Navigate to: `http://localhost:3000/dashboard/job-extractor`

## Usage Examples

### Example 1: BrighterMonday URL

```
Input: https://www.brightermonday.co.ke/job/software-engineer-123456

Extracts:
- Job Title: "Software Engineer"
- Company: "Tech Corp Kenya"
- Requirements: ["3+ years Python", "Django/Flask", "SQL"]
- Skills: ["AWS", "Docker", "Git"]
- Location: "Nairobi, Kenya"
- Salary: "KES 120,000 - 180,000"
```

### Example 2: WhatsApp Screenshot

```
Upload: Photo of job posting forwarded on WhatsApp

Extracts:
- Reads text from image using OCR
- Parses deadline ("Applications close Friday")
- Extracts contact email/phone
- Identifies company from letterhead
```

### Example 3: Manual Paste

```
Paste: Full job description from PDF

Extracts:
- All requirements and responsibilities
- Parses unstructured text into JSON
- Identifies key skills mentioned
- Determines experience level
```

## Kenyan Job Board Support

### BrighterMonday
- Scrapes full job description
- Handles login-walled content
- Extracts application links

### Fuzu
- Focuses on "Cultural Fit" sections
- Extracts personality requirements
- Identifies soft skills emphasis

### MyJobMag / Campus Biz
- Parses relative deadlines ("next Friday")
- Handles casual language
- Extracts email/phone applications

### LinkedIn
- **Note**: Requires ProxyCurl or Bright Data for anti-blocking
- Basic scraping may be blocked
- Recommended: Manual screenshot upload

## Data Model

### ExtractedJobData Schema

```python
{
  "job_title": str,
  "company_name": str,
  "location": str,
  "job_description": str,
  "key_requirements": list[str],
  "preferred_skills": list[str],
  "nice_to_have": list[str],
  "job_level": str,  # Junior, Mid, Senior, Lead
  "employment_type": str,  # Full-time, Contract, etc.
  "salary_range": str | None,
  "application_deadline": datetime | None,
  "responsibilities": list[str],
  "benefits": list[str],
  "company_description": str | None
}
```

## Error Handling

### Common Errors

1. **"GEMINI_API_KEY not configured"**
   - Solution: Add `GEMINI_API_KEY` to `.env`

2. **"Failed to fetch URL"**
   - Check internet connection
   - URL might be blocked/paywalled
   - Try screenshot upload instead

3. **"Failed to parse AI response"**
   - Rare Gemini formatting error
   - Retry extraction
   - Report if persistent

4. **Image too large**
   - Max 10MB supported
   - Compress image before upload

## Future Enhancements

- [ ] LinkedIn integration via ProxyCurl
- [ ] Batch URL processing
- [ ] Auto-save to job applications
- [ ] Custom extraction prompts per user
- [ ] Support for video job posts (TikTok)
- [ ] Multi-language support (Swahili)

## Performance

- **URL Extraction**: 3-8 seconds
- **Image Extraction**: 2-5 seconds
- **Text Extraction**: 1-3 seconds

Depends on:
- Content length
- Gemini API response time
- Network speed

## Security

- All data stored in PostgreSQL with user isolation
- API keys stored in environment (never client-side)
- Image uploads validated (size, type)
- SQL injection protected via SQLAlchemy ORM

## Cost Optimization

**Gemini API Pricing (as of 2024):**
- Free tier: 60 requests/minute
- Paid: $0.00025 per 1K characters

**Estimated Cost per Extraction:**
- Average job post: ~2,000 characters
- Cost: $0.0005 (half a cent)
- 100 extractions = $0.05

**Recommendation:**
Start with free tier, upgrade only when hitting rate limits.

## Troubleshooting

### Backend won't start
```bash
# Check if all dependencies installed
pip install -r requirements.txt

# Verify database connection
psql -U postgres -d aditus -c "SELECT 1;"
```

### Frontend compilation errors
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run dev
```

### Extraction always fails
```bash
# Test Gemini API directly
python3 << EOF
import google.generativeai as genai
import os
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-1.5-flash')
response = model.generate_content("Hello")
print(response.text)
EOF
```

## Support

For issues or questions:
1. Check this README
2. Review backend logs: `tail -f backend.log`
3. Check browser console (F12)
4. Open GitHub issue with error details

---

**Built with:** FastAPI + Google Gemini + Next.js + PostgreSQL
**License:** MIT
**Version:** 1.0.0
