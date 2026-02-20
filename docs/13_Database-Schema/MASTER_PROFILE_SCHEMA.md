# Master Profile Enhanced Schema

## Overview

The Master Profile now includes all essential fields needed for comprehensive job applications and CV personalization in the Kenyan job market.

---

## Database Schema

### Master Profiles Table (`master_profiles`)

#### Personal Details
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `full_name` | VARCHAR(255) | ❌ | User's full name |
| `phone_country_code` | VARCHAR(10) | ❌ | Country code (e.g., +254) |
| `phone_number` | VARCHAR(20) | ❌ | Phone number (9-15 digits) |
| `email` | VARCHAR(255) | ❌ | Email address |
| `location` | VARCHAR(255) | ❌ | Current location (e.g., Nairobi, Kenya) |

#### Professional Profile
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `personal_statement` | TEXT | NULL | User's career narrative |
| `professional_summary` | TEXT | NULL | Professional summary for CVs |

#### Education
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `education` | JSONB | `[]` | List of education records |
| `education_level` | VARCHAR(100) | NULL | Highest degree (Bachelor/Master/PhD) |
| `field_of_study` | VARCHAR(255) | NULL | Major/discipline |

#### Experience & Skills (NEW)
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `experience` | JSONB | `[]` | Structured work experience |
| `work_experience` | JSONB | `[]` | Alternative work history format |
| `technical_skills` | JSONB | `[]` | List of technical skills |
| `soft_skills` | JSONB | `[]` | List of soft skills |
| `skills` | JSONB | `[]` | Detailed skills with proficiency |

#### Additional Sections (NEW)
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `projects` | JSONB | `[]` | Portfolio projects |
| `certifications` | JSONB | `[]` | Professional certifications |
| `referees` | JSONB | `[]` | Professional references |
| `languages` | JSONB | `[]` | Languages spoken (NEW) |
| `publications` | JSONB | `[]` | Articles/publications (NEW) |
| `volunteer_experience` | JSONB | `[]` | Volunteer roles (NEW) |

#### Professional Links
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `linkedin_url` | VARCHAR(500) | ❌ | LinkedIn profile |
| `github_url` | VARCHAR(500) | ❌ | GitHub profile |
| `portfolio_url` | VARCHAR(500) | ❌ | Personal portfolio |
| `twitter_url` | VARCHAR(500) | ❌ | Twitter/X profile |
| `medium_url` | VARCHAR(500) | ❌ | Medium blog |

#### Career Preferences (NEW)
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `preferred_job_titles` | JSONB | `[]` | Target job titles |
| `preferred_industries` | JSONB | `[]` | Preferred sectors |
| `preferred_company_sizes` | JSONB | `[]` | Startup/SME/Enterprise |
| `preferred_locations` | JSONB | `[]` | Geographic preferences (NEW) |
| `remote_preference` | VARCHAR(50) | NULL | remote/hybrid/on-site (NEW) |

---

## API Schema (Pydantic)

### MasterProfileBase

Includes all fields above with proper typing and validation.

**Key Types:**

```python
education: List[EducationItem]  # {institution, degree, field, graduation_year}
experience: List[ExperienceItem]  # {company, title, duration, description, skills}
skills: List[SkillItem]  # {skill, proficiency, endorsements}
work_experience: List[Dict]  # Flexible work history format
technical_skills: List[str]  # ["Python", "Django", "SQL"]
soft_skills: List[str]  # ["Leadership", "Communication"]
languages: List[Dict]  # [{language: "English", proficiency: "Fluent"}]
```

### MasterProfileResponse

Includes all base fields plus:
- `id: int`
- `user_id: int`
- `created_at: datetime`
- `updated_at: datetime`

---

## Usage in CV Personalization

### Match Score Algorithm

The CV personalizer now uses comprehensive profile data:

```python
# Skills extraction
user_technical_skills = master_profile.technical_skills or []
user_soft_skills = master_profile.soft_skills or []
user_skills = user_technical_skills + user_soft_skills

# Experience extraction
user_experience = master_profile.work_experience or master_profile.experience or []

# Education extraction
user_education = f"{education_level} in {field_of_study}"

# Calculate match against JD
match_score = calculate_match_score(
    user_skills=user_skills,
    user_experience=user_experience,
    user_education=user_education,
    jd_requirements=job_data.key_requirements,
    jd_preferred_skills=job_data.preferred_skills,
    jd_level=job_data.job_level
)
```

### Gap Analysis

Identifies missing skills, transferable skills, and direct matches:

