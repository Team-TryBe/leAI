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
  RefreshCw,
  Filter,
  Search,
  Calendar,
  Building,
  MapPin,
  TrendingUp,
  Trash2,
  Archive,
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
  const [refreshing, setRefreshing] = useState(false);
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
  const [searchQuery, setSearchQuery] = useState("");
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchApplications(currentPage),
      fetchAnalytics(),
      checkGmailStatus()
    ]);
    setRefreshing(false);
  };

  // Filter applications by search query
  const filteredApplications = applications?.items.filter(app => 
    app.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.location.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-brand-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* Modern Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-brand-text mb-1">Applications Hub</h1>
              <p className="text-sm text-brand-text-muted">
                Track, manage, and submit your tailored job applications
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-dark-border text-brand-text rounded-lg hover:bg-brand-dark-border/80 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              <span className="text-sm font-medium">Refresh</span>
            </button>
          </div>

          {/* Analytics Dashboard */}
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Applications */}
              <div className="card-dark p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <FileText className="text-blue-400" size={20} />
                  </div>
                  <TrendingUp className="text-blue-400" size={16} />
                </div>
                <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">Total Applications</p>
                <p className="text-2xl font-bold text-brand-text">{analytics.total_applications}</p>
                <p className="text-xs text-blue-400 mt-2">In your queue</p>
              </div>

              {/* Sent Applications */}
              <div className="card-dark p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <Send className="text-green-400" size={20} />
                  </div>
                  <CheckCircle className="text-green-400" size={16} />
                </div>
                <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">Sent</p>
                <p className="text-2xl font-bold text-brand-text">{analytics.sent_applications}</p>
                <p className="text-xs text-green-400 mt-2">Successfully submitted</p>
              </div>

              {/* Interview Rate */}
              <div className="card-dark p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10">
                    <Calendar className="text-cyan-400" size={20} />
                  </div>
                  <TrendingUp className="text-cyan-400" size={16} />
                </div>
                <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">Interview Rate</p>
                <p className="text-2xl font-bold text-brand-text">
                  {analytics.success_metrics.interview_rate.toFixed(1)}%
                </p>
                <p className="text-xs text-cyan-400 mt-2">Of submitted</p>
              </div>

              {/* Offer Rate */}
              <div className="card-dark p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <CheckCircle className="text-purple-400" size={20} />
                  </div>
                  <TrendingUp className="text-purple-400" size={16} />
                </div>
                <p className="text-xs text-brand-text-muted uppercase tracking-wider mb-1">Offer Rate</p>
                <p className="text-2xl font-bold text-brand-text">
                  {analytics.success_metrics.offer_rate.toFixed(1)}%
                </p>
                <p className="text-xs text-purple-400 mt-2">Interview conversion</p>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Applications List */}
            <div className="lg:col-span-2 space-y-4">
              {/* Search and Filter Bar */}
              <div className="card-dark p-4 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={16} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by job title, company, or location..."
                    className="w-full pl-10 pr-4 py-2.5 bg-brand-dark-border border border-brand-dark-border rounded-lg text-sm text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>

                {/* Status Filters */}
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-brand-text-muted" />
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setStatusFilter(null)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        statusFilter === null
                          ? 'bg-gradient-to-r from-brand-primary to-brand-accent text-white'
                          : 'bg-brand-dark-border text-brand-text-muted hover:bg-brand-dark-border/80'
                      }`}
                    >
                      All ({applications?.total || 0})
                    </button>
                    {[
                      { key: 'review', label: 'Queued', color: 'blue' },
                      { key: 'sent', label: 'Sent', color: 'green' },
                      { key: 'interview_scheduled', label: 'Interview', color: 'cyan' },
                      { key: 'archived', label: 'Archived', color: 'gray' }
                    ].map((status) => (
                      <button
                        key={status.key}
                        onClick={() => setStatusFilter(status.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          statusFilter === status.key
                            ? 'bg-gradient-to-r from-brand-primary to-brand-accent text-white'
                            : 'bg-brand-dark-border text-brand-text-muted hover:bg-brand-dark-border/80'
                        }`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Applications List */}
              {loading ? (
                <div className="card-dark p-12 text-center">
                  <div className="inline-flex items-center gap-3 text-brand-text-muted">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-brand-primary"></div>
                    <span>Loading applications...</span>
                  </div>
                </div>
              ) : filteredApplications.length > 0 ? (
                <div className="space-y-3">
                  {filteredApplications.map((app) => {
                    const config = statusConfig[app.status as keyof typeof statusConfig] || statusConfig.pending;
                    const StatusIcon = config.icon;
                    const isSelected = selectedApp?.id === app.id;

                    return (
                      <div
                        key={app.id}
                        onClick={() => setSelectedApp(app)}
                        className={`card-dark p-4 cursor-pointer transition-all hover:border-brand-primary/50 ${
                          isSelected ? 'ring-2 ring-brand-primary border-brand-primary' : ''
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Icon */}
                          <div className={`p-2.5 rounded-lg ${config.color.split(' ')[0]}`}>
                            <StatusIcon size={18} className={config.color.split(' ')[1]} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-brand-text truncate mb-1">{app.job_title}</h3>
                                <div className="flex items-center gap-3 text-xs text-brand-text-muted">
                                  <span className="flex items-center gap-1">
                                    <Building size={12} />
                                    {app.company_name}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <MapPin size={12} />
                                    {app.location}
                                  </span>
                                </div>
                              </div>
                              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium whitespace-nowrap ${config.color}`}>
                                <StatusIcon size={12} />
                                <span>{config.label}</span>
                              </div>
                            </div>

                            {/* Meta Info */}
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-brand-text-muted flex items-center gap-1">
                                <Clock size={12} />
                                {new Date(app.created_at).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                              {(app.status === 'review' || app.status === 'pending') && (
                                <span className="flex items-center gap-1 text-brand-primary font-medium">
                                  <Send size={12} />
                                  Ready to submit
                                </span>
                              )}
                              {app.submitted_at && (
                                <span className="text-green-400 flex items-center gap-1">
                                  <CheckCircle size={12} />
                                  Sent {new Date(app.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="card-dark p-12 text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-lg bg-brand-primary/10">
                      <FileText size={32} className="text-brand-primary/40" />
                    </div>
                  </div>
                  <div>
                    <p className="text-brand-text mb-2">
                      {searchQuery ? 'No applications match your search' : 'No applications in your queue yet'}
                    </p>
                    <p className="text-sm text-brand-text-muted mb-4">
                      {searchQuery ? 'Try adjusting your search terms' : 'Start by extracting jobs and generating applications'}
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={() => router.push('/dashboard/job-extractor')}
                        className="px-4 py-2.5 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-brand-primary/30 transition-all"
                      >
                        Extract Your First Job
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Pagination */}
              {applications && applications.total_pages > 1 && (
                <div className="card-dark p-4 flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-dark-border text-brand-text disabled:opacity-50 hover:bg-brand-dark-border/80 transition-colors"
                  >
                    <ChevronLeft size={16} />
                    <span className="text-sm">Previous</span>
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-brand-text-muted">
                      Page <span className="text-brand-text font-semibold">{currentPage}</span> of{" "}
                      <span className="text-brand-text font-semibold">{applications.total_pages}</span>
                    </span>
                    <span className="text-xs text-brand-text-muted">
                      ({applications.total} total)
                    </span>
                  </div>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(applications.total_pages, p + 1))}
                    disabled={currentPage === applications.total_pages}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-dark-border text-brand-text disabled:opacity-50 hover:bg-brand-dark-border/80 transition-colors"
                  >
                    <span className="text-sm">Next</span>
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Application Details */}
            <div className="lg:col-span-1">
              {selectedApp ? (
                <div className="card-dark overflow-hidden sticky top-24">
                  {/* Details Header */}
                  <div className="bg-gradient-to-r from-brand-primary/10 to-brand-accent/10 border-b border-brand-primary/20 p-4">
                    <h2 className="font-semibold text-brand-text mb-1">{selectedApp.job_title}</h2>
                    <div className="flex items-center gap-2 text-xs text-brand-text-muted">
                      <Building size={12} />
                      <span>{selectedApp.company_name}</span>
                      <span>•</span>
                      <MapPin size={12} />
                      <span>{selectedApp.location}</span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="p-4 border-b border-brand-dark-border">
                    {(() => {
                      const config = statusConfig[selectedApp.status as keyof typeof statusConfig] || statusConfig.pending;
                      const StatusIcon = config.icon;
                      return (
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${config.color}`}>
                          <StatusIcon size={14} />
                          <span className="text-xs font-medium">{config.label}</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-1 px-4 py-3 border-b border-brand-dark-border bg-brand-dark/30">
                    {[
                      { id: 'cv', label: 'CV', icon: FileText },
                      { id: 'cover-letter', label: 'Letter', icon: MessageSquare },
                      { id: 'email', label: 'Email', icon: Mail },
                    ].map((tab) => {
                      const TabIcon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setDetailsTab(tab.id as 'cv' | 'cover-letter' | 'email')}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            detailsTab === tab.id
                              ? 'bg-gradient-to-r from-brand-primary to-brand-accent text-white'
                              : 'text-brand-text-muted hover:bg-brand-dark-border'
                          }`}
                        >
                          <TabIcon size={14} />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Content */}
                  <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                    {detailsTab === 'cv' && (
                      <div className="space-y-3">
                        {selectedApp.cv_pdf_path && pdfUrls.cv ? (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-xs font-semibold text-brand-text">CV Document</h3>
                              <a
                                href={pdfUrls.cv}
                                download={`cv_${selectedApp.id}.pdf`}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand-primary text-white rounded-lg hover:opacity-90 transition-opacity"
                              >
                                <Download size={12} />
                                Download
                              </a>
                            </div>
                            <embed 
                              src={pdfUrls.cv} 
                              type="application/pdf" 
                              className="w-full h-64 rounded-lg border border-brand-dark-border" 
                            />
                          </>
                        ) : (
                          <div className="h-64 bg-brand-dark-border/50 rounded-lg flex flex-col items-center justify-center text-brand-text-muted">
                            <FileText size={32} className="mb-2 opacity-50" />
                            <p className="text-xs">Loading CV...</p>
                          </div>
                        )}
                      </div>
                    )}

                    {detailsTab === 'cover-letter' && (
                      <div className="space-y-3">
                        {selectedApp.cover_letter_pdf_path && pdfUrls.coverLetter ? (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-xs font-semibold text-brand-text">Cover Letter</h3>
                              <a
                                href={pdfUrls.coverLetter}
                                download={`cover_letter_${selectedApp.id}.pdf`}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand-primary text-white rounded-lg hover:opacity-90 transition-opacity"
                              >
                                <Download size={12} />
                                Download
                              </a>
                            </div>
                            <embed 
                              src={pdfUrls.coverLetter} 
                              type="application/pdf" 
                              className="w-full h-64 rounded-lg border border-brand-dark-border" 
                            />
                          </>
                        ) : (
                          <div className="h-64 bg-brand-dark-border/50 rounded-lg flex flex-col items-center justify-center text-brand-text-muted">
                            <MessageSquare size={32} className="mb-2 opacity-50" />
                            <p className="text-xs">Loading cover letter...</p>
                          </div>
                        )}
                      </div>
                    )}

                    {detailsTab === 'email' && (
                      <div className="space-y-3">
                        <div className="bg-brand-dark-border/50 p-3 rounded-lg space-y-3">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Mail size={12} className="text-brand-text-muted" />
                              <p className="text-xs text-brand-text-muted font-medium">TO:</p>
                            </div>
                            <p className="text-xs text-brand-text break-all font-mono bg-brand-dark p-2 rounded">
                              {selectedApp.application_email_to || 'Not specified'}
                            </p>
                          </div>
                          {selectedApp.application_email_cc && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Mail size={12} className="text-brand-text-muted" />
                                <p className="text-xs text-brand-text-muted font-medium">CC:</p>
                              </div>
                              <p className="text-xs text-brand-text break-all font-mono bg-brand-dark p-2 rounded">
                                {selectedApp.application_email_cc}
                              </p>
                            </div>
                          )}
                          {selectedApp.submitted_at && (
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar size={12} className="text-brand-text-muted" />
                                <p className="text-xs text-brand-text-muted font-medium">Sent On:</p>
                              </div>
                              <p className="text-xs text-brand-text font-mono bg-brand-dark p-2 rounded">
                                {new Date(selectedApp.submitted_at).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="border-t border-brand-dark-border p-4 space-y-3 bg-brand-dark/30">
                    {selectedApp.status === 'pending' || selectedApp.status === 'review' ? (
                      <>
                        <button
                          onClick={() => handleSubmitApplication(selectedApp.id)}
                          className="w-full px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/30 transition-all flex items-center justify-center gap-2 font-semibold"
                        >
                          <Send size={16} />
                          {selectedApp.status === 'review' ? 'Send via Gmail' : 'Submit Application'}
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleArchiveApplication(selectedApp.id)}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-brand-dark-border text-brand-text-muted rounded-lg hover:bg-yellow-500/10 hover:text-yellow-400 transition-all text-sm font-medium"
                          >
                            <Archive size={14} />
                            Archive
                          </button>
                          <button
                            onClick={() => handleDeleteApplication(selectedApp.id)}
                            disabled={deleting}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all disabled:opacity-50 text-sm font-medium"
                          >
                            <Trash2 size={14} />
                            {deleting ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </>
                    ) : selectedApp.status === 'sent' || 
                       selectedApp.status === 'waiting_response' ||
                       selectedApp.status === 'feedback_received' ||
                       selectedApp.status === 'interview_scheduled' ||
                       selectedApp.status === 'offer_negotiation' ||
                       selectedApp.status === 'rejected' ? (
                      <>
                        <div className="bg-brand-primary/10 border border-brand-primary/30 rounded-lg p-3 space-y-3">
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-brand-primary" />
                            <p className="text-xs font-semibold text-brand-text">Update Status</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {selectedApp.status !== 'waiting_response' && (
                              <button
                                onClick={() => handleUpdateStatus('waiting_response')}
                                disabled={updatingStatus}
                                className="px-2.5 py-2 text-xs bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-all disabled:opacity-50 font-medium"
                              >
                                Waiting
                              </button>
                            )}
                            {selectedApp.status !== 'interview_scheduled' && (
                              <button
                                onClick={() => handleUpdateStatus('interview_scheduled')}
                                disabled={updatingStatus}
                                className="px-2.5 py-2 text-xs bg-emerald-500/20 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-all disabled:opacity-50 font-medium"
                              >
                                Interview
                              </button>
                            )}
                            {selectedApp.status !== 'offer_negotiation' && (
                              <button
                                onClick={() => handleUpdateStatus('offer_negotiation')}
                                disabled={updatingStatus}
                                className="px-2.5 py-2 text-xs bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-all disabled:opacity-50 font-medium"
                              >
                                Offer
                              </button>
                            )}
                            {selectedApp.status !== 'rejected' && (
                              <button
                                onClick={() => handleUpdateStatus('rejected')}
                                disabled={updatingStatus}
                                className="px-2.5 py-2 text-xs bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all disabled:opacity-50 font-medium"
                              >
                                Rejected
                              </button>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteApplication(selectedApp.id)}
                          disabled={deleting}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-all disabled:opacity-50 text-sm font-medium"
                        >
                          <Trash2 size={14} />
                          {deleting ? 'Deleting...' : 'Delete Application'}
                        </button>
                      </>
                    ) : (
                      <div className="bg-brand-accent/10 border border-brand-accent/30 rounded-lg p-3 text-center">
                        <p className="text-xs text-brand-text-muted">
                          Status: <span className="text-brand-accent font-semibold">{selectedApp.status.toUpperCase().replace(/_/g, ' ')}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="card-dark p-8 text-center space-y-4 sticky top-24">
                  <div className="flex justify-center">
                    <div className="p-4 rounded-lg bg-brand-primary/10">
                      <Eye size={32} className="text-brand-primary/40" />
                    </div>
                  </div>
                  <div>
                    <p className="text-brand-text mb-2">Select an Application</p>
                    <p className="text-sm text-brand-text-muted">
                      Choose an application from the list to view details
                    </p>
                  </div>
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
