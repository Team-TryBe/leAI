# CV Preview & Edit Workspace

## Overview

The CV Preview & Edit workspace is a sophisticated three-panel interface that allows Kenyan graduates to review and refine their AI-tailored CVs with full context and real-time visual feedback.

This feature bridges the gap between AI automation and human expertise, enabling users to add specific local context (like Kenyan university units, local internships, or professional body memberships) that AI might overlook.

---

## 🎯 Purpose

**For Kenyan Graduates:**
- Review AI-generated CV with full job description context
- Add specific Kenyan context (KCSE results, professional bodies, local projects)
- Ensure compliance with Kenyan CV standards
- Edit content while seeing real-time PDF preview
- Validate CV against common Kenyan HR requirements

**For the System:**
- Provide transparent AI reasoning
- Enable human-in-the-loop refinement
- Maintain quality control before submission
- Ensure cultural and market relevance

---

## 🏗️ Architecture

### Three-Panel Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    STICKY HEADER                             │
│  CV Preview & Edit | Validate | Download PDF                │
├──────────────┬────────────────────────┬─────────────────────┤
│              │                        │                     │
│  LEFT PANEL  │    CENTER PANEL        │   RIGHT PANEL       │
│  (Job Info)  │    (Editable CV)       │   (Live Preview)    │
│              │                        │                     │
│  - Job Title │    - Contact Info      │   [PDF Preview]     │
│  - Company   │    - Summary           │   • Real-time       │
│  - Location  │    - Experience        │   • Formatted       │
│  - Key Req.  │    - Education         │   • A4 Layout       │
│  - Skills    │    - Skills            │   • Print-ready     │
│  - AI Match  │    - Certifications    │                     │
│              │    - Referees          │                     │
│              │                        │                     │
│  [Sticky]    │    [Scrollable]        │   [Sticky]          │
└──────────────┴────────────────────────┴─────────────────────┘
```

### Responsive Behavior

- **Desktop (≥1024px)**: Full three-column layout
- **Tablet (768-1023px)**: Two columns (Job + CV), Preview toggleable
- **Mobile (<768px)**: Single column, tabbed interface

---

## 🔄 User Flow

```
1. User extracts job posting
   ↓
2. User personalizes CV (Match Score page)
   ↓
3. User clicks "Preview & Edit CV" button
   ↓
4. System calls /api/v1/cv-drafter/draft
   ↓
5. AI generates structured CV draft
   ↓
6. Three-panel workspace loads:
   - Left: Job description for reference
   - Center: Editable CV sections
   - Right: Live PDF preview
   ↓
7. User reviews and edits sections
   ↓
8. System validates against Kenyan standards
   ↓
