"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileText,
  Eye,
  Download,
  CheckCircle,
  AlertTriangle,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  Code,
  Users,
  Edit3,
  Save,
  Undo,
  ChevronRight,
  Loader2,
  FileEdit,
  Sparkles,
} from "lucide-react";
import { getAuthToken } from "@/lib/auth";

// Disable static prerendering since this page uses client-side libraries
export const dynamic = "force-dynamic";

// Dynamic import for html2pdf to prevent SSR issues
let html2pdf: any = null;
if (typeof window !== "undefined") {
  import("html2pdf.js").then((module) => {
    html2pdf = module.default;
  });
}

// ============================================================================
// TYPES
// ============================================================================

interface SocialLink {
  label: string;
  url: string;
}

interface ContactInfo {
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  socialLinks?: SocialLink[];
}

interface Experience {
  company: string;
  position: string;
  duration: string;
  location: string;
  achievements: string[];
}

interface Education {
  institution: string;
  degree: string;
  field: string;
  honors?: string;
  graduation_year: string;
  relevant_units?: string[];
}

interface Certification {
  name: string;
  issuer: string;
  date: string;
  credential_id?: string;
  link?: string;
}

interface Project {
  name: string;
  description: string;
  technologies: string[];
  link?: string;
  github_repo?: string;
}

interface Referee {
  name: string;
  title: string;
  organization: string;
  email: string;
  phone: string;
}

interface Language {
  language: string;
  proficiency: string;
}

interface CVDraft {
  full_name: string;
  contact_info: ContactInfo;
  professional_summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications: Certification[];
  projects: Project[];
  referees: Referee[];
  languages: Language[];
  job_title: string;
  company_name: string;
  page_count: number;
  word_count: number;
}

interface JobData {
  id: number;
  job_title: string;
  company_name: string;
  location: string;
  key_requirements: string[];
  preferred_skills: string[];
  responsibilities: string[];
  job_level: string;
  employment_type: string;
}

interface ValidationIssue {
  category: "critical" | "warning";
  message: string;
  fix?: string;
}

interface CoverLetter {
  content: string;
  word_count: number;
  structure: {
    opening: string;
    body_1: string;
    body_2: string;
    body_3: string;
    closing: string;
    signature: string;
    subject_line: string;
  };
  key_points: string[];
  job_title: string;
  company_name: string;
}

// ============================================================================
// UTILITY FUNCTIONS FOR PDF GENERATION
// ============================================================================

const generateCVPDF = (cvDraft: CVDraft) => {
  const element = document.createElement("div");
  element.innerHTML = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; padding: 40px;">
      <!-- Header -->
      <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px; font-weight: bold;">${cvDraft.full_name}</h1>
        <div style="margin-top: 10px; font-size: 12px; color: #666;">
          ${cvDraft.contact_info.email} • ${cvDraft.contact_info.phone} • ${cvDraft.contact_info.location}
          ${cvDraft.contact_info.linkedin ? `• <a href="${cvDraft.contact_info.linkedin}" style="color: #0077b5; text-decoration: none;">LinkedIn</a>` : ""}
          ${cvDraft.contact_info.github ? `• <a href="${cvDraft.contact_info.github}" style="color: #333; text-decoration: none;">GitHub</a>` : ""}
          ${cvDraft.contact_info.portfolio ? `• <a href="${cvDraft.contact_info.portfolio}" style="color: #007bff; text-decoration: none;">Portfolio</a>` : ""}
          ${cvDraft.contact_info.socialLinks?.map(link => link.label && link.url ? `• <a href="${link.url}" style="color: #007bff; text-decoration: none;">${link.label}</a>` : '').join(' ') || ''}
        </div>
      </div>

      <!-- Professional Summary -->
      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 10px;">PROFESSIONAL SUMMARY</h2>
        <p style="font-size: 11px; color: #555; margin: 0;">${cvDraft.professional_summary}</p>
      </div>

      <!-- Professional Experience -->
      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 10px;">PROFESSIONAL EXPERIENCE</h2>
        ${cvDraft.experience.map(exp => `
          <div style="margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
              <div>
                <p style="font-weight: bold; margin: 0; font-size: 12px;">${exp.position}</p>
                <p style="color: #666; margin: 2px 0; font-size: 11px;">${exp.company}</p>
              </div>
              <p style="font-size: 11px; color: #666; margin: 0;">${exp.duration}</p>
            </div>
            <ul style="margin: 8px 0 0 20px; padding: 0; font-size: 11px; color: #555;">
              ${exp.achievements.map(achievement => `<li style="margin-bottom: 4px;">${achievement}</li>`).join("")}
            </ul>
          </div>
        `).join("")}
      </div>

      <!-- Education -->
      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 10px;">EDUCATION</h2>
        ${cvDraft.education.map(edu => `
          <div style="margin-bottom: 12px;">
            <p style="font-weight: bold; margin: 0; font-size: 12px;">${edu.degree} in ${edu.field}</p>
            <p style="color: #666; margin: 2px 0; font-size: 11px;">${edu.institution}</p>
            <p style="color: #666; margin: 0; font-size: 11px;">${edu.honors ? edu.honors + " • " : ""}Graduated ${edu.graduation_year}</p>
          </div>
        `).join("")}
      </div>

      <!-- Skills -->
      <div style="margin-bottom: 25px;">
        <h2 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 10px;">SKILLS</h2>
        <p style="font-size: 11px; color: #555; margin: 0;">${cvDraft.skills.join(", ")}</p>
      </div>

      <!-- Certifications -->
      ${cvDraft.certifications.length > 0 ? `
        <div style="margin-bottom: 25px;">
          <h2 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 10px;">CERTIFICATIONS</h2>
          ${cvDraft.certifications.map(cert => `
            <div style="margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <div>
                  <p style="font-weight: bold; margin: 0; font-size: 11px;">${cert.name}</p>
                  <p style="color: #666; margin: 2px 0; font-size: 10px;">${cert.issuer}</p>
                  ${cert.link ? `<a href="${cert.link}" style="color: #007bff; text-decoration: none; font-size: 10px;">View Credential</a>` : ''}
                </div>
                <p style="font-size: 10px; color: #666; margin: 0;">${cert.date}</p>
              </div>
            </div>
          `).join("")}
        </div>
      ` : ""}

      <!-- Projects -->
      ${cvDraft.projects && cvDraft.projects.length > 0 ? `
        <div style="margin-bottom: 25px;">
          <h2 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 10px;">PROJECTS</h2>
          ${cvDraft.projects.map(project => `
            <div style="margin-bottom: 12px;">
              <p style="font-weight: bold; margin: 0; font-size: 12px;">${project.name}</p>
              <p style="color: #555; margin: 4px 0; font-size: 11px;">${project.description}</p>
              <p style="margin: 4px 0; font-size: 10px; color: #666;">
                ${project.technologies.join(", ")}
                ${project.link ? ` • <a href="${project.link}" style="color: #007bff; text-decoration: none;">View Project</a>` : ""}
              </p>
            </div>
          `).join("")}
        </div>
      ` : ""}

      <!-- Referees -->
      <div>
        <h2 style="font-size: 14px; font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 10px;">REFEREES</h2>
        ${cvDraft.referees.map(ref => `
          <div style="margin-bottom: 10px;">
            <p style="font-weight: bold; margin: 0; font-size: 11px;">${ref.name}</p>
            <p style="color: #666; margin: 2px 0; font-size: 10px;">${ref.title} | ${ref.organization}</p>
            <p style="color: #666; margin: 0; font-size: 10px;">${ref.email} | ${ref.phone}</p>
          </div>
        `).join("")}
      </div>
    </div>
  `;

  const opt = {
    margin: 10,
    filename: `${cvDraft.full_name.replace(/\s+/g, "_")}_CV.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: "portrait" as const, unit: "mm" as const, format: "a4" as const },
  };

  html2pdf().set(opt).from(element).save();
};

