"use client";

import React, { useState, useEffect } from "react";
import { getAuthToken } from "@/lib/auth";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Clock,
  MapPin,
  Building2,
  Mail,
  Briefcase,
  X,
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

type FilterStatus = 'all' | 'review' | 'sent' | 'waiting_response' | 'interview_scheduled' | 'offer_negotiation' | 'rejected' | 'archived';

const statusConfig = {
  review: { color: 'bg-blue-500/20 text-blue-400', label: 'Queued', icon: '📋' },
  sent: { color: 'bg-green-500/20 text-green-400', label: 'Sent', icon: '✉️' },
  waiting_response: { color: 'bg-purple-500/20 text-purple-400', label: 'Waiting', icon: '⏳' },
  feedback_received: { color: 'bg-cyan-500/20 text-cyan-400', label: 'Feedback', icon: '💬' },
  interview_scheduled: { color: 'bg-emerald-500/20 text-emerald-400', label: 'Interview', icon: '📅' },
  offer_negotiation: { color: 'bg-orange-500/20 text-orange-400', label: 'Offer', icon: '🎯' },
  rejected: { color: 'bg-red-500/20 text-red-400', label: 'Rejected', icon: '❌' },
  archived: { color: 'bg-gray-500/20 text-gray-400', label: 'Archived', icon: '📦' },
};

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedApp, setSelectedApp] = useState<AdminApplication | null>(null);

  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchQuery]);

  useEffect(() => {
    fetchApplications(currentPage);
  }, [currentPage, filterStatus, searchQuery]);

  const fetchApplications = async (page: number) => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "http://localhost:8000";

      let url = `${apiUrl}/api/v1/admin/applications?skip=${(page - 1) * itemsPerPage}&limit=${itemsPerPage}`;
      if (filterStatus !== 'all') {
        url += `&status=${filterStatus}`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch applications");
      const result = await response.json();
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

  const getCountByStatus = (status: FilterStatus) => {
    if (status === 'all') return applications?.total || 0;
    return applications?.items?.filter((a) => a.status === status).length || 0;
  };

  const totalPages = applications?.total_pages || 1;

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-display font-bold text-brand-text mb-1">Applications</h1>
        <p className="text-sm text-brand-text-muted">Monitor and manage job applications</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" size={18} />
          <input
            type="text"
            placeholder="Search by user, job title, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-brand-dark-border text-sm text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b border-brand-dark-border overflow-x-auto pb-1">
        {(['all', 'review', 'sent', 'waiting_response', 'interview_scheduled', 'offer_negotiation', 'rejected'] as FilterStatus[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setFilterStatus(tab);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 text-sm font-medium transition border-b-2 whitespace-nowrap ${
              filterStatus === tab
                ? 'border-brand-primary text-brand-primary'
                : 'border-transparent text-brand-text-muted hover:text-brand-text'
            }`}
          >
            {tab === 'all' ? `All (${applications?.total || 0})` : `${statusConfig[tab as keyof typeof statusConfig]?.label || tab} (${getCountByStatus(tab)})`}
          </button>
        ))}
      </div>

      {/* Applications Table */}
      <div className="card-dark overflow-hidden mb-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-brand-dark-border border-t-brand-primary rounded-full animate-spin" />
              <p className="text-sm text-brand-text-muted">Loading applications...</p>
            </div>
          </div>
        ) : applications?.items && applications.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-brand-dark-border/30 border-b border-brand-dark-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-brand-text-muted uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-brand-text-muted uppercase tracking-wider">Job Title</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-brand-text-muted uppercase tracking-wider">Company</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-brand-text-muted uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-brand-text-muted uppercase tracking-wider">Applied</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-dark-border">
                {applications.items.map((app) => {
                  const config = statusConfig[app.status as keyof typeof statusConfig] || statusConfig.review;
                  return (
                    <tr
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className="hover:bg-brand-dark-border/20 cursor-pointer transition"
                    >
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-brand-text truncate max-w-[200px]">{app.user_full_name}</div>
                        <div className="text-xs text-brand-text-muted truncate max-w-[200px]">{app.user_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-brand-text truncate max-w-[250px]">{app.job_title}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-brand-text truncate max-w-[200px]">{app.company_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.color}`}>
                          {config.icon} {config.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-brand-text">{new Date(app.created_at).toLocaleDateString()}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-sm text-brand-text-muted">No applications found</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6 border-t border-brand-dark-border">
          <div className="text-xs text-brand-text-muted">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, applications?.total || 0)} of {applications?.total || 0} applications
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-brand-dark-border hover:bg-brand-primary disabled:opacity-50 disabled:cursor-not-allowed text-brand-text transition"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs text-brand-text px-3">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-2 rounded-lg bg-brand-dark-border hover:bg-brand-primary disabled:opacity-50 disabled:cursor-not-allowed text-brand-text transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Application Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedApp(null)}>
          <div
            className="bg-brand-dark-card border border-brand-dark-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-brand-text">{selectedApp.user_full_name}</h2>
                <p className="text-xs text-brand-text-muted">{selectedApp.user_email}</p>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-1.5 rounded-lg hover:bg-brand-dark-border text-brand-text-muted hover:text-brand-text transition"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-brand-dark-border">
                <p className="text-xs text-brand-text-muted mb-2">Job Title</p>
                <p className="text-sm font-medium text-brand-text">{selectedApp.job_title}</p>
              </div>

              <div className="p-4 rounded-lg bg-brand-dark-border">
                <p className="text-xs text-brand-text-muted mb-2">Company</p>
                <p className="text-sm font-medium text-brand-text">{selectedApp.company_name}</p>
              </div>

              <div className="p-4 rounded-lg bg-brand-dark-border">
                <p className="text-xs text-brand-text-muted mb-2">Location</p>
                <p className="text-sm font-medium text-brand-text">{selectedApp.location}</p>
              </div>

              <div className="p-4 rounded-lg bg-brand-dark-border">
                <p className="text-xs text-brand-text-muted mb-2">Status</p>
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig[selectedApp.status as keyof typeof statusConfig]?.color || statusConfig.review}`}>
                  {statusConfig[selectedApp.status as keyof typeof statusConfig]?.label || selectedApp.status}
                </span>
              </div>

              <div className="p-4 rounded-lg bg-brand-dark-border">
                <p className="text-xs text-brand-text-muted mb-2">Applied Date</p>
                <p className="text-sm font-medium text-brand-text">{new Date(selectedApp.created_at).toLocaleString()}</p>
              </div>

              <div className="p-4 rounded-lg bg-brand-dark-border">
                <p className="text-xs text-brand-text-muted mb-2">Sent Date</p>
                <p className="text-sm font-medium text-brand-text">{selectedApp.submitted_at ? new Date(selectedApp.submitted_at).toLocaleString() : 'Not sent yet'}</p>
              </div>
            </div>

            {/* Download Actions */}
            <div className="mt-6 flex gap-3">
              {selectedApp.cv_pdf_path && (
                <button
                  onClick={() => downloadPDF(selectedApp.id, "cv")}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm font-medium flex items-center justify-center gap-2 transition"
                >
                  <Download size={16} />
                  Download CV
                </button>
              )}
              {selectedApp.cover_letter_pdf_path && (
                <button
                  onClick={() => downloadPDF(selectedApp.id, "cover_letter")}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm font-medium flex items-center justify-center gap-2 transition"
                >
                  <Download size={16} />
                  Download Cover Letter
                </button>
              )}
            </div>

            <button
              onClick={() => setSelectedApp(null)}
              className="w-full mt-4 px-4 py-2 rounded-lg bg-brand-dark-border hover:bg-brand-dark-border/80 text-brand-text text-sm font-medium transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