9. User downloads final PDF
```

---

## 🤖 AI CV Drafting Prompt

The system uses a specialized prompt that:

### Key Features

1. **Role**: Senior Career Consultant specialized in Kenyan job market
2. **Inputs**: Master CV JSON + Job Description
3. **Goal**: 1-page ATS-optimized CV

### Rules

**Tone & Formatting:**
- Professional, achievement-oriented
- STAR method for bullets (Situation-Task-Action-Result)
- Quantified achievements (numbers, percentages)

**Kenyan Local Context:**
- Preserve education standards (KCSE, Degree honors)
- Include professional bodies (ICPAK, EBK, LSK, etc.)
- Use +254 phone format
- Include ≥3 referees with full contact details
- Strict 1-2 page limit

**ATS Optimization:**
- Mirror job description keywords
- Front-load skills in summary
- Standard section headers
- No tables/graphics

**Content Integrity:**
- No hallucinated experiences
- Highlight transferable skills for gaps
- Accurate dates and truthfulness

### Output Structure

```json
{
  "full_name": "string",
  "contact_info": {
    "email": "string",
    "phone": "+254...",
    "location": "string",
    "linkedin": "optional",
    "portfolio": "optional"
  },
  "professional_summary": "3-4 sentences with key skills",
  "experience": [
    {
      "company": "string",
      "position": "string",
      "duration": "Jan 2022 - Present",
      "location": "string",
      "achievements": ["STAR format bullet 1", "..."]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "Bachelor of Science",
      "field": "string",
      "honors": "Second Class Upper",
      "graduation_year": "2023",
      "relevant_units": ["optional"]
    }
  ],
  "skills": ["prioritized by JD match"],
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "date": "string",
      "credential_id": "optional"
    }
  ],
  "projects": [
    {
      "name": "string",
      "description": "1-2 sentences",
      "technologies": ["string"],
      "link": "optional"
    }
  ],
  "referees": [
    {
      "name": "string",
      "title": "string",
      "organization": "string",
      "email": "string",
      "phone": "+254..."
    }
  ],
  "languages": [
    {
      "language": "English/Swahili",
      "proficiency": "Fluent/Native"
    }
  ]
}
```

---

## ✅ Kenyan CV Validation

### Critical Checks

#### 1. Phone Number Format
```typescript
if (!phone.startsWith("+254")) {
  issue = "Phone number must be in +254 format for Kenyan employers"
}
```

#### 2. Referee Count
```typescript
if (referees.length < 3) {
  warning = "Kenyan employers typically expect at least 3 referees"
}
```

#### 3. Page Count
```typescript
if (page_count > 2) {
  critical = "Kenyan HRs rarely read beyond page 2"
}
```

#### 4. Word Count
```typescript
if (word_count > 700) {
  warning = "Consider reducing to 400-600 words for readability"
}
```

#### 5. Email Professionalism
```typescript
const unprofessionalDomains = ["yahoo.com", "ymail.com", "hotmail.com"];
if (unprofessionalDomains.includes(domain)) {
  warning = "Consider using Gmail or custom domain"
}
```

### Validation UI

Validation issues appear in a banner below the header:

**Critical Issues** (Red):
- Must be fixed before submission
- Block PDF generation

**Warnings** (Yellow):
- Recommendations for improvement
- Allow submission but flag for review

---

## 🎨 UI Components

### Left Panel: Job Description & AI Insights

**Purpose**: Keep the "Source of Truth" visible while editing

**Contents:**
- Job title, company, location
- Key requirements (top 5)
- Preferred skills (top 8)
- AI match insights
- Match score reference

**Behavior:**
- Sticky positioning
- Max height with scroll
- Collapses on mobile

### Center Panel: Editable CV

**Purpose**: Main editing workspace

**Components:**
1. **EditableSection**: Wraps each CV section
   - Title with icon
   - Edit/Save button
   - Content display/input
   - Smooth transitions

**Sections:**
- Contact Information
- Professional Summary
- Professional Experience
- Education
- Skills
- Certifications (if any)
- Projects (if any)
- Referees

**Editing:**
- Click "Edit" to enable editing
- Textarea appears with current content
- Click "Save" to apply changes
- "Revert" restores original

### Right Panel: Live PDF Preview

**Purpose**: Real-time visual feedback

**Features:**
- Simplified PDF-style rendering
- A4 page dimensions
- Professional formatting
- Standard sections
- Print-ready appearance

**Note**: This is a simplified HTML preview. Actual PDF generation happens server-side for download.

---

## 🔧 Technical Implementation

### Backend Endpoint

**Route**: `POST /api/v1/cv-drafter/draft`

**Request:**
```json
{
  "job_id": 123
}
```

**Response:**
```json
{
  "success": true,
  "message": "CV drafted successfully",
  "data": {
    "full_name": "...",
    "contact_info": {...},
    "professional_summary": "...",
    "experience": [...],
    "education": [...],
    "skills": [...],
    "certifications": [...],
    "projects": [...],
    "referees": [...],
    "languages": [...],
    "job_title": "...",
    "company_name": "...",
    "page_count": 1,
    "word_count": 523
  }
}
```

**Dependencies:**
- MasterProfile (user's full CV data)
- ExtractedJobData (job requirements)
- Google Gemini 2.5 Flash

### Frontend Route

**Path**: `/dashboard/applications/preview?job_id=123`

**State Management:**
```typescript
const [cvDraft, setCVDraft] = useState<CVDraft | null>(null);
const [jobData, setJobData] = useState<JobData | null>(null);
const [editingSection, setEditingSection] = useState<string | null>(null);
const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
```

**Navigation:**
From personalization page → "Preview & Edit CV" button

---

## 📱 Responsive Design

### Desktop (≥1024px)
```css
.grid-cols-12 {
  grid-template-columns: repeat(12, 1fr);
}

