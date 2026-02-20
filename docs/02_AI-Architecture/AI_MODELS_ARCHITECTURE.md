# AI Models Architecture & Current Implementation

## Overview
Aditus uses Google Gemini as the core LLM across job extraction and document generation. The current implementation mixes **direct Gemini client usage in API routes** with a **centralized Gemini service** that is defined but not wired into routes yet.

## High-Level Architecture

```
User Input
  ├── Job URL / Raw Text / Image
  │     └── Job Extractor API → Gemini (text + multimodal) → JSON Parse → DB
  └── Job ID + Master Profile
        ├── CV Drafter API → Gemini → JSON Parse → CV Draft
        └── Cover Letter API → Gemini → JSON Parse → Letter Body
```

## Model Inventory (Current)

| Area | Model | Where | Notes |
|---|---|---|---|
| Job Extraction | models/gemini-2.5-flash | backend/app/api/job_extractor.py | Multimodal (image) + text (URL/manual). |
| CV Drafting | models/gemini-2.5-flash | backend/app/api/cv_drafter.py | Generates structured CV JSON. |
| Cover Letter | models/gemini-2.5-flash | backend/app/api/cover_letter.py | Generates cover letter body JSON. |
| Central Service (unused) | gemini-1.5-pro (default) | backend/app/services/gemini_service.py + backend/app/core/config.py | Defined service layer; not currently invoked by routes. |

## Prompt Sources

### Route-Embedded Prompts (Active)
- Job Extraction prompt lives inside the Job Extractor API route for Kenyan market specifics.
  - File: [backend/app/api/job_extractor.py](backend/app/api/job_extractor.py)
- CV Drafting prompt lives inside the CV Drafter route.
  - File: [backend/app/api/cv_drafter.py](backend/app/api/cv_drafter.py)
- Cover Letter prompt lives inside the Cover Letter route.
  - File: [backend/app/api/cover_letter.py](backend/app/api/cover_letter.py)

### Centralized Prompts (Available but Not Wired)
- Modular prompts are defined for extraction, CV tailoring, cover letters, and outreach.
  - File: [backend/app/core/prompts.py](backend/app/core/prompts.py)
- These are consumed by the Gemini service class but are not used by API routes yet.
  - File: [backend/app/services/gemini_service.py](backend/app/services/gemini_service.py)

## Detailed Data Flow (Current Implementation)

### 1) Job Extraction
**Inputs:** URL, image, or raw text

**Pipeline:**
1. URL is scraped via Firecrawl or Jina Reader (fallback).
2. Image uploads are passed as bytes to Gemini using the multimodal API.
3. Gemini returns structured JSON via a Kenya-specific extraction prompt.
4. JSON is validated and saved to the database.

**Key Files:**
- Job extractor route and prompt: [backend/app/api/job_extractor.py](backend/app/api/job_extractor.py)

### 2) CV Drafting
**Inputs:** Job ID + Master Profile

**Pipeline:**
1. CV prompt is constructed from the Master Profile + extracted job data.
2. Gemini returns a structured JSON CV draft.
3. Response is parsed, metadata is added, then returned to the client.

**Key Files:**
- CV drafter route and prompt: [backend/app/api/cv_drafter.py](backend/app/api/cv_drafter.py)

### 3) Cover Letter Generation
**Inputs:** Job ID + Master Profile

**Pipeline:**
1. Cover letter prompt is constructed from profile + job details.
2. Gemini returns structured JSON (body paragraphs + key points).
3. Text is post-processed to remove duplicate greetings/sign-offs.

**Key Files:**
- Cover letter route and prompt: [backend/app/api/cover_letter.py](backend/app/api/cover_letter.py)

## Configuration
- Gemini API key and default model live in settings.
  - File: [backend/app/core/config.py](backend/app/core/config.py)

## Notes on Architecture Gaps
- A centralized `GeminiService` exists but is not currently injected into API routes.
- Prompts are duplicated between route files and centralized prompt modules.

## Recommended Target Architecture (Best Practice)

### 1) Unified AI Service Layer
**Goal:** single entry point for all model calls, with model routing, quota checks, caching, and logging.

