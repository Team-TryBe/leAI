"use client";

import React, { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getAuthToken } from "@/lib/auth";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
} from "lucide-react";

interface AdminApplication {
  id: number;
  user_id: number;
  user_email: string;
  user_full_name: string;
  job_title: string;
  company_name: string;
  location: string;
  status: string;
  created_at: string;
  submitted_at: string | null;
  cv_pdf_path: string | null;
  cover_letter_pdf_path: string | null;
}

interface PaginationData {
  items: AdminApplication[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

const statusConfig = {
  review: { color: "bg-blue-500/10 text-blue-500", label: "Review" },
  sent: { color: "bg-green-500/10 text-green-500", label: "Sent" },
  waiting_response: { color: "bg-purple-500/10 text-purple-500", label: "Waiting Response" },
  feedback_received: { color: "bg-cyan-500/10 text-cyan-500", label: "Feedback Received" },
  interview_scheduled: { color: "bg-emerald-500/10 text-emerald-500", label: "Interview Scheduled" },
  offer_negotiation: { color: "bg-green-600/10 text-green-600", label: "Offer Negotiation" },
  rejected: { color: "bg-red-500/10 text-red-500", label: "Rejected" },
  archived: { color: "bg-gray-500/10 text-gray-500", label: "Archived" },
};

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<AdminApplication | null>(null);

  const itemsPerPage = 15;

  useEffect(() => {
    setCurrentPage(1);
    fetchApplications(1);
  }, [statusFilter]);

  useEffect(() => {
    fetchApplications(currentPage);
  }, [currentPage]);

  const fetchApplications = async (page: number) => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "http://localhost:8000";

      let url = `${apiUrl}/api/v1/admin/applications?page=${page}&limit=${itemsPerPage}`;
      if (statusFilter) {
        url += `&status=${statusFilter}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch applications");
      const result = await response.json();
      // Backend returns: { success, data: { applications, total, skip, limit } }
      const { applications: items, total, skip, limit } = result.data || {};
      setApplications({
        items: items || [],
        total: total || 0,
        page: Math.floor((skip || 0) / limit) + 1,
        limit: limit || itemsPerPage,
        total_pages: Math.ceil((total || 0) / (limit || itemsPerPage)),
      });
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async (appId: number, type: "cv" | "cover_letter") => {
    try {
      const token = getAuthToken();
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "http://localhost:8000";

      const response = await fetch(
        `${apiUrl}/api/v1/applications/${appId}/pdf/${type}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to download PDF");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_${appId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Failed to download PDF");
    }
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-brand-dark via-[#1a1a3e] to-brand-dark-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-brand-text mb-2">
              Applications Management
            </h1>
            <p className="text-brand-text-muted">
              Monitor and manage all user applications
            </p>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-brand-dark-card border border-brand-dark-border rounded-xl p-4">
              <div className="text-brand-text-muted text-sm mb-1">Total Applications</div>
              <div className="text-3xl font-bold text-brand-text">{applications?.total || 0}</div>
            </div>
            <div className="bg-brand-dark-card border border-brand-dark-border rounded-xl p-4">
              <div className="text-brand-text-muted text-sm mb-1">Queued</div>
              <div className="text-3xl font-bold text-blue-500">
                {applications?.items?.filter((a) => a.status === "review").length || 0}
              </div>
            </div>
            <div className="bg-brand-dark-card border border-brand-dark-border rounded-xl p-4">
              <div className="text-brand-text-muted text-sm mb-1">Sent</div>
              <div className="text-3xl font-bold text-green-500">
                {applications?.items?.filter((a) => a.status === "sent").length || 0}
              </div>
            </div>
            <div className="bg-brand-dark-card border border-brand-dark-border rounded-xl p-4">
              <div className="text-brand-text-muted text-sm mb-1">Interview Scheduled</div>
              <div className="text-3xl font-bold text-emerald-500">
                {applications?.items?.filter((a) => a.status === "interview_scheduled").length || 0}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 bg-brand-dark-card border border-brand-dark-border rounded-xl p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Filter className="w-5 h-5 text-brand-text-muted" />
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
              {["review", "sent", "waiting_response", "interview_scheduled", "offer_negotiation", "rejected"].map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${
                      statusFilter === status
                        ? "bg-brand-accent text-white"
                        : "bg-brand-dark-border text-brand-text-muted hover:bg-brand-dark-border/80"
                    }`}
                  >
                    {statusConfig[status as keyof typeof statusConfig]?.label || status}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-brand-dark-card border border-brand-dark-border rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-brand-text-muted">Loading applications...</div>
            ) : applications && applications.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-brand-dark border-b border-brand-dark-border">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted">User</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted">Job Title</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted">Company</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted">Queued</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-brand-text-muted">Sent</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-brand-text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-dark-border">
                    {applications.items.map((app) => {
                      const config = statusConfig[app.status as keyof typeof statusConfig] || statusConfig.review;
                      return (
                        <tr
                          key={app.id}
                          className="hover:bg-brand-dark/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedApp(selectedApp?.id === app.id ? null : app)}
                        >
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium text-brand-text">{app.user_full_name}</p>
                              <p className="text-xs text-brand-text-muted">{app.user_email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-brand-text">{app.job_title}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-brand-text-muted">{app.company_name}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
                              {config.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-brand-text-muted">
                            {new Date(app.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-xs text-brand-text-muted">
                            {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString() : "Pending"}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              {app.cv_pdf_path && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadPDF(app.id, "cv");
                                  }}
                                  className="p-2 hover:bg-brand-dark-border rounded-lg transition-colors"
                                  title="Download CV"
                                >
                                  <Download className="w-4 h-4 text-blue-400" />
                                </button>
                              )}
                              {app.cover_letter_pdf_path && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadPDF(app.id, "cover_letter");
                                  }}
                                  className="p-2 hover:bg-brand-dark-border rounded-lg transition-colors"
                                  title="Download Cover Letter"
                                >
                                  <Download className="w-4 h-4 text-green-400" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-brand-text-muted">
                No applications found
              </div>
            )}

            {/* Pagination */}
            {applications && applications.total_pages > 1 && (
              <div className="px-6 py-4 border-t border-brand-dark-border flex items-center justify-between">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                    setCurrentPage((p) => Math.min(applications.total_pages, p + 1))
                  }
                  disabled={currentPage === applications.total_pages}
                  className="px-4 py-2 rounded-lg bg-brand-dark-border text-brand-text-muted disabled:opacity-50 hover:bg-brand-dark-border/80 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Details Panel */}
          {selectedApp && (
            <div className="mt-8 bg-brand-dark-card border border-brand-dark-border rounded-2xl p-6">
              <h2 className="text-xl font-bold text-brand-text mb-4">
                Application Details
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs font-semibold text-brand-text-muted mb-1">User Name</p>
                  <p className="text-sm text-brand-text">{selectedApp.user_full_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-text-muted mb-1">Email</p>
                  <p className="text-sm text-brand-text break-all">{selectedApp.user_email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-text-muted mb-1">Job Title</p>
                  <p className="text-sm text-brand-text">{selectedApp.job_title}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-text-muted mb-1">Company</p>
                  <p className="text-sm text-brand-text">{selectedApp.company_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-text-muted mb-1">Location</p>
                  <p className="text-sm text-brand-text">{selectedApp.location}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-text-muted mb-1">Status</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[selectedApp.status as keyof typeof statusConfig]?.color || statusConfig.review}`}>
                    {statusConfig[selectedApp.status as keyof typeof statusConfig]?.label || selectedApp.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-text-muted mb-1">Queued Date</p>
                  <p className="text-sm text-brand-text">
                    {new Date(selectedApp.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-brand-text-muted mb-1">Sent Date</p>
                  <p className="text-sm text-brand-text">
                    {selectedApp.submitted_at
                      ? new Date(selectedApp.submitted_at).toLocaleString()
                      : "Not sent yet"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
