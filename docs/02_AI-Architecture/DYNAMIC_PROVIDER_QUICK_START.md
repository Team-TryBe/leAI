# ⚡ Dynamic Provider System - Quick Start

## TL;DR

✅ **DONE:** New provider keys added via admin UI are now used immediately (no restart needed)

---

## 🚀 Quick Start (3 Steps)

### Step 1: Run Migration (One-Time Setup)
```bash
cd /home/caleb/kiptoo/trybe/leAI/backend
python migrations/add_initial_gemini_provider.py
```

**Expected Output:**
```
✅ Migration completed successfully!
   Provider ID: 1
   Provider Type: gemini
   Model: models/gemini-2.5-flash
```

### Step 2: Start Backend (if not running)
```bash
cd /home/caleb/kiptoo/trybe/leAI/backend
source venv/bin/activate  # or your virtualenv
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Step 3: Verify in Admin UI
1. Open browser: `http://localhost:3000/admin/providers`
2. You should see 1 active Gemini provider
3. Click "Test" → Should show green success message

**Done! ✅ Your system now uses dynamic provider selection.**

---

## 📝 How to Add a New Provider

### Via Admin UI (Recommended)
1. Go to `http://localhost:3000/admin/providers`
2. Fill in the "Add New Provider" form:
   - **Provider Type:** Gemini / OpenAI / Claude
   - **API Key:** Paste your key
   - **Model Name:** `models/gemini-2.5-flash` or `gpt-4o-mini` etc.
   - **Active:** ✅ Check this
   - **Default:** ✅ Check this (if you want it as primary)
3. Click "Add Provider"
4. Click "Test" to verify it works

**That's it!** Next API request will use the new provider immediately.

---

## 🧪 Quick Test

```bash
# Get your JWT token (login to your app first, grab from browser DevTools)
TOKEN="your_jwt_token_here"

# Test job extraction
curl -X POST http://127.0.0.1:8000/api/v1/job-extractor/extract \
  -H "Authorization: Bearer $TOKEN" \
  -F "url=https://fuzu.com/job/some-job-id"
```

**Check which provider was used:**
```bash
psql postgresql://postgres:postgres@localhost:5432/aditus \
  -c "SELECT p.provider_type, p.model_name, l.created_at 
      FROM ai_provider_usage_logs l 
      JOIN ai_provider_configs p ON l.provider_config_id = p.id 
      ORDER BY l.created_at DESC LIMIT 5;"
```

---

## 🔍 Verify It's Working

### Test 1: Current Provider
```bash
psql postgresql://postgres:postgres@localhost:5432/aditus \
  -c "SELECT provider_type, model_name, is_active, is_default 
      FROM ai_provider_configs 
      WHERE is_active = true;"
```

**Expected:**
```
 provider_type |       model_name        | is_active | is_default
---------------+-------------------------+-----------+------------
 gemini        | models/gemini-2.5-flash | t         | t
```

### Test 2: Usage Logs
```bash
psql postgresql://postgres:postgres@localhost:5432/aditus \
  -c "SELECT COUNT(*) as total_requests, 
             SUM(total_tokens) as total_tokens 
      FROM ai_provider_usage_logs;"
```

### Test 3: Switch Providers (No Restart)
1. Add new provider via admin UI (e.g., OpenAI)
2. Make it active and default
3. Extract another job
4. Check logs → Should show OpenAI was used

**Key Point:** No backend restart needed! ✨

---

## 📚 Full Documentation

- **Implementation Details:** [DYNAMIC_PROVIDER_IMPLEMENTATION.md](DYNAMIC_PROVIDER_IMPLEMENTATION.md)
- **Testing Guide:** [DYNAMIC_PROVIDER_TESTING.md](DYNAMIC_PROVIDER_TESTING.md)
- **Complete Summary:** [IMPLEMENTATION_COMPLETE_SUMMARY.md](IMPLEMENTATION_COMPLETE_SUMMARY.md)

---

## 🔧 Troubleshooting

### "No active provider configured"
**Fix:**
```bash
cd backend
python migrations/add_initial_gemini_provider.py
```

### Provider test fails
**Fix:**
1. Check API key is correct
2. Verify API key has credits/quota
3. Check internet connection

### New provider not being used
**Fix:**
1. Make sure `is_active = true` in database
2. Make sure `is_default = true` (or it's the only active one)
3. Check backend logs for errors

---

## 📊 What Changed

**Files Modified:**
- ✅ `backend/app/services/ai_orchestrator.py` - API key decryption
- ✅ `backend/app/api/job_extractor.py` - Use orchestrator (3 places)
- ✅ `backend/app/api/cv_drafter.py` - Use orchestrator
- ✅ `backend/app/api/cover_letter.py` - Use orchestrator

**Files Created:**
- ✅ Migration script
- ✅ 3 documentation files (1,550+ lines)

**Zero Errors:** ✅ All files validated

---

## 🎯 Key Benefits

1. **Immediate Adoption** - New keys used instantly, no restart
2. **Multi-Provider** - Switch between Gemini, OpenAI, Claude
3. **Secure** - API keys encrypted (Fernet AES-256)
4. **Observable** - All usage logged with metrics
5. **Safe** - Graceful fallback to environment variables

---

**Status:** ✅ **Complete - Ready to Use**

**Questions?** Check the full docs or test using the comprehensive guide.
