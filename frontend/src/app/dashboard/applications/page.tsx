"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Eye,
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  Mail,
  ChevronLeft,
  ChevronRight,
  FileText,
  MessageSquare,
} from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SendEmailModal } from "@/components/dashboard/SendEmailModal";
import { getAuthToken } from "@/lib/auth";

interface Application {
  id: number;
  job_title: string;
  company_name: string;
  location: string;
  status: string;
  created_at: string;
  submitted_at: string | null;
  application_email_to: string;
  application_email_cc: string | null;
  cv: string;
  cover_letter: string;
  cv_pdf_path: string | null;
  cover_letter_pdf_path: string | null;
  error_message: string | null;
}

interface PaginationData {
  items: Application[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

const statusConfig = {
  pending: {
    icon: Clock,
    color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
    label: "Pending",
  },
  review: {
    icon: AlertCircle,
    color: "bg-blue-500/10 text-blue-500 border-blue-500/30",
    label: "Review",
  },
  sent: {
    icon: CheckCircle,
    color: "bg-green-500/10 text-green-500 border-green-500/30",
    label: "Sent",
  },
  waiting_response: {
    icon: Clock,
    color: "bg-purple-500/10 text-purple-500 border-purple-500/30",
    label: "Waiting Response",
  },
  feedback_received: {
    icon: Mail,
    color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
    label: "Feedback Received",
  },
  interview_scheduled: {
    icon: CheckCircle,
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
    label: "Interview Scheduled",
  },
  offer_negotiation: {
    icon: CheckCircle,
    color: "bg-green-600/10 text-green-600 border-green-600/30",
    label: "Offer Negotiation",
  },
  rejected: {
    icon: AlertCircle,
    color: "bg-red-500/10 text-red-500 border-red-500/30",
    label: "Rejected",
  },
  archived: {
    icon: AlertCircle,
    color: "bg-gray-500/10 text-gray-500 border-gray-500/30",
    label: "Archived",
  },
};

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [detailsTab, setDetailsTab] = useState<"cv" | "cover-letter" | "email">(
    "cv"
  );
  const [pdfUrls, setPdfUrls] = useState<{ cv: string | null; coverLetter: string | null }>({
    cv: null,
    coverLetter: null,
  });
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showSendEmailModal, setShowSendEmailModal] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);

  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
    fetchApplications(1);
  }, [statusFilter]);

  useEffect(() => {
    fetchApplications(currentPage);
  }, [currentPage]);

  useEffect(() => {
    fetchAnalytics();
    checkGmailStatus();
  }, []);

  // Update PDF URLs when selected app changes
  useEffect(() => {
    if (selectedApp) {
      generatePdfUrls(selectedApp);
    }
  }, [selectedApp?.id]);

  const generatePdfUrls = async (app: Application) => {
    try {
      const token = getAuthToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

      // Fetch CV PDF if available
      if (app.cv_pdf_path) {
        const cvResponse = await fetch(
          `${apiUrl}/api/v1/applications/${app.id}/pdf/cv`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (cvResponse.ok) {
          const blob = await cvResponse.blob();
          const cvUrl = URL.createObjectURL(blob);
          setPdfUrls((prev) => ({ ...prev, cv: cvUrl }));
        }
      }

      // Fetch Cover Letter PDF if available
      if (app.cover_letter_pdf_path) {
        const letterResponse = await fetch(
          `${apiUrl}/api/v1/applications/${app.id}/pdf/cover_letter`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (letterResponse.ok) {
          const blob = await letterResponse.blob();
          const letterUrl = URL.createObjectURL(blob);
          setPdfUrls((prev) => ({ ...prev, coverLetter: letterUrl }));
        }
      }
    } catch (error) {
      console.error("Error generating PDF URLs:", error);
    }
  };

  const fetchApplications = async (page: number) => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      
      let url = `${apiUrl}/api/v1/applications?page=${page}&limit=${itemsPerPage}`;
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch applications");
      const data = await response.json();
      setApplications(data);
      if (data.items.length === 0) {
        setSelectedApp(null);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitApplication = async (appId: number) => {
    // For review status, show email modal instead of direct submit
    if (selectedApp?.status === "review") {
      setShowSendEmailModal(true);
      return;
    }

    // For other statuses, proceed with old submit logic if needed
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/v1/applications/${appId}/submit`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to submit application");
      fetchApplications(currentPage);
      checkGmailStatus();
      setSelectedApp(null);
    } catch (error) {
      console.error("Error submitting application:", error);
      alert("Failed to submit application. Please try again.");
    }
  };

  const handleArchiveApplication = async (appId: number) => {
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/v1/applications/${appId}/archive`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) throw new Error("Failed to archive application");
      fetchApplications(currentPage);
      fetchAnalytics();
      setSelectedApp(null);
    } catch (error) {
      console.error("Error archiving application:", error);
      alert("Failed to archive application. Please try again.");
    }
  };

  const fetchAnalytics = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        router.push("/auth/login");
        return;
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/v1/applications/analytics/summary`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        alert("Your session has expired. Please sign in again.");
        router.push("/auth/login");
        return;
      }

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  const checkGmailStatus = async () => {
    try {
      const token = getAuthToken();
      if (!token) return;

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/v1/auth/gmail/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setGmailConnected(data.data.gmail_connected);
        }
      }
    } catch (error) {
      console.error("Error checking Gmail status:", error);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedApp) return;

    try {
      setUpdatingStatus(true);
      const token = getAuthToken();
      if (!token) {
        alert("Your session has expired. Please sign in again.");
        router.push("/auth/login");
        return;
      }
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      
      const response = await fetch(
        `${apiUrl}/api/v1/applications/${selectedApp.id}/status`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.status === 401) {
        alert("Your session has expired. Please sign in again.");
        router.push("/auth/login");
        return;
      }

      if (!response.ok) throw new Error("Failed to update status");
      
      // Refresh data
      await fetchApplications(currentPage);
      await fetchAnalytics();
      setShowStatusUpdate(false);
      
      // Update selected app
      const updatedApps = applications?.items || [];
      const updatedApp = updatedApps.find(app => app.id === selectedApp.id);
      if (updatedApp) {
        setSelectedApp(updatedApp);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdatingStatus(false);
    }
  };


  const handleDeleteApplication = async (appId: number) => {
    if (!confirm("Are you sure you want to delete this application? This action cannot be undone.")) {
      return;
    }

    try {
      setDeleting(true);
      const token = getAuthToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      
      const response = await fetch(`${apiUrl}/api/v1/applications/${appId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) throw new Error("Failed to delete application");
      
      fetchApplications(currentPage);
      setSelectedApp(null);
      alert("Application deleted successfully.");
    } catch (error) {
      console.error("Error deleting application:", error);
      alert("Failed to delete application. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-brand-dark via-[#1a1a3e] to-brand-dark-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-brand-text mb-2">
              Applications Launchpad
            </h1>
            <p className="text-brand-text-muted">
              Queue, review, and submit your tailored applications
            </p>
          </div>

          {/* Analytics Dashboard */}
          {analytics && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-brand-dark-card border border-brand-dark-border rounded-xl p-4">
                <div className="text-brand-text-muted text-sm mb-1">Total Applications</div>
                <div className="text-3xl font-bold text-brand-text">{analytics.total_applications}</div>
              </div>
              <div className="bg-brand-dark-card border border-brand-dark-border rounded-xl p-4">
                <div className="text-brand-text-muted text-sm mb-1">Sent Applications</div>
                <div className="text-3xl font-bold text-green-500">{analytics.sent_applications}</div>
              </div>
              <div className="bg-brand-dark-card border border-brand-dark-border rounded-xl p-4">
                <div className="text-brand-text-muted text-sm mb-1">Interview Rate</div>
                <div className="text-3xl font-bold text-emerald-500">
                  {analytics.success_metrics.interview_rate.toFixed(1)}%
                </div>
              </div>
              <div className="bg-brand-dark-card border border-brand-dark-border rounded-xl p-4">
                <div className="text-brand-text-muted text-sm mb-1">Offer Rate</div>
                <div className="text-3xl font-bold text-cyan-500">
                  {analytics.success_metrics.offer_rate.toFixed(1)}%
                </div>
              </div>
            </div>
          )}

          {/* Main Content - Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Applications List */}
            <div className="lg:col-span-2">
              <div className="bg-brand-dark-card border border-brand-dark-border rounded-2xl">
                {/* List Header with Filters */}
                <div className="px-6 py-4 border-b border-brand-dark-border">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-brand-text">
                      Your Applications ({applications?.total || 0})
                    </h2>
                  </div>
                  
                  {/* Status Filters */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setStatusFilter(null)}
                      className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                        statusFilter === null
                          ? "bg-brand-accent text-white"
                          : "bg-brand-dark-border text-brand-text-muted hover:bg-brand-dark-border/80"
                      }`}
                    >
                      All
                    </button>
                    {["review", "sent", "archived"].map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${
                          statusFilter === status
                            ? "bg-brand-accent text-white"
                            : "bg-brand-dark-border text-brand-text-muted hover:bg-brand-dark-border/80"
                        }`}
                      >
                        {status === "review" ? "Queued" : status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Applications List */}
                {loading ? (
                  <div className="p-6 text-center text-brand-text-muted">
                    Loading applications...
                  </div>
                ) : applications && applications.items.length > 0 ? (
                  <div className="divide-y divide-brand-dark-border">
                    {applications.items.map((app) => {
                      const config =
                        statusConfig[
                          app.status as keyof typeof statusConfig
                        ] || statusConfig.pending;
                      const StatusIcon = config.icon;

                      return (
                        <div
                          key={app.id}
                          onClick={() => setSelectedApp(app)}
                          className={`p-4 hover:bg-brand-dark/50 cursor-pointer transition-colors ${
                            selectedApp?.id === app.id
                              ? "bg-brand-accent/10 border-l-4 border-brand-accent"
                              : ""
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-brand-text">
                                {app.job_title}
                              </h3>
                              <p className="text-sm text-brand-text-muted">
                                {app.company_name} • {app.location}
                              </p>
                              <p className="text-xs text-brand-text-muted mt-1">
                                {new Date(app.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className={`px-3 py-1 rounded-lg border flex items-center gap-2 ${config.color}`}>
                              <StatusIcon className="w-4 h-4" />
                              <span className="text-xs font-medium">
                                {config.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <FileText className="w-16 h-16 text-brand-text-muted/30 mx-auto mb-4" />
                    <p className="text-brand-text-muted mb-4">
                      No applications yet
                    </p>
                    <button
                      onClick={() => router.push("/dashboard/job-extractor")}
                      className="px-6 py-2 bg-gradient-to-r from-brand-accent to-[#a78bfa] text-white rounded-lg hover:shadow-lg transition-all"
                    >
                      Extract First Job
                    </button>
                  </div>
                )}

                {/* Pagination */}
                {applications && applications.total_pages > 1 && (
                  <div className="px-6 py-4 border-t border-brand-dark-border flex items-center justify-between">
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.max(1, p - 1))
                      }
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-lg bg-brand-dark-border text-brand-text-muted disabled:opacity-50 hover:bg-brand-dark-border/80 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-brand-text-muted">
                      Page {currentPage} of {applications.total_pages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(applications.total_pages, p + 1)
                        )
                      }
                      disabled={currentPage === applications.total_pages}
                      className="px-4 py-2 rounded-lg bg-brand-dark-border text-brand-text-muted disabled:opacity-50 hover:bg-brand-dark-border/80 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Application Details */}
            <div className="lg:col-span-1">
              {selectedApp ? (
                <div className="bg-brand-dark-card border border-brand-dark-border rounded-2xl sticky top-24">
                  {/* Details Header */}
                  <div className="px-6 py-4 border-b border-brand-dark-border">
                    <h2 className="text-lg font-bold text-brand-text">
                      Application Details
                    </h2>
                    <p className="text-xs text-brand-text-muted mt-1">
                      {selectedApp.job_title} • {selectedApp.company_name}
                    </p>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-2 px-6 py-3 border-b border-brand-dark-border">
                    {[
                      { id: "cv", label: "CV", icon: FileText },
                      { id: "cover-letter", label: "Letter", icon: MessageSquare },
                      { id: "email", label: "Email", icon: Mail },
                    ].map((tab) => {
                      const TabIcon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() =>
                            setDetailsTab(
                              tab.id as "cv" | "cover-letter" | "email"
                            )
                          }
                          className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                            detailsTab === tab.id
                              ? "bg-brand-accent text-white"
                              : "bg-brand-dark-border text-brand-text-muted hover:bg-brand-dark-border/80"
                          }`}
                        >
                          <TabIcon className="w-3.5 h-3.5" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Content */}
                  <div className="px-6 py-4 h-96 overflow-y-auto">
                    {detailsTab === "cv" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-brand-text">CV</h3>
                          {selectedApp.cv_pdf_path && pdfUrls.cv && (
                            <a
                              href={pdfUrls.cv}
                              download={`cv_${selectedApp.id}.pdf`}
                              className="flex items-center gap-2 px-3 py-1 text-xs bg-brand-accent text-white rounded-lg hover:opacity-80 transition-opacity"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </a>
                          )}
                        </div>
                        {selectedApp.cv_pdf_path && pdfUrls.cv ? (
                          <embed
                            src={pdfUrls.cv}
                            type="application/pdf"
                            className="w-full h-80 border border-brand-dark-border rounded-lg"
                          />
                        ) : (
                          <div className="bg-brand-dark/50 p-4 rounded-lg text-xs text-brand-text-muted h-80 overflow-y-auto border border-brand-dark-border flex items-center justify-center">
                            <p>Loading CV...</p>
                          </div>
                        )}
                      </div>
                    )}

                    {detailsTab === "cover-letter" && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-brand-text">
                            Cover Letter
                          </h3>
                          {selectedApp.cover_letter_pdf_path && pdfUrls.coverLetter && (
                            <a
                              href={pdfUrls.coverLetter}
                              download={`cover_letter_${selectedApp.id}.pdf`}
                              className="flex items-center gap-2 px-3 py-1 text-xs bg-brand-accent text-white rounded-lg hover:opacity-80 transition-opacity"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </a>
                          )}
                        </div>
                        {selectedApp.cover_letter_pdf_path && pdfUrls.coverLetter ? (
                          <embed
                            src={pdfUrls.coverLetter}
                            type="application/pdf"
                            className="w-full h-80 border border-brand-dark-border rounded-lg"
                          />
                        ) : (
                          <div className="bg-brand-dark/50 p-4 rounded-lg text-xs text-brand-text-muted h-80 overflow-y-auto border border-brand-dark-border flex items-center justify-center">
                            <p>Loading cover letter...</p>
                          </div>
                        )}
                      </div>
                    )}

                    {detailsTab === "email" && (
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-semibold text-brand-text-muted mb-1">
                            TO:
                          </p>
                          <p className="text-sm text-brand-text break-all">
                            {selectedApp.application_email_to || "Not provided"}
                          </p>
                        </div>
                        {selectedApp.application_email_cc && (
                          <div>
                            <p className="text-xs font-semibold text-brand-text-muted mb-1">
                              CC:
                            </p>
                            <p className="text-sm text-brand-text break-all">
                              {selectedApp.application_email_cc}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-6 py-4 border-t border-brand-dark-border space-y-3">
                    {selectedApp.status === "pending" ||
                    selectedApp.status === "review" ? (
                      <>
                        <button
                          onClick={() =>
                            handleSubmitApplication(selectedApp.id)
                          }
                          className="w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2 font-medium"
                        >
                          <Send className="w-4 h-4" />
                          {selectedApp.status === "review"
                            ? "Send via Gmail"
                            : "Submit Application"}
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() =>
                              handleArchiveApplication(selectedApp.id)
                            }
                            className="px-4 py-2 bg-brand-dark-border text-brand-text-muted rounded-lg hover:bg-yellow-500/10 hover:text-yellow-400 transition-all"
                          >
                            Archive
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteApplication(selectedApp.id)
                            }
                            disabled={deleting}
                            className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                          >
                            {deleting ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3">
                        {/* Status Update for Sent Applications */}
                        {selectedApp.status === "sent" || 
                         selectedApp.status === "waiting_response" ||
                         selectedApp.status === "feedback_received" ||
                         selectedApp.status === "interview_scheduled" ||
                         selectedApp.status === "offer_negotiation" ||
                         selectedApp.status === "rejected" ? (
                          <>
                            <div className="p-3 bg-brand-accent/10 border border-brand-accent/30 rounded-lg">
                              <p className="text-xs text-brand-text-muted mb-2">Update Application Status:</p>
                              <div className="grid grid-cols-2 gap-2">
                                {selectedApp.status !== "waiting_response" && (
                                  <button
                                    onClick={() => handleUpdateStatus("waiting_response")}
                                    disabled={updatingStatus}
                                    className="px-3 py-2 text-xs bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-all disabled:opacity-50"
                                  >
                                    Waiting Response
                                  </button>
                                )}
                                {selectedApp.status !== "feedback_received" && (
                                  <button
                                    onClick={() => handleUpdateStatus("feedback_received")}
                                    disabled={updatingStatus}
                                    className="px-3 py-2 text-xs bg-cyan-500/20 text-cyan-300 rounded-lg hover:bg-cyan-500/30 transition-all disabled:opacity-50"
                                  >
                                    Feedback Received
                                  </button>
                                )}
                                {selectedApp.status !== "interview_scheduled" && (
                                  <button
                                    onClick={() => handleUpdateStatus("interview_scheduled")}
                                    disabled={updatingStatus}
                                    className="px-3 py-2 text-xs bg-emerald-500/20 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-all disabled:opacity-50"
                                  >
                                    Interview Scheduled
                                  </button>
                                )}
                                {selectedApp.status !== "offer_negotiation" && (
                                  <button
                                    onClick={() => handleUpdateStatus("offer_negotiation")}
                                    disabled={updatingStatus}
                                    className="px-3 py-2 text-xs bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-all disabled:opacity-50"
                                  >
                                    Offer Negotiation
                                  </button>
                                )}
                                {selectedApp.status !== "rejected" && (
                                  <button
                                    onClick={() => handleUpdateStatus("rejected")}
                                    disabled={updatingStatus}
                                    className="px-3 py-2 text-xs bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50"
                                  >
                                    Rejected
                                  </button>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="p-4 bg-brand-accent/10 border border-brand-accent/30 rounded-lg text-center">
                            <p className="text-xs text-brand-text-muted">
                              Application{" "}
                              <span className="text-brand-accent font-semibold">
                                {selectedApp.status.toUpperCase().replace(/_/g, " ")}
                              </span>
                            </p>
                          </div>
                        )}
                        
                        {/* Archive and Delete buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleArchiveApplication(selectedApp.id)}
                            className="px-4 py-2 bg-brand-dark-border text-brand-text-muted rounded-lg hover:bg-yellow-500/10 hover:text-yellow-400 transition-all text-sm"
                          >
                            Archive
                          </button>
                          <button
                            onClick={() => handleDeleteApplication(selectedApp.id)}
                            disabled={deleting}
                            className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            {deleting ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-brand-dark-card border border-brand-dark-border rounded-2xl p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-brand-text-muted/30 mx-auto mb-3" />
                  <p className="text-brand-text-muted">
                    Select an application to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Send Email Modal */}
      {selectedApp && (
        <SendEmailModal
          isOpen={showSendEmailModal}
          applicationId={selectedApp.id}
          jobTitle={selectedApp.job_title}
          companyName={selectedApp.company_name}
          onClose={() => setShowSendEmailModal(false)}
          onSent={() => {
            fetchApplications(currentPage);
            checkGmailStatus();
            setSelectedApp(null);
          }}
          gmailConnected={gmailConnected}
        />
      )}
    </DashboardLayout>
  );
}