const generateCoverLetterPDF = (coverLetter: CoverLetter, fullName: string) => {
  const element = document.createElement("div");
  element.innerHTML = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.8; padding: 40px; max-width: 600px;">
      <div style="margin-bottom: 30px;">
        <p style="margin: 0; font-weight: bold;">${fullName}</p>
      </div>

      <div style="margin-bottom: 30px;">
        <p style="margin: 0 0 5px 0; font-weight: bold;">Subject: ${coverLetter.structure.subject_line}</p>
      </div>

      <div style="margin-bottom: 20px;">
        <p style="margin: 0; margin-bottom: 15px;">Dear Hiring Manager,</p>
        <p style="margin: 0 0 15px 0; font-size: 12px; line-height: 1.8; white-space: pre-wrap;">${coverLetter.content}</p>
      </div>

      <div style="margin-top: 30px;">
        <p style="margin: 0;">Yours sincerely,</p>
        <p style="margin: 40px 0 0 0; font-weight: bold;">${fullName}</p>
      </div>
    </div>
  `;

  const opt = {
    margin: 10,
    filename: `${fullName.replace(/\s+/g, "_")}_CoverLetter.pdf`,
    image: { type: "jpeg" as const, quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { orientation: "portrait" as const, unit: "mm" as const, format: "a4" as const },
  };

  html2pdf().set(opt).from(element).save();
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function CVPreviewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("job_id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cvDraft, setCVDraft] = useState<CVDraft | null>(null);
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null);
  const [generatingCoverLetter, setGeneratingCoverLetter] = useState(false);
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log("🔍 Preview page loaded with jobId:", jobId);
    console.log("🔍 Search params:", Object.fromEntries(searchParams.entries()));
  }, [jobId, searchParams]);

  // ========================================================================
  // DATA FETCHING
  // ========================================================================

  useEffect(() => {
    if (!jobId) {
      setError("No job ID provided");
      setLoading(false);
      return;
    }

    fetchCVDraft();
  }, [jobId]);

  const fetchCVDraft = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();

      if (!jobId) {
        throw new Error("Job ID is missing");
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      
      console.log("📝 Fetching CV draft for job_id:", jobId);
      console.log("🌐 API URL:", `${apiUrl}/api/v1/cv-drafter/draft`);

      // Fetch CV draft
      const draftResponse = await fetch(
        `${apiUrl}/api/v1/cv-drafter/draft`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ job_id: parseInt(jobId) }),
        }
      );

      console.log("📥 Draft response status:", draftResponse.status);

      if (!draftResponse.ok) {
        const errorText = await draftResponse.text();
        console.error("❌ Draft error response:", errorText);
        
        let errorMessage = `Failed to fetch CV draft (${draftResponse.status})`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // If response isn't JSON, use the text
          if (errorText) errorMessage = errorText;
        }
        
        throw new Error(errorMessage);
      }

      const draftData = await draftResponse.json();
      console.log("✅ CV draft received:", draftData);
      setCVDraft(draftData.data);

      // Fetch job data
      const jobResponse = await fetch(
        `${apiUrl}/api/v1/job-extractor/extracted/${jobId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (jobResponse.ok) {
        const jobResult = await jobResponse.json();
        setJobData(jobResult.data);
      }

      // Run validation
      if (draftData.data) {
        validateCV(draftData.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateCV = async () => {
    if (!jobId) return;
    
    try {
      setRegenerating(true);
      const token = getAuthToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      
      console.log("🔄 Regenerating CV for job_id:", jobId);

      // Call the same draft endpoint - it will generate a fresh CV
      const response = await fetch(
        `${apiUrl}/api/v1/cv-drafter/draft`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ job_id: parseInt(jobId) }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to regenerate CV");
      }

      const draftData = await response.json();
      console.log("✅ CV regenerated successfully:", draftData);
      setCVDraft(draftData.data);

      // Run validation on new draft
      if (draftData.data) {
        validateCV(draftData.data);
      }
    } catch (err) {
      console.error("❌ Regeneration error:", err);
      alert(err instanceof Error ? err.message : "Failed to regenerate CV. Please try again.");
    } finally {
      setRegenerating(false);
    }
  };

  // ========================================================================
  // KENYAN CV VALIDATION & APPLICATION QUEUEING
  // ========================================================================

  const validateCV = async (cv: CVDraft) => {
    const issues: ValidationIssue[] = [];

    // Check phone format
    if (!cv.contact_info.phone.startsWith("+254")) {
      issues.push({
        category: "critical",
        message: "Phone number must be in +254 format for Kenyan employers",
        fix: "Update phone number to start with +254",
      });
    }

    // Check referees
    if (cv.referees.length < 3) {
      issues.push({
        category: "warning",
        message: `Only ${cv.referees.length} referees provided. Kenyan employers typically expect at least 3.`,
        fix: "Add more referees",
      });
    }

    // Check page count
    if (cv.page_count > 2) {
      issues.push({
        category: "critical",
        message: `CV is ${cv.page_count} pages. Kenyan HRs rarely read beyond page 2.`,
        fix: "Condense content to fit 1-2 pages",
      });
    }

    // Check word count
    if (cv.word_count > 700) {
      issues.push({
        category: "warning",
        message: `Word count is ${cv.word_count}. Consider reducing to 400-600 words for better readability.`,
        fix: "Remove less relevant details",
      });
    }

    // Check email professionalism
    const email = cv.contact_info.email.toLowerCase();
    const unprofessionalDomains = ["yahoo.com", "ymail.com", "hotmail.com"];
    const domain = email.split("@")[1];
    if (unprofessionalDomains.includes(domain)) {
      issues.push({
        category: "warning",
        message: "Consider using a more professional email domain (Gmail is acceptable in Kenya)",
      });
    }

    setValidationIssues(issues);

    // Queue application if validation passes critical checks
    const hasCriticalIssues = issues.some(
      (issue) => issue.category === "critical"
    );

    if (!hasCriticalIssues) {
      await queueApplication(cv);
    }
  };

  const queueApplication = async (cv: CVDraft) => {
    try {
      const token = getAuthToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/api/v1/applications/queue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          job_id: parseInt(jobId!),
          cv: cvDraft,
          cover_letter: coverLetter,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to queue application");
      }

      // Show success message and redirect
      alert(
        "✅ Application queued successfully! Navigate to Applications to submit."
      );
      router.push("/dashboard/applications");
    } catch (error) {
      console.error("Error queueing application:", error);
      alert("Failed to queue application. Please try again.");
    }
  };

  // ========================================================================
  // COVER LETTER GENERATION
  // ========================================================================

  const generateCoverLetter = async () => {
    try {
      setGeneratingCoverLetter(true);
      const token = getAuthToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

      console.log("📝 Generating cover letter for job_id:", jobId);

      const response = await fetch(
        `${apiUrl}/api/v1/cover-letter/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ job_id: parseInt(jobId!) }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Failed to generate cover letter (${response.status})`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.detail || errorMessage;
        } catch {
          if (errorText) errorMessage = errorText;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log("✅ Cover letter generated:", result);
      setCoverLetter(result.data);
      setShowCoverLetter(true);
    } catch (err) {
      console.error("❌ Cover letter generation error:", err);
      alert(err instanceof Error ? err.message : "Failed to generate cover letter");
    } finally {
      setGeneratingCoverLetter(false);
    }
  };

  // ========================================================================
  // RENDERING
  // ========================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-dark via-[#1a1a3e] to-brand-dark-card flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-accent animate-spin mx-auto mb-4" />
          <p className="text-brand-text-muted">Drafting your CV...</p>
        </div>
      </div>
    );
  }

  if (error || !cvDraft) {
    // Parse error message for helpful UI
    const is404 = error?.includes("404");
    const isMasterProfileMissing = error?.includes("Master profile not found");
    const isJobNotFound = error?.includes("Job not found");

    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-dark via-[#1a1a3e] to-brand-dark-card flex items-center justify-center p-4">
        <div className="bg-brand-dark-card border border-brand-dark-border rounded-2xl p-8 max-w-lg">
          <AlertTriangle className="w-12 h-12 text-brand-error mb-4" />
          <h2 className="text-xl font-semibold text-brand-text mb-2">
            {isMasterProfileMissing ? "Master Profile Required" : "Error Loading CV"}
          </h2>
          
          <p className="text-brand-text-muted mb-4">
            {error || "Unknown error"}
          </p>

          {/* Helpful tips based on error type */}
          {isMasterProfileMissing && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-400 mb-2">
                💡 You need to create your Master Profile first before drafting a CV.
              </p>
              <p className="text-xs text-brand-text-muted">
                Your Master Profile contains your complete work history, education, and skills that we use to tailor CVs for specific jobs.
              </p>
            </div>
          )}

          {isJobNotFound && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-400 mb-2">
                ⚠️ The job posting you're trying to draft a CV for wasn't found.
              </p>
              <p className="text-xs text-brand-text-muted">
                This might happen if the job was deleted or the link is incorrect.
              </p>
            </div>
          )}

          {is404 && !isMasterProfileMissing && !isJobNotFound && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-400 mb-2">
                🔍 Backend endpoint not found
              </p>
              <p className="text-xs text-brand-text-muted">
                The CV drafter service might not be running. Please ensure the backend server is started.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 bg-brand-dark-border hover:bg-brand-dark-border/80 text-brand-text rounded-lg transition-colors"
            >
              Go Back
            </button>
            {isMasterProfileMissing && (
              <button
                onClick={() => router.push("/dashboard/profile")}
                className="flex-1 px-4 py-2 bg-brand-accent hover:bg-brand-accent/80 text-white rounded-lg transition-colors"
              >
                Create Profile
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-dark via-[#1a1a3e] to-brand-dark-card">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-brand-dark/80 backdrop-blur-xl border-b border-brand-dark-border">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-text">CV Preview & Edit</h1>
            <p className="text-sm text-brand-text-muted mt-1">
              Review and refine your AI-tailored CV for {cvDraft.company_name}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRegenerateCV}
              disabled={regenerating}
              className="px-4 py-2 bg-brand-primary/20 border border-brand-primary text-brand-primary rounded-lg hover:bg-brand-primary/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Generate a fresh CV with new AI content"
            >
              {regenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Regenerate CV
                </>
              )}
            </button>
            <button
              onClick={() => cvDraft && validateCV(cvDraft)}
              className="px-4 py-2 bg-brand-dark-card border border-brand-dark-border text-brand-text rounded-lg hover:bg-brand-dark-border/20 transition-all flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Validate & Queue
            </button>
            <button
              onClick={() => cvDraft && generateCVPDF(cvDraft)}
              className="px-4 py-2 bg-gradient-to-r from-brand-accent to-[#a78bfa] text-white rounded-lg hover:shadow-lg hover:shadow-brand-accent/20 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
          </div>
        </div>
      </header>

      {/* Validation Issues */}
      {validationIssues.length > 0 && (
        <div className="px-6 py-4 bg-brand-dark-card/50 border-b border-brand-dark-border">
          <h3 className="text-sm font-semibold text-brand-text mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Kenyan CV Standards Check
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {validationIssues.map((issue, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  issue.category === "critical"
                    ? "bg-red-500/10 border-red-500/30"
                    : "bg-yellow-500/10 border-yellow-500/30"
                }`}
              >
                <p
                  className={`text-sm font-medium ${
                    issue.category === "critical" ? "text-red-400" : "text-yellow-400"
                  }`}
                >
                  {issue.message}
                </p>
                {issue.fix && (
                  <p className="text-xs text-brand-text-muted mt-1">
                    💡 {issue.fix}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content - 3 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        {/* LEFT PANEL: Job Description & AI Insights */}
        <div className="lg:col-span-3 space-y-4">
          <JobDescriptionPanel jobData={jobData} cvDraft={cvDraft} />
        </div>

        {/* CENTER PANEL: Editable CV + Cover Letter */}
        <div className="lg:col-span-5 space-y-4">
          {/* Cover Letter Prompt Card */}
          {!coverLetter && !showCoverLetter && (
            <div className="bg-gradient-to-br from-brand-primary/10 via-brand-accent/10 to-brand-primary/10 border border-brand-accent/30 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-brand-accent/20 rounded-xl flex items-center justify-center">
                  <FileEdit className="w-6 h-6 text-brand-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-brand-text mb-2">
                    Generate Cover Letter (Optional)
                  </h3>
                  <p className="text-sm text-brand-text-muted mb-4">
                    Stand out with a personalized cover letter tailored to this job. Our AI will craft a professional letter highlighting your relevant experience and genuine interest in {cvDraft.company_name}.
                  </p>
                  <button
                    onClick={generateCoverLetter}
                    disabled={generatingCoverLetter}
                    className="px-6 py-2 bg-gradient-to-r from-brand-accent to-[#a78bfa] text-white rounded-lg hover:shadow-lg hover:shadow-brand-accent/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingCoverLetter ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate Cover Letter
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cover Letter Display */}
          {coverLetter && showCoverLetter && cvDraft && (
            <CoverLetterSection
              coverLetter={coverLetter}
              fullName={cvDraft.full_name}
              onClose={() => setShowCoverLetter(false)}
              onRegenerate={generateCoverLetter}
            />
          )}

          {/* CV Sections */}
          <EditableCVPanel
            cvDraft={cvDraft}
            onUpdate={setCVDraft}
            editingSection={editingSection}
            setEditingSection={setEditingSection}
          />
        </div>

        {/* RIGHT PANEL: Live PDF Preview */}
        <div className="lg:col-span-4">
          <PDFPreviewPanel cvDraft={cvDraft} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COVER LETTER SECTION
// ============================================================================

function CoverLetterSection({
  coverLetter,
  fullName,
  onClose,
  onRegenerate,
}: {
  coverLetter: CoverLetter;
  fullName: string;
  onClose: () => void;
  onRegenerate: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(coverLetter.content);

  const handleSave = () => {
    // Update the content (in a real app, you'd save to backend)
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedContent(coverLetter.content);
    setIsEditing(false);
  };

  return (
    <div className="bg-brand-dark-card border border-brand-dark-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-accent/20 rounded-xl flex items-center justify-center">
            <FileEdit className="w-5 h-5 text-brand-accent" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-brand-text">Cover Letter</h3>
            <p className="text-xs text-brand-text-muted">{coverLetter.word_count} words • {coverLetter.job_title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-all bg-brand-success text-white hover:opacity-90"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-all bg-brand-dark-border text-brand-text-muted hover:bg-red-500/10 hover:text-red-400"
              >
                <Undo className="w-4 h-4" />
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-all bg-brand-dark-border text-brand-text-muted hover:bg-brand-accent/10 hover:text-brand-accent"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={onRegenerate}
                className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-all bg-brand-dark-border text-brand-text-muted hover:bg-brand-accent/10 hover:text-brand-accent"
              >
                <Undo className="w-4 h-4" />
                Regenerate
              </button>
            </>
          )}
        </div>
      </div>

      {/* Subject Line */}
      <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-xs text-blue-400 font-medium mb-1">Subject:</p>
        <p className="text-sm text-brand-text">{coverLetter.structure.subject_line}</p>
      </div>

      {/* Cover Letter Content */}
      {isEditing ? (
        <textarea
          value={editedContent}
          onChange={(e) => setEditedContent(e.target.value)}
          className="w-full h-96 p-4 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-brand-accent"
        />
      ) : (
        <div className="prose prose-invert prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-brand-text text-sm leading-relaxed">
            {editedContent}
          </div>
        </div>
      )}

      {/* Key Points Highlighted */}
      <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
        <p className="text-xs text-green-400 font-medium mb-2">✓ Key Points Covered:</p>
        <ul className="space-y-1">
          {coverLetter.key_points.map((point, idx) => (
            <li key={idx} className="text-xs text-brand-text-muted flex items-start gap-2">
              <span className="text-green-400">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-4">
        <button
          onClick={() => generateCoverLetterPDF(coverLetter, fullName)}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-brand-accent to-[#a78bfa] text-white rounded-lg hover:shadow-lg hover:shadow-brand-accent/20 transition-all flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Download Cover Letter
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-brand-dark-border text-brand-text rounded-lg hover:bg-brand-dark-border/80 transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// LEFT PANEL: JOB DESCRIPTION & AI INSIGHTS
// ============================================================================

function JobDescriptionPanel({
  jobData,
  cvDraft,
}: {
  jobData: JobData | null;
  cvDraft: CVDraft;
}) {
  if (!jobData) return null;

  return (
    <div className="bg-brand-dark-card border border-brand-dark-border rounded-2xl p-6 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
      <h2 className="text-lg font-bold text-brand-text mb-4 flex items-center gap-2">
        <Briefcase className="w-5 h-5 text-brand-accent" />
        Target Role
      </h2>

      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-semibold text-brand-text">{jobData.job_title}</h3>
          <p className="text-brand-text-muted">{jobData.company_name}</p>
          <p className="text-sm text-brand-text-muted flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3" />
            {jobData.location}
          </p>
        </div>

        <div className="h-px bg-brand-dark-border" />

        <div>
          <h4 className="text-sm font-semibold text-brand-text mb-2">Key Requirements</h4>
          <ul className="space-y-1">
            {jobData.key_requirements.slice(0, 5).map((req, idx) => (
              <li key={idx} className="text-sm text-brand-text-muted flex items-start gap-2">
                <ChevronRight className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
                <span>{req}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="h-px bg-brand-dark-border" />

        <div>
          <h4 className="text-sm font-semibold text-brand-text mb-2">Preferred Skills</h4>
          <div className="flex flex-wrap gap-2">
            {jobData.preferred_skills.slice(0, 8).map((skill, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-brand-accent/10 text-brand-accent text-xs rounded-full border border-brand-accent/30"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        <div className="h-px bg-brand-dark-border" />

        <div>
          <h4 className="text-sm font-semibold text-brand-text mb-2">AI Match Insights</h4>
          <div className="space-y-2">
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-xs text-green-400">
                ✓ CV tailored to match {cvDraft.job_title} requirements
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-xs text-blue-400">
                ℹ️ {cvDraft.page_count} page(s), {cvDraft.word_count} words
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CENTER PANEL: EDITABLE CV
// ============================================================================

function EditableCVPanel({
  cvDraft,
  onUpdate,
  editingSection,
  setEditingSection,
}: {
  cvDraft: CVDraft;
  onUpdate: (cv: CVDraft) => void;
  editingSection: string | null;
  setEditingSection: (section: string | null) => void;
}) {
  const [tempContact, setTempContact] = useState(cvDraft.contact_info);
  const [tempSocialLinks, setTempSocialLinks] = useState<SocialLink[]>(cvDraft.contact_info.socialLinks || []);
  const [tempSummary, setTempSummary] = useState(cvDraft.professional_summary);
  const [tempExperience, setTempExperience] = useState(cvDraft.experience);
  const [tempEducation, setTempEducation] = useState(cvDraft.education);
  const [tempSkills, setTempSkills] = useState(cvDraft.skills);
  const [tempCertifications, setTempCertifications] = useState(cvDraft.certifications);
  const [tempProjects, setTempProjects] = useState(cvDraft.projects);
  const [tempReferees, setTempReferees] = useState(cvDraft.referees);

  const handleSaveContact = () => {
    onUpdate({ ...cvDraft, contact_info: { ...tempContact, socialLinks: tempSocialLinks } });
    setEditingSection(null);
  };

  const handleSaveSummary = () => {
    onUpdate({ ...cvDraft, professional_summary: tempSummary });
    setEditingSection(null);
  };

  const handleSaveExperience = () => {
    onUpdate({ ...cvDraft, experience: tempExperience });
    setEditingSection(null);
  };

  const handleSaveEducation = () => {
    onUpdate({ ...cvDraft, education: tempEducation });
    setEditingSection(null);
  };

  const handleSaveSkills = () => {
    onUpdate({ ...cvDraft, skills: tempSkills });
    setEditingSection(null);
  };

  const handleSaveCertifications = () => {
    onUpdate({ ...cvDraft, certifications: tempCertifications });
    setEditingSection(null);
  };

  const handleSaveProjects = () => {
    onUpdate({ ...cvDraft, projects: tempProjects });
    setEditingSection(null);
  };

  const handleSaveReferees = () => {
    onUpdate({ ...cvDraft, referees: tempReferees });
    setEditingSection(null);
  };

  return (
    <div className="space-y-4">
      {/* Contact Info */}
      <EditableSection
        title="Contact Information"
        icon={<Mail className="w-5 h-5" />}
        isEditing={editingSection === "contact"}
        onEdit={() => {
          setTempContact(cvDraft.contact_info);
          setEditingSection("contact");
        }}
        onSave={handleSaveContact}
        onCancel={() => setEditingSection(null)}
      >
        {editingSection === "contact" ? (
          <div className="space-y-4">
            <input
              type="text"
              value={tempContact.email}
              onChange={(e) => setTempContact({ ...tempContact, email: e.target.value })}
              placeholder="Email"
              className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
            />
            <input
              type="text"
              value={tempContact.phone}
              onChange={(e) => setTempContact({ ...tempContact, phone: e.target.value })}
              placeholder="Phone"
              className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
            />
            <input
              type="text"
              value={tempContact.location}
              onChange={(e) => setTempContact({ ...tempContact, location: e.target.value })}
              placeholder="Location"
              className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
            />
            <input
              type="text"
              value={tempContact.linkedin || ""}
              onChange={(e) => setTempContact({ ...tempContact, linkedin: e.target.value })}
              placeholder="LinkedIn URL"
              className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
            />
            <input
              type="text"
              value={tempContact.github || ""}
              onChange={(e) => setTempContact({ ...tempContact, github: e.target.value })}
              placeholder="GitHub URL"
              className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
            />
            <input
              type="text"
              value={tempContact.portfolio || ""}
              onChange={(e) => setTempContact({ ...tempContact, portfolio: e.target.value })}
              placeholder="Portfolio URL"
              className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
            />
            
            {/* Additional Social Links */}
            <div className="mt-6 pt-6 border-t border-brand-dark-border space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-brand-text">Additional Social Links</h4>
                <button
                  onClick={() => setTempSocialLinks([...tempSocialLinks, { label: '', url: '' }])}
                  className="px-3 py-1.5 bg-brand-primary/20 hover:bg-brand-primary/30 text-brand-primary rounded-lg text-xs font-medium transition-colors border border-brand-primary/50"
                >
                  + Add Link
                </button>
              </div>
              {tempSocialLinks.map((link, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    type="text"
                    value={link.label}
                    onChange={(e) => {
                      const updated = [...tempSocialLinks];
                      updated[idx].label = e.target.value;
                      setTempSocialLinks(updated);
                    }}
                    placeholder="Label (e.g., Twitter, Instagram)"
                    className="flex-1 px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent text-sm"
                  />
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => {
                      const updated = [...tempSocialLinks];
                      updated[idx].url = e.target.value;
                      setTempSocialLinks(updated);
                    }}
                    placeholder="URL"
                    className="flex-1 px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent text-sm"
                  />
                  <button
                    onClick={() => setTempSocialLinks(tempSocialLinks.filter((_, i) => i !== idx))}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors border border-red-500/50"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-brand-text">{cvDraft.full_name}</h3>
            <div className="flex flex-wrap gap-4 text-sm text-brand-text-muted">
              <span className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {cvDraft.contact_info.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                {cvDraft.contact_info.phone}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {cvDraft.contact_info.location}
              </span>
            </div>
            
            {/* Social Links */}
            {(cvDraft.contact_info.linkedin || cvDraft.contact_info.github || cvDraft.contact_info.portfolio) && (
              <div className="flex flex-wrap gap-3 pt-2 border-t border-brand-dark-border">
                {cvDraft.contact_info.linkedin && (
                  <a
                    href={cvDraft.contact_info.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-brand-accent hover:underline"
                  >
                    🔗 LinkedIn
                  </a>
                )}
                {cvDraft.contact_info.github && (
                  <a
                    href={cvDraft.contact_info.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-brand-accent hover:underline"
                  >
                    💻 GitHub
                  </a>
                )}
                {cvDraft.contact_info.portfolio && (
                  <a
                    href={cvDraft.contact_info.portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-brand-accent hover:underline"
                  >
                    🌐 Portfolio
                  </a>
                )}
                {cvDraft.contact_info.socialLinks?.map((link, idx) => (
                  link.label && link.url && (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-brand-accent hover:underline"
                    >
                      🔗 {link.label}
                    </a>
                  )
                ))}
              </div>
            )}
          </div>
        )}
      </EditableSection>

      {/* Professional Summary */}
      <EditableSection
        title="Professional Summary"
        icon={<FileText className="w-5 h-5" />}
        isEditing={editingSection === "summary"}
        onEdit={() => {
          setTempSummary(cvDraft.professional_summary);
          setEditingSection("summary");
        }}
        onSave={handleSaveSummary}
        onCancel={() => setEditingSection(null)}
      >
        {editingSection === "summary" ? (
          <textarea
            value={tempSummary}
            onChange={(e) => setTempSummary(e.target.value)}
            className="w-full h-48 px-4 py-3 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent resize-none"
          />
        ) : (
          <p className="text-brand-text leading-relaxed">{cvDraft.professional_summary}</p>
        )}
      </EditableSection>

      {/* Experience */}
      <EditableSection
        title="Professional Experience"
        icon={<Briefcase className="w-5 h-5" />}
        isEditing={editingSection === "experience"}
        onEdit={() => {
          setTempExperience(cvDraft.experience);
          setEditingSection("experience");
        }}
        onSave={handleSaveExperience}
        onCancel={() => setEditingSection(null)}
      >
        {editingSection === "experience" ? (
          <div className="space-y-6">
            {tempExperience.map((exp, idx) => (
              <div key={idx} className="p-4 bg-brand-dark/50 rounded-lg space-y-3">
                <input
                  type="text"
                  value={exp.position}
                  onChange={(e) => {
                    const updated = [...tempExperience];
                    updated[idx].position = e.target.value;
                    setTempExperience(updated);
                  }}
                  placeholder="Position"
                  className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
                <input
                  type="text"
                  value={exp.company}
                  onChange={(e) => {
                    const updated = [...tempExperience];
                    updated[idx].company = e.target.value;
                    setTempExperience(updated);
                  }}
                  placeholder="Company"
                  className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
                <input
                  type="text"
                  value={exp.duration}
                  onChange={(e) => {
                    const updated = [...tempExperience];
                    updated[idx].duration = e.target.value;
                    setTempExperience(updated);
                  }}
                  placeholder="Duration (e.g., Jan 2020 - Dec 2021)"
                  className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {cvDraft.experience.map((exp, idx) => (
              <div key={idx} className="pb-4 border-b border-brand-dark-border last:border-0">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-brand-text">{exp.position}</h4>
                    <p className="text-sm text-brand-text-muted">{exp.company}</p>
                  </div>
                  <span className="text-xs text-brand-text-muted">{exp.duration}</span>
                </div>
                <ul className="space-y-1 mt-2">
                  {exp.achievements.map((achievement, i) => (
                    <li key={i} className="text-sm text-brand-text-muted flex items-start gap-2">
                      <ChevronRight className="w-4 h-4 text-brand-accent flex-shrink-0 mt-0.5" />
                      <span>{achievement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </EditableSection>

      {/* Education */}
      <EditableSection
        title="Education"
        icon={<GraduationCap className="w-5 h-5" />}
        isEditing={editingSection === "education"}
        onEdit={() => {
          setTempEducation(cvDraft.education);
          setEditingSection("education");
        }}
        onSave={handleSaveEducation}
        onCancel={() => setEditingSection(null)}
      >
        {editingSection === "education" ? (
          <div className="space-y-6">
            {tempEducation.map((edu, idx) => (
              <div key={idx} className="p-4 bg-brand-dark/50 rounded-lg space-y-3">
                <input
                  type="text"
                  value={edu.degree}
                  onChange={(e) => {
                    const updated = [...tempEducation];
                    updated[idx].degree = e.target.value;
                    setTempEducation(updated);
                  }}
                  placeholder="Degree"
                  className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
                <input
                  type="text"
                  value={edu.field}
                  onChange={(e) => {
                    const updated = [...tempEducation];
                    updated[idx].field = e.target.value;
                    setTempEducation(updated);
                  }}
                  placeholder="Field of Study"
                  className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
                <input
                  type="text"
                  value={edu.institution}
                  onChange={(e) => {
                    const updated = [...tempEducation];
                    updated[idx].institution = e.target.value;
                    setTempEducation(updated);
                  }}
                  placeholder="Institution"
                  className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
                <input
                  type="text"
                  value={edu.graduation_year}
                  onChange={(e) => {
                    const updated = [...tempEducation];
                    updated[idx].graduation_year = e.target.value;
                    setTempEducation(updated);
                  }}
                  placeholder="Graduation Year"
                  className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {cvDraft.education.map((edu, idx) => (
              <div key={idx}>
                <h4 className="font-semibold text-brand-text">{edu.degree} in {edu.field}</h4>
                <p className="text-sm text-brand-text-muted">{edu.institution}</p>
                <div className="flex gap-4 text-xs text-brand-text-muted mt-1">
                  {edu.honors && <span>• {edu.honors}</span>}
                  <span>• Graduated {edu.graduation_year}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </EditableSection>

      {/* Skills */}
      <EditableSection
        title="Skills"
        icon={<Code className="w-5 h-5" />}
        isEditing={editingSection === "skills"}
        onEdit={() => {
          setTempSkills(cvDraft.skills);
          setEditingSection("skills");
        }}
        onSave={handleSaveSkills}
        onCancel={() => setEditingSection(null)}
      >
        {editingSection === "skills" ? (
          <textarea
            value={tempSkills.join(", ")}
            onChange={(e) => setTempSkills(e.target.value.split(",").map(s => s.trim()).filter(s => s))}
            placeholder="Enter skills separated by commas"
            className="w-full h-32 px-4 py-3 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent resize-none"
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            {cvDraft.skills.map((skill, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-brand-accent/10 text-brand-accent text-sm rounded-full border border-brand-accent/30"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </EditableSection>

      {/* Certifications */}
      {cvDraft.certifications.length > 0 && (
        <EditableSection
          title="Certifications"
          icon={<Award className="w-5 h-5" />}
          isEditing={editingSection === "certifications"}
          onEdit={() => {
            setTempCertifications(cvDraft.certifications);
            setEditingSection("certifications");
          }}
          onSave={handleSaveCertifications}
          onCancel={() => setEditingSection(null)}
        >
          {editingSection === "certifications" ? (
            <div className="space-y-4">
              {tempCertifications.map((cert, idx) => (
                <div key={idx} className="p-4 bg-brand-dark/50 rounded-lg space-y-3">
                  <input
                    type="text"
                    value={cert.name}
                    onChange={(e) => {
                      const updated = [...tempCertifications];
                      updated[idx].name = e.target.value;
                      setTempCertifications(updated);
                    }}
                    placeholder="Certification Name"
                    className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                  <input
                    type="text"
                    value={cert.issuer}
                    onChange={(e) => {
                      const updated = [...tempCertifications];
                      updated[idx].issuer = e.target.value;
                      setTempCertifications(updated);
                    }}
                    placeholder="Issuer"
                    className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                  <input
                    type="text"
                    value={cert.date}
                    onChange={(e) => {
                      const updated = [...tempCertifications];
                      updated[idx].date = e.target.value;
                      setTempCertifications(updated);
                    }}
                    placeholder="Date"
                    className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                  <input
                    type="text"
                    value={cert.link || ''}
                    onChange={(e) => {
                      const updated = [...tempCertifications];
                      updated[idx].link = e.target.value;
                      setTempCertifications(updated);
                    }}
                    placeholder="Verification/Credential Link (optional)"
                    className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {cvDraft.certifications.map((cert, idx) => (
                <div key={idx} className="flex justify-between items-start group">
                  <div className="flex-1">
                    <h4 className="font-medium text-brand-text">{cert.name}</h4>
                    <p className="text-sm text-brand-text-muted">{cert.issuer}</p>
                    {cert.link && (
                      <a
                        href={cert.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-accent hover:underline flex items-center gap-1 mt-1"
                      >
                        🔗 View Credential
                      </a>
                    )}
                  </div>
                  <span className="text-xs text-brand-text-muted whitespace-nowrap">{cert.date}</span>
                </div>
              ))}
            </div>
          )}
        </EditableSection>
      )}

      {/* Projects */}
      {cvDraft.projects && cvDraft.projects.length > 0 && (
        <EditableSection
          title="Projects"
          icon={<Code className="w-5 h-5" />}
          isEditing={editingSection === "projects"}
          onEdit={() => {
            setTempProjects(cvDraft.projects);
            setEditingSection("projects");
          }}
          onSave={handleSaveProjects}
          onCancel={() => setEditingSection(null)}
        >
          {editingSection === "projects" ? (
            <div className="space-y-6">
              {tempProjects.map((project, idx) => (
                <div key={idx} className="p-4 bg-brand-dark/50 rounded-lg space-y-3">
                  <input
                    type="text"
                    value={project.name}
                    onChange={(e) => {
                      const updated = [...tempProjects];
                      updated[idx].name = e.target.value;
                      setTempProjects(updated);
                    }}
                    placeholder="Project Name"
                    className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                  <textarea
                    value={project.description}
                    onChange={(e) => {
                      const updated = [...tempProjects];
                      updated[idx].description = e.target.value;
                      setTempProjects(updated);
                    }}
                    placeholder="Project Description"
                    className="w-full h-24 px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent resize-none"
                  />
                  <input
                    type="text"
                    value={project.link || ""}
                    onChange={(e) => {
                      const updated = [...tempProjects];
                      updated[idx].link = e.target.value;
                      setTempProjects(updated);
                    }}
                    placeholder="Project Link"
                    className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {cvDraft.projects.map((project, idx) => (
                <div key={idx} className="p-3 bg-brand-dark/50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-brand-text">{project.name}</h4>
                    {project.link && (
                      <a
                        href={project.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-accent hover:underline flex items-center gap-1"
                      >
                        🔗 View
                      </a>
                    )}
                  </div>
                  <p className="text-sm text-brand-text-muted mb-2">{project.description}</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {project.technologies.map((tech, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-brand-accent/10 text-brand-accent text-xs rounded-full border border-brand-accent/30"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </EditableSection>
      )}

      {/* Referees */}
      <EditableSection
        title="Referees"
        icon={<Users className="w-5 h-5" />}
        isEditing={editingSection === "referees"}
        onEdit={() => {
          setTempReferees(cvDraft.referees);
          setEditingSection("referees");
        }}
        onSave={handleSaveReferees}
        onCancel={() => setEditingSection(null)}
      >
        {editingSection === "referees" ? (
          <div className="space-y-4">
            {tempReferees.map((ref, idx) => (
              <div key={idx} className="p-4 bg-brand-dark/50 rounded-lg space-y-3">
                <input
                  type="text"
                  value={ref.name}
                  onChange={(e) => {
                    const updated = [...tempReferees];
                    updated[idx].name = e.target.value;
                    setTempReferees(updated);
                  }}
                  placeholder="Referee Name"
                  className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
                <input
                  type="text"
                  value={ref.title}
                  onChange={(e) => {
                    const updated = [...tempReferees];
                    updated[idx].title = e.target.value;
                    setTempReferees(updated);
                  }}
                  placeholder="Title"
                  className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
                <input
                  type="text"
                  value={ref.organization}
                  onChange={(e) => {
                    const updated = [...tempReferees];
                    updated[idx].organization = e.target.value;
                    setTempReferees(updated);
                  }}
                  placeholder="Organization"
                  className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
                <input
                  type="email"
                  value={ref.email}
                  onChange={(e) => {
                    const updated = [...tempReferees];
                    updated[idx].email = e.target.value;
                    setTempReferees(updated);
                  }}
                  placeholder="Email"
                  className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
                <input
                  type="text"
                  value={ref.phone}
                  onChange={(e) => {
                    const updated = [...tempReferees];
                    updated[idx].phone = e.target.value;
                    setTempReferees(updated);
                  }}
                  placeholder="Phone"
                  className="w-full px-4 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {cvDraft.referees.map((ref, idx) => (
              <div key={idx} className="p-3 bg-brand-dark/50 rounded-lg">
                <h4 className="font-medium text-brand-text">{ref.name}</h4>
                <p className="text-sm text-brand-text-muted">{ref.title}</p>
                <p className="text-sm text-brand-text-muted">{ref.organization}</p>
                <div className="flex gap-4 text-xs text-brand-text-muted mt-2">
                  <span>{ref.email}</span>
                  <span>{ref.phone}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </EditableSection>
    </div>
  );
}

// ============================================================================
// EDITABLE SECTION COMPONENT
// ============================================================================

function EditableSection({
  title,
  icon,
  children,
  isEditing,
  onEdit,
  onSave,
  onCancel,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel?: () => void;
}) {
  return (
    <div className="bg-brand-dark-card border border-brand-dark-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-brand-text flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={onSave}
                className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-all bg-brand-success text-white hover:opacity-90"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={onCancel || (() => {})}
                className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-all bg-brand-dark-border text-brand-text-muted hover:bg-red-500/10 hover:text-red-400"
              >
                <Undo className="w-4 h-4" />
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={onEdit}
              className="px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-all bg-brand-dark-border text-brand-text-muted hover:bg-brand-accent/10 hover:text-brand-accent"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// ============================================================================
// RIGHT PANEL: PDF PREVIEW
// ============================================================================

function PDFPreviewPanel({ cvDraft }: { cvDraft: CVDraft }) {
  return (
    <div className="bg-brand-dark-card border border-brand-dark-border rounded-2xl p-6 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
      <h2 className="text-lg font-bold text-brand-text mb-4 flex items-center gap-2">
        <Eye className="w-5 h-5 text-brand-accent" />
        Live Preview
      </h2>

      {/* PDF Preview Placeholder */}
      <div className="bg-white rounded-lg shadow-2xl p-8 min-h-[800px]">
        {/* Header */}
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
          <h1 className="text-3xl font-bold text-gray-900">{cvDraft.full_name}</h1>
          <div className="flex justify-center flex-wrap gap-3 text-sm text-gray-600 mt-2">
            <span>{cvDraft.contact_info.email}</span>
            <span>•</span>
            <span>{cvDraft.contact_info.phone}</span>
            <span>•</span>
            <span>{cvDraft.contact_info.location}</span>
          </div>
          
          {/* Social Links Row */}
          {(cvDraft.contact_info.linkedin || cvDraft.contact_info.github || cvDraft.contact_info.portfolio || (cvDraft.contact_info.socialLinks && cvDraft.contact_info.socialLinks.length > 0)) && (
            <div className="flex justify-center flex-wrap gap-4 text-xs mt-2">
              {cvDraft.contact_info.linkedin && (
                <a href={cvDraft.contact_info.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  🔗 LinkedIn
                </a>
              )}
              {cvDraft.contact_info.github && (
                <a href={cvDraft.contact_info.github} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  💻 GitHub
                </a>
              )}
              {cvDraft.contact_info.portfolio && (
                <a href={cvDraft.contact_info.portfolio} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  🌐 Portfolio
                </a>
              )}
              {cvDraft.contact_info.socialLinks?.map((link, idx) => (
                link.label && link.url && (
                  <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    🔗 {link.label}
                  </a>
                )
              ))}
            </div>
          )}
        </div>

        {/* Professional Summary */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">
            PROFESSIONAL SUMMARY
          </h2>
          <p className="text-sm text-gray-700 leading-relaxed">
            {cvDraft.professional_summary}
          </p>
        </div>

        {/* Experience */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">
            PROFESSIONAL EXPERIENCE
          </h2>
          {cvDraft.experience.map((exp, idx) => (
            <div key={idx} className="mb-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900">{exp.position}</h3>
                  <p className="text-sm text-gray-700">{exp.company} • {exp.location}</p>
                </div>
                <span className="text-sm text-gray-600">{exp.duration}</span>
              </div>
              <ul className="list-disc list-inside text-sm text-gray-700 mt-1 space-y-1">
                {exp.achievements.map((achievement, i) => (
                  <li key={i}>{achievement}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Education */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">
            EDUCATION
          </h2>
          {cvDraft.education.map((edu, idx) => (
            <div key={idx} className="mb-2">
              <h3 className="font-bold text-gray-900">
                {edu.degree} in {edu.field}
              </h3>
              <p className="text-sm text-gray-700">{edu.institution}</p>
              <p className="text-sm text-gray-600">
                {edu.honors && `${edu.honors} • `}Graduated {edu.graduation_year}
              </p>
            </div>
          ))}
        </div>

        {/* Certifications */}
        {cvDraft.certifications && cvDraft.certifications.length > 0 && (
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">
              CERTIFICATIONS
            </h2>
            {cvDraft.certifications.map((cert, idx) => (
              <div key={idx} className="mb-2 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900">{cert.name}</h3>
                  <p className="text-sm text-gray-700">{cert.issuer}</p>
                  {cert.link && (
                    <a
                      href={cert.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      🔗 View Credential
                    </a>
                  )}
                </div>
                <span className="text-sm text-gray-600 whitespace-nowrap">{cert.date}</span>
              </div>
            ))}
          </div>
        )}

        {/* Projects */}
        {cvDraft.projects && cvDraft.projects.length > 0 && (
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">
              PROJECTS
            </h2>
            {cvDraft.projects.map((project, idx) => (
              <div key={idx} className="mb-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-900">{project.name}</h3>
                  {project.link && (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      🔗 View Project
                    </a>
                  )}
                </div>
                <p className="text-sm text-gray-700 mt-1">{project.description}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {project.technologies.map((tech, i) => (
                    <span key={i} className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                      {tech}
                    </span>
                  ))}
                </div>
                {project.github_repo && project.github_repo !== project.link && (
                  <a
                    href={project.github_repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                  >
                    💻 Source Code
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Skills */}
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">
            SKILLS
          </h2>
          <p className="text-sm text-gray-700">
            {cvDraft.skills.join(" • ")}
          </p>
        </div>

        {/* Referees */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-300 pb-1 mb-2">
            REFEREES
          </h2>
          <div className="grid grid-cols-1 gap-2">
            {cvDraft.referees.slice(0, 3).map((ref, idx) => (
              <div key={idx} className="text-sm">
                <p className="font-bold text-gray-900">{ref.name}</p>
                <p className="text-gray-700">{ref.title} • {ref.organization}</p>
                <p className="text-gray-600">{ref.email} • {ref.phone}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-brand-text-muted text-center mt-4">
        This is a simplified preview. Download PDF for full formatting.
      </p>
    </div>
  );
}

// ============================================================================
// MAIN EXPORT WITH SUSPENSE
// ============================================================================

export default function CVPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-brand-dark via-[#1a1a3e] to-brand-dark-card flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-brand-accent animate-spin mx-auto mb-4" />
            <p className="text-brand-text-muted">Loading preview...</p>
          </div>
        </div>
      }
    >
      <CVPreviewPageContent />
    </Suspense>
  );
}
