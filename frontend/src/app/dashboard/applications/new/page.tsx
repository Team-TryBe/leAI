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
  Lightbulb,
  Sparkles,
  Brain
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

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
    console.log('SearchParams loaded:', { jobId, extracted, raw: searchParams.toString() });
    if (jobId && extracted) {
      fetchMatchScore();
    } else {
      console.log('Conditions not met:', { jobId, extracted });
      setLoading(false);
    }
  }, [jobId, extracted]);

  const fetchMatchScore = async () => {
    try {
      const response = await apiClient.getMatchScore(jobId!);
      setMatchScore(response.data.data);
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
      const response = await apiClient.personalizeCv(parseInt(jobId!));
      setPersonalizationData(response.data.data);

      // Initialize edited sections with personalized content
      const sections: Record<string, string> = {};
      Object.entries(response.data.data.personalized_sections).forEach(([key, section]) => {
        sections[key] = (section as PersonalizedSection).personalized_content;
      });
      setEditedSections(sections);
    } catch (err: any) {
      // Check for quota errors
      if (err?.response?.status === 429 || err?.message?.includes('quota') || err?.message?.includes('RESOURCE_EXHAUSTED')) {
        setError("AI service quota exceeded. The system has reached its daily API limit. Please try again in a few hours or contact support.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to personalize CV");
      }
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
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full animate-spin" style={{animationDuration: '2s'}}></div>
              <div className="absolute inset-2 bg-brand-dark-card rounded-full flex items-center justify-center">
                <Brain className="w-7 h-7 text-indigo-400 animate-pulse" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-brand-text">Analyzing Your Profile</h2>
              <p className="text-sm text-brand-text-muted mt-1">Calculating match score...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!jobId || !extracted) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto py-20">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500/10 via-rose-500/5 to-red-500/10 border border-red-500/30 p-8">
            <div className="text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
              <div>
                <h2 className="text-xl font-semibold text-red-400">No Job Found</h2>
                <p className="text-sm text-red-300/80 mt-2">Please extract a job posting first</p>
              </div>
              <button
                onClick={() => router.push("/dashboard")}
                className="mt-4 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-500 text-white rounded-lg hover:shadow-lg transition-all text-sm font-medium"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-brand-dark-border rounded-lg transition text-brand-text"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-brand-text flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-indigo-400" />
                CV Optimizer
              </h1>
              <p className="text-xs text-brand-text-muted mt-0.5">AI-powered job application assistant</p>
            </div>
          </div>

          {personalizationData && (
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="px-4 py-2 rounded-lg border border-brand-dark-border hover:bg-brand-dark-border text-brand-text text-sm font-medium transition flex items-center gap-2"
              >
                <Download size={16} />
                PDF
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-lg text-white text-sm font-medium transition flex items-center gap-2"
              >
                <Send size={16} />
                Submit
              </button>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/30 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-400 font-semibold text-sm">Error</p>
                <p className="text-red-300/80 text-sm mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Match Score Card */}
        {matchScore && (
          <MatchScoreCard matchScore={matchScore} />
        )}

        {/* Personalize CTA */}
        {!personalizationData && matchScore && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-purple-500/10 border border-indigo-500/20 p-8 text-center">
            <Sparkles className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-brand-text mb-2">Ready to Optimize?</h3>
            <p className="text-sm text-brand-text-muted mb-6">AI will tailor your CV to match this job perfectly</p>
            <button
              onClick={handlePersonalize}
              disabled={personalizing}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 hover:shadow-lg text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {personalizing ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Start AI Optimization
                </>
              )}
            </button>
          </div>
        )}

        {/* Personalized Content */}
        {personalizationData && (
          <>
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard 
                icon={Brain} 
                label="Tone" 
                value={personalizationData.company_tone.charAt(0).toUpperCase() + personalizationData.company_tone.slice(1)}
                color="purple"
              />
              <StatCard 
                icon={Check} 
                label="Matches" 
                value={personalizationData.gap_analysis.direct_matches.length.toString()}
                color="green"
              />
              <StatCard 
                icon={TrendingUp} 
                label="Transferable" 
                value={personalizationData.gap_analysis.transferable_matches.length.toString()}
                color="blue"
              />
              <StatCard 
                icon={Target} 
                label="Keywords" 
                value={personalizationData.ats_optimized_keywords.length.toString()}
                color="orange"
              />
            </div>

            {/* Gap Analysis */}
            <GapAnalysisCard gapAnalysis={personalizationData.gap_analysis} />

            {/* ATS Keywords */}
            <div className="card-dark p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-brand-text mb-3 flex items-center gap-2">
                <Zap size={16} className="text-indigo-400" />
                ATS-Optimized Keywords
              </h3>
              <div className="flex flex-wrap gap-2">
                {personalizationData.ats_optimized_keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 rounded-md text-xs font-medium border border-indigo-500/20"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="card-dark p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="text-sm font-semibold text-brand-text">Review Your Sections</p>
                <p className="text-xs text-brand-text-muted mt-0.5">Edit or accept AI-optimized content below</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    if (!jobId) return
                    router.push(`/dashboard/applications/preview?job_id=${jobId}`)
                  }}
                  disabled={!jobId}
                  className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-sm font-medium transition border border-indigo-500/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eye size={16} />
                  Preview & Edit CV
                </button>
                <button
                  onClick={acceptAllChanges}
                  className="px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg text-sm font-medium transition border border-green-500/30 flex items-center gap-2"
                >
                  <Check size={16} />
                  Accept All
                </button>
              </div>
            </div>

            {/* Personalized Sections */}
            <div className="space-y-4">
              {Object.entries(personalizationData.personalized_sections).map(([key, section]) => (
                <SectionCard
                  key={key}
                  sectionKey={key}
                  section={section}
                  editedContent={editedSections[key] || section.personalized_content}
                  onUpdate={updateSection}
                  onRevert={revertSection}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
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
  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    'purple': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    'green': { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
    'blue': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    'orange': { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  };
  
  const colors = colorClasses[color] || colorClasses['purple'];
  
  return (
    <div className={`${colors.bg} ${colors.border} border rounded-lg p-3 text-center`}>
      <Icon size={18} className={`${colors.text} mx-auto mb-2`} />
      <p className={`text-lg font-bold ${colors.text}`}>{value}</p>
      <p className="text-xs text-brand-text-muted mt-0.5">{label}</p>
    </div>
  );
}

// Match Score Card Component
function MatchScoreCard({ matchScore }: { matchScore: MatchScoreBreakdown }) {
  const getColors = (band: string) => {
    switch (band) {
      case "green":
        return { bg: 'from-green-500/10 to-emerald-500/10', border: 'border-green-500/30', text: 'text-green-400', ring: 'stroke-green-500', track: 'stroke-green-500/20' };
      case "yellow":
        return { bg: 'from-amber-500/10 to-yellow-500/10', border: 'border-amber-500/30', text: 'text-amber-400', ring: 'stroke-amber-500', track: 'stroke-amber-500/20' };
      default:
        return { bg: 'from-red-500/10 to-rose-500/10', border: 'border-red-500/30', text: 'text-red-400', ring: 'stroke-red-500', track: 'stroke-red-500/20' };
    }
  };

  const colors = getColors(matchScore.color_band);
  const percentage = matchScore.total_score;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-xl p-6`}>
      <div className="grid md:grid-cols-[200px_1fr] gap-6">
        {/* Circular Progress */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-36 h-36 mb-3">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="72" cy="72" r="45" className={colors.track} strokeWidth="8" fill="none" />
              <circle
                cx="72"
                cy="72"
                r="45"
                className={`${colors.ring} transition-all duration-1000 ease-out`}
                strokeWidth="8"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${colors.text}`}>{percentage.toFixed(0)}</span>
              <span className={`text-xs font-semibold ${colors.text} opacity-80`}>% MATCH</span>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-lg ${colors.bg} border ${colors.border}`}>
            <p className={`text-xs font-semibold ${colors.text}`}>
              {matchScore.color_band === "green" && "✨ Excellent"}
              {matchScore.color_band === "yellow" && "⚡ Good"}
              {matchScore.color_band === "red" && "📈 Needs Work"}
            </p>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-brand-text mb-3">Score Breakdown</h3>
          <ScoreBar label="Keywords" score={matchScore.keyword_match} maxScore={40} />
          <ScoreBar label="Experience" score={matchScore.experience_match} maxScore={30} />
          <ScoreBar label="Skills" score={matchScore.skills_match} maxScore={20} />
          <ScoreBar label="Education" score={matchScore.education_match} maxScore={10} />

          {matchScore.recommendations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-brand-dark-border">
              <h4 className="text-xs font-semibold text-brand-text mb-2 flex items-center gap-1.5">
                <Lightbulb size={14} className="text-indigo-400" />
                Tips
              </h4>
              <ul className="space-y-1.5">
                {matchScore.recommendations.slice(0, 3).map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-indigo-400 text-xs mt-0.5">→</span>
                    <span className="text-xs text-brand-text-muted">{rec}</span>
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
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-brand-text">{label}</span>
        <span className="text-xs text-indigo-400 font-semibold">{score.toFixed(0)}/{maxScore}</span>
      </div>
      <div className="w-full bg-brand-dark-border/50 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1.5 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Gap Analysis Card Component
function GapAnalysisCard({ gapAnalysis }: { gapAnalysis: GapAnalysis }) {
  return (
    <div className="card-dark p-5 rounded-lg space-y-4">
      <h3 className="text-sm font-semibold text-brand-text flex items-center gap-2">
        <Target size={16} className="text-indigo-400" />
        Skills Analysis
      </h3>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Direct Matches */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle size={14} className="text-green-400" />
            <h4 className="text-xs font-semibold text-green-400">Direct Matches</h4>
          </div>
          {gapAnalysis.direct_matches.length > 0 ? (
            <ul className="space-y-1">
              {gapAnalysis.direct_matches.slice(0, 5).map((skill, index) => (
                <li key={index} className="flex items-center gap-1.5">
                  <div className="w-1 h-1 bg-green-400 rounded-full" />
                  <span className="text-xs text-brand-text">{skill}</span>
                </li>
              ))}
              {gapAnalysis.direct_matches.length > 5 && (
                <li className="text-xs text-brand-text-muted italic ml-2.5">+{gapAnalysis.direct_matches.length - 5} more</li>
              )}
            </ul>
          ) : (
            <p className="text-xs text-brand-text-muted italic">None found</p>
          )}
        </div>

        {/* Transferable */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={14} className="text-blue-400" />
            <h4 className="text-xs font-semibold text-blue-400">Transferable</h4>
          </div>
          {gapAnalysis.transferable_matches.length > 0 ? (
            <ul className="space-y-1.5">
              {gapAnalysis.transferable_matches.slice(0, 3).map((match, index) => (
                <li key={index} className="text-xs space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 bg-blue-400 rounded-full" />
                    <span className="font-medium text-brand-text">{match.jd_skill}</span>
                  </div>
                  <p className="text-xs text-brand-text-muted ml-2.5">→ {match.user_skill}</p>
                </li>
              ))}
              {gapAnalysis.transferable_matches.length > 3 && (
                <li className="text-xs text-brand-text-muted italic ml-2.5">+{gapAnalysis.transferable_matches.length - 3} more</li>
              )}
            </ul>
          ) : (
            <p className="text-xs text-brand-text-muted italic">None identified</p>
          )}
        </div>

        {/* Gaps */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <XCircle size={14} className="text-red-400" />
            <h4 className="text-xs font-semibold text-red-400">Missing Skills</h4>
          </div>
          {gapAnalysis.gaps.length > 0 ? (
            <ul className="space-y-1">
              {gapAnalysis.gaps.slice(0, 5).map((gap, index) => (
                <li key={index} className="flex items-center gap-1.5">
                  <div className="w-1 h-1 bg-red-400 rounded-full" />
                  <span className="text-xs text-brand-text">{gap}</span>
                </li>
              ))}
              {gapAnalysis.gaps.length > 5 && (
                <li className="text-xs text-brand-text-muted italic ml-2.5">+{gapAnalysis.gaps.length - 5} more</li>
              )}
            </ul>
          ) : (
            <p className="text-xs text-green-400 italic flex items-center gap-1">
              <CheckCircle size={12} />
              No gaps!
            </p>
          )}
        </div>
      </div>

      {/* Priorities */}
      {gapAnalysis.priorities.length > 0 && (
        <div className="pt-3 border-t border-brand-dark-border">
          <h4 className="text-xs font-semibold text-brand-text mb-2">Priority Skills</h4>
          <div className="flex flex-wrap gap-1.5">
            {gapAnalysis.priorities.slice(0, 6).map((priority, index) => (
              <span
                key={index}
                className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-xs font-medium border border-indigo-500/20"
              >
                {priority}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Section Card Component
function SectionCard({
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
    <div className="card-dark rounded-lg border border-brand-dark-border overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500/10 to-violet-500/10 px-4 py-3 border-b border-brand-dark-border flex items-center justify-between">
        <h3 className="text-sm font-semibold text-brand-text">{section.section_name}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-3 py-1.5 text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-md transition border border-indigo-500/20 flex items-center gap-1.5"
          >
            {isEditing ? <Eye size={14} /> : <Edit2 size={14} />}
            {isEditing ? "View" : "Edit"}
          </button>
          <button
            onClick={() => onRevert(sectionKey)}
            className="px-3 py-1.5 text-xs bg-brand-dark-border hover:bg-brand-dark text-brand-text-muted hover:text-brand-text rounded-md transition flex items-center gap-1.5"
          >
            <RotateCcw size={14} />
            Revert
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Content Comparison */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Original */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-brand-text-muted rounded-full" />
              <h4 className="text-xs font-semibold text-brand-text-muted uppercase">Original</h4>
            </div>
            <div className="bg-brand-dark/50 border border-brand-dark-border rounded-lg p-3 min-h-[120px]">
              <p className="text-xs text-brand-text-muted leading-relaxed whitespace-pre-wrap">
                {section.original_content}
              </p>
            </div>
          </div>

          {/* AI Optimized */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
              <h4 className="text-xs font-semibold text-green-400 uppercase">
                {isEditing ? "Editing" : "AI Optimized"}
              </h4>
            </div>
            {isEditing ? (
              <textarea
                value={editedContent}
                onChange={(e) => onUpdate(sectionKey, e.target.value)}
                className="w-full min-h-[120px] p-3 border border-indigo-500/30 bg-brand-dark-card rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs text-brand-text resize-none leading-relaxed transition"
                placeholder="Edit content..."
              />
            ) : (
              <div className="bg-gradient-to-br from-green-500/5 to-emerald-500/5 border border-green-500/20 rounded-lg p-3 min-h-[120px]">
                <p className="text-xs text-brand-text leading-relaxed whitespace-pre-wrap">
                  {editedContent}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Improvements */}
        {section.improvements.length > 0 && (
          <div className="bg-green-500/5 rounded-lg p-3 border border-green-500/20">
            <h4 className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1.5">
              <Sparkles size={12} />
              Improvements
            </h4>
            <ul className="space-y-1.5">
              {section.improvements.map((improvement, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-green-400 text-xs mt-0.5">✓</span>
                  <span className="text-xs text-brand-text leading-relaxed">{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
