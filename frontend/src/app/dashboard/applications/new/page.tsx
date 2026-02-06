"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  RefreshCw, 
  Download, 
  Send,
  Zap,
  TrendingUp,
  Eye,
  Edit2,
  RotateCcw,
  Check,
  Target,
  Lightbulb
} from "lucide-react";
import { getAuthToken } from "@/lib/auth";

// Disable static prerendering since this page uses dynamic features
export const dynamic = "force-dynamic";

// Types
interface MatchScoreBreakdown {
  keyword_match: number;
  experience_match: number;
  skills_match: number;
  education_match: number;
  total_score: number;
  color_band: "red" | "yellow" | "green";
  recommendations: string[];
}

interface TransferableMatch {
  jd_skill: string;
  user_skill: string;
  suggestion: string;
}

interface GapAnalysis {
  direct_matches: string[];
  transferable_matches: TransferableMatch[];
  gaps: string[];
  priorities: string[];
}

interface PersonalizedSection {
  section_name: string;
  original_content: string;
  personalized_content: string;
  improvements: string[];
}

interface CVPersonalizationData {
  match_score: MatchScoreBreakdown;
  gap_analysis: GapAnalysis;
  personalized_sections: Record<string, PersonalizedSection>;
  ats_optimized_keywords: string[];
  company_tone: string;
}