.left-panel { grid-column: span 3; }    /* 25% */
.center-panel { grid-column: span 5; }  /* 42% */
.right-panel { grid-column: span 4; }   /* 33% */
```

### Tablet (768-1023px)
- Left panel: 4 columns (33%)
- Center panel: 8 columns (67%)
- Right panel: Hidden (toggleable)

### Mobile (<768px)
- Single column
- Tabbed interface:
  - Tab 1: Job Info
  - Tab 2: Edit CV
  - Tab 3: Preview

---

## 🚀 Future Enhancements

### Phase 1 (Current)
- ✅ Three-panel layout
- ✅ AI CV drafting
- ✅ Kenyan validation
- ✅ Section editing
- ✅ Live preview

### Phase 2 (Next)
- [ ] Rich text editor (TipTap/Quill)
- [ ] Drag-and-drop section reordering
- [ ] Version history
- [ ] Collaborative editing (share with mentor)

### Phase 3 (Advanced)
- [ ] Real PDF generation (react-pdf/renderer)
- [ ] Multiple CV templates
- [ ] A/B testing suggestions
- [ ] AI-powered improvement suggestions
- [ ] Export to multiple formats (Word, LaTeX)

### Phase 4 (Pro)
- [ ] Industry-specific templates
- [ ] Company research integration
- [ ] Salary negotiation insights
- [ ] Interview prep based on CV

---

## 🎓 Kenyan Context Examples

### Education Section
```
Bachelor of Science in Computer Science
University of Nairobi
Second Class Upper Division • Graduated 2023

Relevant Units:
• Data Structures & Algorithms
• Database Management Systems
• Software Engineering
```

### Professional Bodies
```
Certifications:
• Certified Public Accountant (CPA-K)
  Institute of Certified Public Accountants of Kenya (ICPAK)
  License No: CPA-12345
  
• Registered Engineer
  Engineers Board of Kenya (EBK)
  Reg No: EBK/E/12345
```

### Referees
```
1. Dr. Jane Wanjiru
   Senior Lecturer, Department of Computer Science
   University of Nairobi
   jwanjiru@uonbi.ac.ke • +254 712 345 678

2. Mr. Peter Omondi
   Chief Technology Officer
   Safaricom PLC
   peter.omondi@safaricom.co.ke • +254 722 876 543

3. Ms. Grace Kimani
   HR Manager
   Equity Bank Kenya
   grace.kimani@equitybank.co.ke • +254 733 456 789
```

---

## 🔐 Security & Privacy

- User authentication required
- CV drafts stored temporarily (session-based)
- No sharing without explicit permission
- Personal data encrypted in transit
- Compliance with Kenya Data Protection Act

---

## 📊 Analytics & Metrics

**Track:**
- CV draft generation time
- Section edit frequency
- Validation issue occurrence
- Download rate
- Time spent in preview

**Goals:**
- <3s draft generation
- <2 critical validation issues per CV
- >80% download rate
- <5min average editing time

---

## 🐛 Known Limitations

1. **PDF Preview**: Simplified HTML, not pixel-perfect
2. **Real-time Sync**: Preview updates on section save, not keystroke
3. **Mobile**: Limited screen space for three panels
4. **Offline**: No offline editing support yet

---

## 📝 User Tips

**For Best Results:**

1. **Review Job Description**: Use left panel to reference requirements
2. **Be Specific**: Add exact Kenyan context (university name, honors, units)
3. **Quantify**: Numbers speak louder than adjectives
4. **Validate**: Run validation before downloading
5. **Check Format**: Ensure +254 phone format, 3+ referees
6. **Keep it Concise**: Aim for 1 page (2 max)
7. **Use STAR**: Situation-Task-Action-Result for achievements
8. **Proofread**: AI is smart but not perfect

---

## 🔗 Related Features

- **Job Extractor**: Captures job requirements
- **CV Personalizer**: Initial AI customization
- **Master Profile**: Source of truth for user data
- **Match Score**: Quantifies CV-job alignment

---

## 📚 References

- [Kenyan CV Writing Standards](https://www.brightermonday.co.ke/blog/how-to-write-a-cv-in-kenya/)
- [Kenya Data Protection Act 2019](http://kenyalaw.org/kl/fileadmin/pdfdownloads/Acts/2019/TheDataProtectionAct_No24of2019.pdf)
- [Professional Bodies in Kenya](https://www.businesslist.co.ke/category/professional-bodies-associations)

---

**Last Updated**: February 2, 2026  
**Version**: 1.0.0  
**Author**: Aditus Engineering Team
