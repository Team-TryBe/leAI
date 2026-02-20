# Automatic PDF Generation and Display Implementation

## Overview
Updated the application system to automatically generate professional PDFs for CVs and cover letters when applications are queued, and display them as embedded PDFs on the applications page.

## Changes Made

### Backend Changes

#### 1. Created PDF Generator Utility (`/backend/app/utils/pdf_generator.py`)
- **Library**: WeasyPrint (already in requirements)
- **Functions**:
  - `generate_cv_pdf(cv_data: dict) -> bytes`: Generates professional CV PDF from structured CV data with proper styling and layout
  - `generate_cover_letter_pdf(cover_letter_data: dict, full_name: str) -> bytes`: Generates professional cover letter PDF with business letter format
- **Features**:
  - Professional HTML/CSS styling for print
  - Responsive typography and spacing
  - Colored section headers (indigo #6366f1)
  - Proper formatting for all CV sections (experience, education, skills, certifications, projects, referees)

#### 2. Updated Applications API (`/backend/app/api/applications.py`)
- **Imports**: Added `os` and PDF generator imports
- **Queue Endpoint (`POST /api/v1/applications/queue`)**:
  - Generates CV PDF and saves to `pdfs/` directory with timestamped filename
  - Generates Cover Letter PDF (if provided) and saves to `pdfs/` directory
  - Stores PDF file paths in database (`tailored_cv_pdf_path`, `cover_letter_pdf_path`)
  - Returns success response with application ID
- **Get Endpoint (`GET /api/v1/applications`)**:
  - Returns `cv_pdf_path` and `cover_letter_pdf_path` in response for each application
- **New Endpoint (`GET /api/v1/applications/{application_id}/pdf/{pdf_type}`)**:
  - Allows downloading generated PDFs by type ("cv" or "cover_letter")
  - Returns FileResponse with proper MIME type
  - Validates user ownership before serving file

#### 3. Updated ApplicationResponse Model
- Added fields: `cv_pdf_path` and `cover_letter_pdf_path`
- Returns actual PDF file paths instead of HTML preview content

### Frontend Changes

#### Updated Applications Page (`/frontend/src/app/dashboard/applications/page.tsx`)
- **Application Interface**: Added `cv_pdf_path` and `cover_letter_pdf_path` fields
- **CV Tab**:
  - Changed from HTML preview to embedded PDF viewer using `<embed>` tag
  - Added download button to download PDF directly
  - Falls back to "No CV available" message if no PDF path
- **Cover Letter Tab**:
  - Changed from text preview to embedded PDF viewer
  - Added download button for PDF
  - Falls back to "No cover letter available" message if no PDF path
- **Email Tab**: No changes (still shows email information)

## User Flow

1. **Draft & Validate**: User edits CV/cover letter on preview page
2. **Queue Application**: User clicks "Validate & Queue"
   - Backend generates PDF from CV data
   - Backend generates PDF from cover letter data
   - Both PDFs saved to `pdfs/` directory
   - Application stored with PDF file paths
3. **View Application**: User navigates to Applications page
   - Clicks CV tab → sees embedded PDF of final CV
   - Clicks Cover Letter tab → sees embedded PDF of final letter
   - Can download either PDF using download button
4. **Submit/Archive**: User submits or archives application

## Benefits

✅ **Professional PDFs**: Backend-generated PDFs ensure consistent, professional formatting
✅ **Final Versions**: Users see the exact PDF that will be submitted
✅ **Downloadable**: PDFs can be downloaded for records or manual adjustments
✅ **Storage**: PDFs saved on server for audit trail and retrieval
✅ **ATS-Friendly**: WeasyPrint generates PDFs optimized for Applicant Tracking Systems

## Technical Details

### PDF Generation
- Uses WeasyPrint (already in requirements, no new dependencies needed)
- Converts HTML/CSS to professional PDF output
- Supports all CV sections: contact, summary, experience, education, skills, certifications, projects, referees
- Cover letter follows standard business letter format with date, salutation, body, closing

### File Storage
- PDFs stored in `/backend/pdfs/` directory
- Filenames: `cv_{user_id}_{timestamp}.pdf` and `cover_letter_{user_id}_{timestamp}.pdf`
- File paths stored in database for retrieval
- Download endpoint validates user ownership

### API Endpoints

```
POST /api/v1/applications/queue
  - Body: { job_id, cv, cover_letter }
  - Generates and saves PDFs
  - Returns: { message, application_id, status }

GET /api/v1/applications
  - Returns: Paginated list with pdf_path fields

GET /api/v1/applications/{id}/pdf/{type}
  - type: "cv" or "cover_letter"
  - Returns: PDF file for download

POST /api/v1/applications/{id}/submit
POST /api/v1/applications/{id}/archive
```

## Verification

✅ Python syntax verified: `app/api/applications.py`
✅ Python syntax verified: `app/utils/pdf_generator.py`
✅ Frontend application page updated with PDF viewer
✅ Backend endpoints configured for PDF download

## Next Steps

1. **Restart Backend**: Changes require backend restart to load new routes
2. **Test Queue**: Verify POST `/api/v1/applications/queue` generates PDFs
3. **Test Display**: Verify PDFs display correctly in application details
4. **Test Download**: Verify PDF download functionality works
5. **End-to-End**: Full workflow from extract → validate → queue → view → submit