export default function NewApplicationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = searchParams.get("job_id");
  const extracted = searchParams.get("extracted") === "true";

  const [loading, setLoading] = useState(true);
  const [personalizing, setPersonalizing] = useState(false);
  const [matchScore, setMatchScore] = useState<MatchScoreBreakdown | null>(null);
  const [personalizationData, setPersonalizationData] = useState<CVPersonalizationData | null>(null);
  const [editedSections, setEditedSections] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  // Fetch match score on page load
  useEffect(() => {
    if (jobId && extracted) {
      fetchMatchScore();
    } else {
      setLoading(false);
    }
  }, [jobId, extracted]);

  const fetchMatchScore = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError("Authentication required. Please log in.");
        setLoading(false);
        return;
      }
      const response = await fetch(`http://localhost:8000/api/v1/cv-personalizer/match-score/${jobId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch match score");

      const data = await response.json();
      setMatchScore(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load match score");
    } finally {
      setLoading(false);
    }
  };

  const handlePersonalize = async () => {
    setPersonalizing(true);
    setError(null);

    try {
      const token = getAuthToken();
      if (!token) {
        setError("Authentication required. Please log in.");
        setPersonalizing(false);
        return;
      }
      const response = await fetch(`http://localhost:8000/api/v1/cv-personalizer/personalize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ job_id: parseInt(jobId!) }),
      });

      if (!response.ok) throw new Error("Failed to personalize CV");

      const data = await response.json();
      setPersonalizationData(data.data);

      // Initialize edited sections with personalized content
      const sections: Record<string, string> = {};
      Object.entries(data.data.personalized_sections).forEach(([key, section]) => {
        sections[key] = (section as PersonalizedSection).personalized_content;
      });
      setEditedSections(sections);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to personalize CV");
    } finally {
      setPersonalizing(false);
    }
  };

  const updateSection = (sectionKey: string, content: string) => {
    setEditedSections((prev) => ({ ...prev, [sectionKey]: content }));
  };

  const acceptAllChanges = () => {
    if (!personalizationData) return;
    const sections: Record<string, string> = {};
    Object.entries(personalizationData.personalized_sections).forEach(([key, section]) => {
      sections[key] = section.personalized_content;
    });
    setEditedSections(sections);
  };

  const revertSection = (sectionKey: string) => {
    if (!personalizationData) return;
    const section = personalizationData.personalized_sections[sectionKey];
    if (section) {
      setEditedSections((prev) => ({ ...prev, [sectionKey]: section.original_content }));
    }
  };

  const handleDownload = () => {
    // TODO: Implement PDF download
    alert("PDF download coming soon!");
  };

  const handleSubmit = () => {
    // TODO: Navigate to application submission
    router.push(`/dashboard/applications/${jobId}/submit`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-dark via-brand-dark-card to-brand-dark">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 bg-gradient-to-r from-brand-primary to-brand-accent rounded-full animate-spin" style={{animationDuration: '3s'}}></div>
              <div className="absolute inset-2 bg-brand-dark rounded-full flex items-center justify-center">
                <Zap className="w-6 h-6 text-brand-primary" />
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-brand-text">Analyzing Your Match</h2>
            <p className="text-brand-text-muted mt-2">Personalizing your CV with AI intelligence...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!jobId || !extracted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-dark via-brand-dark-card to-brand-dark">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 text-brand-error mx-auto" />
          <div>
            <h2 className="text-xl font-display font-bold text-brand-text">No Job Found</h2>
            <p className="text-brand-text-muted mt-2">Please extract a job posting first</p>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 px-6 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-dark via-[#1a1a3e] to-brand-dark-card">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-brand-dark/80 backdrop-blur-xl border-b border-brand-dark-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-brand-dark-border rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-brand-text" />
              </button>
              <div>
                <h1 className="text-2xl font-display font-bold text-brand-text">CV Optimizer</h1>
                <p className="text-xs text-brand-text-muted">AI-Powered Application Assistant</p>
              </div>
            </div>
            {personalizationData && (
              <div className="flex gap-3">
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-lg border border-brand-dark-border hover:bg-brand-dark-border text-brand-text text-sm font-medium transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-brand-primary to-brand-accent hover:shadow-lg hover:shadow-brand-primary/50 text-white text-sm font-medium transition-all flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">Submit</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="bg-gradient-to-r from-brand-error/20 to-brand-error/10 border border-brand-error/50 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-brand-error mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-brand-error font-semibold text-sm">Error Loading Profile</p>
              <p className="text-brand-error/80 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Match Score Section - Featured Card */}
        {matchScore && (
          <div className="mb-2">
            <MatchScoreMeter matchScore={matchScore} />
          </div>
        )}

        {/* Personalize CTA - When not personalized */}
        {!personalizationData && matchScore && (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-primary/20 via-brand-accent/20 to-brand-primary/20 border border-brand-primary/30 p-8">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/0 via-brand-accent/5 to-brand-primary/0"></div>
            <div className="relative z-10 text-center space-y-4">
              <Lightbulb className="w-12 h-12 text-brand-accent mx-auto" />
              <div>
                <h3 className="text-2xl font-display font-bold text-brand-text">Ready to Personalize?</h3>
                <p className="text-brand-text-muted text-sm mt-1">Our AI will rewrite your CV to match this job perfectly</p>
              </div>
              <button
                onClick={handlePersonalize}
                disabled={personalizing}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-brand-primary to-brand-accent hover:shadow-lg hover:shadow-brand-primary/30 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {personalizing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Personalizing...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    AI Personalize My CV
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Personalized Content */}
        {personalizationData && (
          <>
            {/* Quick Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard 
                icon={Target} 
                label="Company Tone" 
                value={personalizationData.company_tone.charAt(0).toUpperCase() + personalizationData.company_tone.slice(1)}
                color="brand-primary"
              />
              <StatCard 
                icon={Check} 
                label="Direct Matches" 
                value={personalizationData.gap_analysis.direct_matches.length.toString()}
                color="brand-success"
              />
              <StatCard 
                icon={TrendingUp} 
                label="Transferable" 
                value={personalizationData.gap_analysis.transferable_matches.length.toString()}
                color="brand-accent"
              />
              <StatCard 
                icon={Zap} 
                label="ATS Keywords" 
                value={personalizationData.ats_optimized_keywords.length.toString()}
                color="brand-primary"
              />
            </div>

            {/* Gap Analysis Section */}
            <div>
              <GapAnalysisDisplay gapAnalysis={personalizationData.gap_analysis} />
            </div>

            {/* Action Bar */}
            <div className="bg-gradient-to-r from-brand-dark-card to-brand-dark-card border border-brand-dark-border rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="text-brand-text text-sm font-semibold">All changes ready to review</p>
                <p className="text-brand-text-muted text-xs mt-1">Accept or edit sections below, or preview the full CV</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/dashboard/applications/preview?job_id=${jobId}`)}
                  className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-brand-accent to-[#a78bfa] text-white rounded-lg text-sm font-semibold transition-all hover:shadow-lg hover:shadow-brand-accent/20 flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Preview & Edit CV
                </button>
                <button
                  onClick={acceptAllChanges}
                  className="w-full sm:w-auto px-6 py-2 bg-brand-success/20 hover:bg-brand-success/30 text-brand-success rounded-lg text-sm font-semibold transition-colors border border-brand-success/50 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Accept All
                </button>
              </div>
            </div>

            {/* Personalized Sections */}
            <div className="space-y-4">
              <h2 className="text-xl font-display font-bold text-brand-text">Edit Your Sections</h2>
              {Object.entries(personalizationData.personalized_sections).map(([key, section]) => (
                <PersonalizedSectionCard
                  key={key}
                  sectionKey={key}
                  section={section}
                  editedContent={editedSections[key] || section.personalized_content}
                  onUpdate={updateSection}
                  onRevert={revertSection}
                />
              ))}
            </div>

            {/* ATS Keywords Section */}
            <div className="bg-gradient-to-br from-brand-dark-card to-brand-dark border border-brand-dark-border rounded-xl p-6">
              <h3 className="text-lg font-display font-bold text-brand-text mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-brand-accent" />
                ATS-Optimized Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {personalizationData.ats_optimized_keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-sm font-medium border border-brand-primary/50 hover:bg-brand-primary/30 transition-colors"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// StatCard Component
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: any; 
  label: string; 
  value: string; 
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    'brand-primary': 'bg-brand-primary/20 text-brand-primary border-brand-primary/50',
    'brand-accent': 'bg-brand-accent/20 text-brand-accent border-brand-accent/50',
    'brand-success': 'bg-brand-success/20 text-brand-success border-brand-success/50',
  };
  
  return (
    <div className={`${colorClasses[color] || colorClasses['brand-primary']} border rounded-lg p-4 flex flex-col items-center gap-2`}>
      <Icon className="w-5 h-5" />
      <div className="text-center">
        <p className="text-2xl font-display font-bold">{value}</p>
        <p className="text-xs text-brand-text-muted mt-1">{label}</p>
      </div>
    </div>
  );
}

// Match Score Meter Component
function MatchScoreMeter({ matchScore }: { matchScore: MatchScoreBreakdown }) {
  const getColorClasses = (band: string) => {
    switch (band) {
      case "red":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-700",
          ring: "stroke-red-600",
          track: "stroke-red-100",
        };
      case "yellow":
        return {
          bg: "from-amber-500/20 to-amber-600/20",
          border: "border-amber-500/50",
          text: "text-amber-400",
          ring: "stroke-amber-500",
          track: "stroke-amber-500/20",
          icon: "🟡",
        };
      case "green":
        return {
          bg: "from-brand-success/20 to-emerald-500/20",
          border: "border-brand-success/50",
          text: "text-brand-success",
          ring: "stroke-brand-success",
          track: "stroke-brand-success/20",
          icon: "✅",
        };
      default:
        return {
          bg: "from-brand-primary/20 to-brand-accent/20",
          border: "border-brand-primary/50",
          text: "text-brand-primary",
          ring: "stroke-brand-primary",
          track: "stroke-brand-primary/20",
          icon: "📊",
        };
    }
  };

  const colors = getColorClasses(matchScore.color_band);
  const percentage = matchScore.total_score;
  const circumference = 2 * Math.PI * 58; // radius = 58
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-2xl p-8 backdrop-blur-sm`}>
      <div className="grid md:grid-cols-2 gap-8">
        {/* Circular Progress */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-48 h-48 mb-4">
            <svg className="w-full h-full transform -rotate-90 drop-shadow-lg">
              <circle
                cx="96"
                cy="96"
                r="58"
                className={colors.track}
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="96"
                cy="96"
                r="58"
                className={`${colors.ring} transition-all duration-1000 ease-out`}
                strokeWidth="12"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-5xl font-display font-bold ${colors.text}`}>
                {percentage.toFixed(0)}
              </span>
              <span className={`text-xs font-semibold ${colors.text} opacity-80 mt-1`}>% MATCH</span>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-lg bg-gradient-to-r ${colors.bg} border ${colors.border}`}>
            <p className={`text-sm font-semibold ${colors.text} text-center`}>
              {matchScore.color_band === "green" && "✨ Excellent Match - Ready to Submit!"}
              {matchScore.color_band === "yellow" && "⚡ Good Match - Can Be Enhanced"}
              {matchScore.color_band === "red" && "📈 Needs Improvement"}
            </p>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-5">
          <h3 className="text-lg font-display font-bold text-brand-text">Score Components</h3>

          <ScoreBar label="Keywords" score={matchScore.keyword_match} maxScore={40} />
          <ScoreBar label="Experience" score={matchScore.experience_match} maxScore={30} />
          <ScoreBar label="Skills" score={matchScore.skills_match} maxScore={20} />
          <ScoreBar label="Education" score={matchScore.education_match} maxScore={10} />

          {/* Recommendations */}
          {matchScore.recommendations.length > 0 && (
            <div className="mt-6 pt-6 border-t border-brand-dark-border">
              <h4 className="text-sm font-semibold text-brand-text mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-brand-accent" />
                Tips to Improve
              </h4>
              <ul className="space-y-2">
                {matchScore.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-brand-accent mt-0.5">→</span>
                    <span className="text-sm text-brand-text-muted">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Score Bar Component
function ScoreBar({ label, score, maxScore }: { label: string; score: number; maxScore: number }) {
  const percentage = (score / maxScore) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-semibold text-brand-text">{label}</span>
        <span className="text-sm text-brand-accent font-bold">
          {score.toFixed(0)}/{maxScore}
        </span>
      </div>
      <div className="w-full bg-brand-dark-border/50 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-brand-primary to-brand-accent h-2 rounded-full transition-all duration-700 ease-out shadow-lg shadow-brand-primary/50"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Gap Analysis Display Component
function GapAnalysisDisplay({ gapAnalysis }: { gapAnalysis: GapAnalysis }) {
  return (
    <div className="bg-gradient-to-br from-brand-dark-card to-brand-dark border border-brand-dark-border rounded-2xl p-6 space-y-6">
      <h3 className="text-lg font-display font-bold text-brand-text flex items-center gap-2">
        <Target className="w-5 h-5 text-brand-accent" />
        Gap Analysis
      </h3>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Direct Matches */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-brand-success" />
            <h4 className="font-semibold text-brand-text">Direct Matches</h4>
          </div>
          {gapAnalysis.direct_matches.length > 0 ? (
            <ul className="space-y-2">
              {gapAnalysis.direct_matches.map((skill, index) => (
                <li key={index} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-brand-success rounded-full" />
                  <span className="text-sm text-brand-text">{skill}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-brand-text-muted italic">No direct matches</p>
          )}
        </div>

        {/* Transferable Matches */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-brand-accent" />
            <h4 className="font-semibold text-brand-text">Transferable</h4>
          </div>
          {gapAnalysis.transferable_matches.length > 0 ? (
            <ul className="space-y-3">
              {gapAnalysis.transferable_matches.map((match, index) => (
                <li key={index} className="text-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-brand-accent rounded-full" />
                    <span className="font-semibold text-brand-text">{match.jd_skill}</span>
                  </div>
                  <p className="text-xs text-brand-text-muted ml-4">
                    ✦ {match.user_skill}
                  </p>
                  <p className="text-xs text-brand-accent ml-4">
                    → {match.suggestion}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-brand-text-muted italic">No matches identified</p>
          )}
        </div>

        {/* Gaps */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-5 h-5 text-red-600" />
            <h4 className="font-semibold text-gray-900">Skills to Add</h4>
          </div>
          {gapAnalysis.gaps.length > 0 ? (
            <ul className="space-y-2">
              {gapAnalysis.gaps.map((gap, index) => (
                <li key={index} className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-600 rounded-full" />
                  <span className="text-sm text-gray-700">{gap}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-green-600 italic">✅ No major gaps!</p>
          )}
        </div>
      </div>

      {/* Priorities */}
      {gapAnalysis.priorities.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Priority Skills from Job Description:</h4>
          <div className="flex flex-wrap gap-2">
            {gapAnalysis.priorities.map((priority, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium border border-indigo-200"
              >
                #{index + 1} {priority}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Personalized Section Card Component
function PersonalizedSectionCard({
  sectionKey,
  section,
  editedContent,
  onUpdate,
  onRevert,
}: {
  sectionKey: string;
  section: PersonalizedSection;
  editedContent: string;
  onUpdate: (key: string, content: string) => void;
  onRevert: (key: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{section.section_name}</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
            >
              {isEditing ? "Preview" : "Edit"}
            </button>
            <button
              onClick={() => onRevert(sectionKey)}
              className="px-3 py-1 text-sm text-brand-text-muted hover:text-brand-text rounded-lg transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Revert
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Side-by-Side Comparison */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Original */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-brand-text-muted" />
              <h4 className="text-xs font-bold text-brand-text-muted uppercase tracking-wider">Original</h4>
            </div>
            <div className="bg-brand-dark border border-brand-dark-border rounded-lg p-4">
              <p className="whitespace-pre-wrap text-sm text-brand-text-muted leading-relaxed">
                {section.original_content}
              </p>
            </div>
          </div>

          {/* Personalized/Edited */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={isEditing ? 'flex items-center gap-1' : 'flex items-center gap-1'}>
                {isEditing ? (
                  <>
                    <Edit2 className="w-4 h-4 text-brand-primary" />
                    <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider">Editing</h4>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-brand-success" />
                    <h4 className="text-xs font-bold text-brand-success uppercase tracking-wider">Personalized</h4>
                  </>
                )}
              </span>
            </div>
            {isEditing ? (
              <textarea
                value={editedContent}
                onChange={(e) => onUpdate(sectionKey, e.target.value)}
                className="w-full h-40 p-4 border border-brand-primary/50 bg-brand-dark/50 rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-transparent text-sm text-brand-text placeholder-brand-text-muted resize-none"
                placeholder="Edit your content..."
              />
            ) : (
              <div className="bg-gradient-to-br from-brand-primary/10 to-brand-accent/10 border border-brand-primary/30 rounded-lg p-4">
                <p className="whitespace-pre-wrap text-sm text-brand-text leading-relaxed">
                  {editedContent}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Improvements */}
        {section.improvements.length > 0 && (
          <div className="bg-gradient-to-r from-brand-success/10 to-emerald-500/10 rounded-lg p-4 border border-brand-success/30">
            <h4 className="text-sm font-semibold text-brand-success mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              AI Improvements
            </h4>
            <ul className="space-y-2">
              {section.improvements.map((improvement, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-brand-success mt-0.5">✓</span>
                  <span className="text-sm text-brand-text-muted">{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