**Suggested design (backend):**
- `AIOrchestrator` (new service): decides model, handles retries, caches, and logging.
- `ModelRouter` (strategy): selects model by plan + task type.
- `PromptRegistry`: only one source of prompts (move route prompts into [backend/app/core/prompts.py](backend/app/core/prompts.py)).
- `Providers`: Gemini provider (current), optional additional providers later.

```
API Route → AIOrchestrator
  ├── ModelRouter(plan, task)
  ├── PromptRegistry(task)
  ├── Provider.generate()
  ├── JSON parse/validate
  └── Metrics + Audit Logs
```

### 2) Task-Based Model Selection
Different tasks have different quality vs cost needs. Use cheaper models for extraction and drafts; reserve premium for final outputs.

**Example task tiers:**
- Extraction (URL/text/image): fast, cost-efficient model
- Drafting (CV/cover letter): mid-tier model
- Final polishing/QA (optional): higher-quality model for paid plans

## Plan-Based Model Routing (Subscription-Aware)
You can dynamically select models based on user plan **and** task type.

### Suggested Routing Matrix

| Plan | Extraction | Drafting | Polishing/QA | Notes |
|---|---|---|---|---|
| Free | gemini-2.5-flash | gemini-2.5-flash | Disabled | Lowest cost, fastest. |
| Pro Monthly | gemini-2.5-flash | gemini-1.5-pro | Enabled (limited) | Better quality for documents. |
| Pro Annual | gemini-2.5-flash | gemini-1.5-pro | Enabled (higher) | Highest quality. |

### Plan-Aware Routing Logic (Concept)
```
task = {extraction | drafting | polishing}
plan = {free | pro_monthly | pro_annual}
model = MODEL_POLICY[plan][task]
```

### Where to Implement
- Create a plan-aware `ModelRouter` that accepts `user.plan` and `task_type`.
- Centralize model policies in config (env + DB override):
  - `AI_MODEL_POLICY_JSON` in env for defaults
  - Admin override table for production tuning

## Scalability & Cost Controls

### 1) Usage Quotas + Rate Limits
- Enforce per-plan request limits (daily/monthly tokens or calls).
- Deny or downgrade model when quota is exceeded.
- Implement in the `AIOrchestrator` before model calls.

### 2) Caching & Reuse
- Cache extraction results by URL hash to avoid repeated calls.
- Cache CV/cover letter drafts for the same job + profile version.
- Use Redis for cache (already in Docker stack).

### 3) Background Processing
- For heavy tasks, run in background queues (Celery/Arq/Taskiq).
- Return a job ID to the frontend and poll for completion.

### 4) Prompt Versioning
- Store prompt versions with metadata (v1, v2, …) in `prompts.py`.
- Log prompt version in the response for audit and rollback.

### 5) Observability & Cost Visibility
- Log per-call: `user_id`, `plan`, `task`, `model`, `latency`, `tokens`, `cost_estimate`.
- Build a simple admin dashboard for usage and spend.

## Continuous Maintenance Strategy

### 1) Model Evaluation & A/B Testing
- Keep a gold test set of job posts + expected outputs.
- Run weekly offline evals to compare models.
- A/B test prompts on small traffic slice for quality.

### 2) Safe Rollouts
- Use feature flags for new models and prompts.
- Roll out per plan or per percent of traffic.

### 3) Provider Redundancy
- Abstract provider interface for future additions (OpenAI, Anthropic).
- Allow fallback to a cheaper model on provider outage.

### 4) Data Privacy & Security
- Avoid storing raw job postings beyond necessary.
- Strip PII where possible before model calls.
- Encrypt any sensitive logs.

## Suggested Implementation Steps (Incremental)
1. Route all AI calls through a single `AIOrchestrator`.
2. Move prompts from routes into [backend/app/core/prompts.py](backend/app/core/prompts.py).
3. Introduce plan-aware `ModelRouter` + config-driven model policy.
4. Add metrics logging and usage limits.
5. Implement caching for extraction and document generation.

If you want, I can implement these pieces starting with the plan-aware model router and centralized prompts.