```python
gap_analysis = perform_gap_analysis(
    user_skills=user_skills,
    user_experience=user_experience,
    jd_requirements=job_data.key_requirements,
    jd_preferred_skills=job_data.preferred_skills
)
```

### CV Personalization Sections

Uses all profile data to personalize:

```
1. Professional Summary
   - Uses: personal_statement, professional_summary, technical_skills
   - Mirrors: JD keywords, company tone, job level

2. Work Experience
   - Uses: work_experience, experience
   - Applies: STAR method, quantification, ATS keywords

3. Skills Section
   - Uses: technical_skills, soft_skills
   - Prioritizes: JD-matching skills first

4. Education
   - Uses: education, education_level, field_of_study
   - Validates: Against JD requirements

5. Additional Sections
   - Uses: projects, certifications, languages, publications, volunteer_experience
   - Highlights: Relevant to job role
```

---

## Data Structures

### EducationItem
```json
{
  "institution": "University of Nairobi",
  "degree": "Bachelor of Science",
  "field": "Computer Science",
  "graduation_year": 2022
}
```

### ExperienceItem
```json
{
  "company": "Tech Company Ltd",
  "title": "Senior Software Engineer",
  "duration": "2020-Present",
  "description": "Led Python development team...",
  "skills": ["Python", "Django", "REST APIs"]
}
```

### WorkExperience (Flexible)
```json
{
  "company": "Company Name",
  "position": "Job Title",
  "start_date": "2020-01-01",
  "end_date": "Present",
  "responsibilities": ["Task 1", "Task 2"],
  "achievements": ["Achievement 1", "Achievement 2"]
}
```

### SkillItem
```json
{
  "skill": "Python",
  "proficiency": "Expert",
  "endorsements": 24
}
```

### Language
```json
{
  "language": "English",
  "proficiency": "Native"
}
```

---

## Migration Applied

✅ Successfully added 11 new columns:
1. `technical_skills` - JSONB
2. `soft_skills` - JSONB
3. `work_experience` - JSONB
4. `education_level` - VARCHAR(100)
5. `field_of_study` - VARCHAR(255)
6. `professional_summary` - TEXT
7. `languages` - JSONB
8. `publications` - JSONB
9. `volunteer_experience` - JSONB
10. `preferred_locations` - JSONB
11. `remote_preference` - VARCHAR(50)

**Migration File:** `migrations/add_essential_profile_fields.py`

---

## Error Handling

The CV personalizer gracefully handles missing fields:

```python
# Handles None, missing, or empty values
user_technical_skills = master_profile.technical_skills or []  # Returns []
user_soft_skills = master_profile.soft_skills or []  # Returns []

# Fallbacks to alternate fields
user_experience = master_profile.work_experience or master_profile.experience or []

# Constructs education string safely
parts = [education_level, field_of_study]
user_education = " in ".join([p for p in parts if p])  # "Bachelor in CS"
```

---

## Frontend Integration

### Profile Creation Form

Should capture:
- Personal details (name, phone, location)
- Professional summary
- Education level & field
- Technical skills (checklist or input)
- Soft skills (checklist or input)
- Work experience (company, title, duration, description)
- Projects, certifications, languages
- Career preferences (job titles, industries, locations, remote preference)

### Example Request

```json
POST /api/v1/users/master-profile

{
  "full_name": "John Doe",
  "email": "john@example.com",
  "location": "Nairobi, Kenya",
  "education_level": "Bachelor",
  "field_of_study": "Computer Science",
  "technical_skills": ["Python", "Django", "SQL"],
  "soft_skills": ["Leadership", "Communication"],
  "work_experience": [
    {
      "company": "Tech Corp",
      "position": "Software Engineer",
      "duration": "2 years",
      "description": "Built APIs and web applications"
    }
  ],
  "preferred_job_titles": ["Software Engineer", "Full Stack Developer"],
  "preferred_industries": ["Technology", "FinTech"],
  "preferred_locations": ["Nairobi", "Hybrid"],
  "remote_preference": "hybrid"
}
```

---

## Status

✅ **Database Schema:** Updated with all essential fields  
✅ **Models:** MasterProfile includes all new columns  
✅ **Schemas:** Pydantic schemas updated with proper typing  
✅ **CV Personalizer:** Updated to handle missing fields gracefully  
✅ **Migration:** Applied successfully  
✅ **Error Handling:** Comprehensive fallbacks in place  

🚀 **Ready for:** Frontend profile builder, CV personalization, gap analysis
