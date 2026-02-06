/**
 * SendEmailModal Component
 *
 * Modal for sending job applications via Gmail.
 * Allows users to:
 * - Confirm recipient emails (to and cc)
 * - Edit email addresses if needed
 * - Add a custom message
 * - Send the application
 *
 * Documentation:
 * ✅ Step 4: Email Form with Custom Recipients
 * - Show pre-filled email recipients from job posting
 * - Allow manual entry/editing of emails
 * - Support CC emails
 * - Optional custom message field
 */

"use client";

import React, { useState, useEffect } from "react";
import { X, Send, AlertCircle, Mail } from "lucide-react";
import { getAuthToken } from "@/lib/auth";

interface SendEmailModalProps {
  isOpen: boolean;
  applicationId: number;
  jobTitle: string;
  companyName: string;
  onClose: () => void;
  onSent: () => void;
  gmailConnected: boolean;
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  isOpen,
  applicationId,
  jobTitle,
  companyName,
  onClose,
  onSent,
  gmailConnected,
}) => {
  const [toEmails, setToEmails] = useState<string[]>([]);
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState("");
  const [toEmailInput, setToEmailInput] = useState("");
  const [ccEmailInput, setCcEmailInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailConfig, setEmailConfig] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchEmailConfig();
    }
  }, [isOpen]);

  const fetchEmailConfig = async () => {
    try {
      const token = getAuthToken();
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "http://localhost:8000";

      const response = await fetch(
        `${apiUrl}/api/v1/applications/${applicationId}/email-config`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch email config");

      const data = await response.json();
      if (data.success && data.data) {
        setToEmails(data.data.to_emails || []);
        setCcEmails(data.data.cc_emails || []);
        setEmailConfig(data.data);
      }
    } catch (err) {
      console.error("Error fetching email config:", err);
      setError("Failed to load email configuration");
    }
  };

  const addToEmail = () => {
    if (toEmailInput.trim() && !toEmails.includes(toEmailInput.trim())) {
      setToEmails([...toEmails, toEmailInput.trim()]);
      setToEmailInput("");
    }
  };

  const addCcEmail = () => {
    if (ccEmailInput.trim() && !ccEmails.includes(ccEmailInput.trim())) {
      setCcEmails([...ccEmails, ccEmailInput.trim()]);
      setCcEmailInput("");
    }
  };

  const removeToEmail = (email: string) => {
    setToEmails(toEmails.filter((e) => e !== email));
  };

  const removeCcEmail = (email: string) => {
    setCcEmails(ccEmails.filter((e) => e !== email));
  };

  const handleSendEmail = async () => {
    if (toEmails.length === 0) {
      setError("Please add at least one recipient email");
      return;
    }

    if (!gmailConnected) {
      setError("Gmail account not connected. Please connect Gmail in settings.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const token = getAuthToken();
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "http://localhost:8000";

      const response = await fetch(
        `${apiUrl}/api/v1/applications/${applicationId}/send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            app_id: applicationId,
            to_emails: toEmails,
            cc_emails: ccEmails.length > 0 ? ccEmails : undefined,
            custom_message: customMessage || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to send application");
      }

      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send application");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-brand-dark-card border border-brand-dark-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-brand-dark-card px-6 py-4 border-b border-brand-dark-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-brand-accent" />
            <div>
              <h2 className="text-lg font-bold text-brand-text">
                Send Application via Gmail
              </h2>
              <p className="text-xs text-brand-text-muted">
                {jobTitle} at {companyName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-brand-dark/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-brand-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Gmail Connection Status */}
          {!gmailConnected && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">
                  Gmail not connected
                </p>
                <p className="text-xs text-red-300 mt-1">
                  Please connect your Gmail account in settings first.
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* To Emails */}
          <div>
            <label className="block text-sm font-semibold text-brand-text mb-2">
              To: <span className="text-red-400">*</span>
            </label>
            <div className="space-y-2">
              {toEmails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {toEmails.map((email) => (
                    <div
                      key={email}
                      className="bg-brand-accent/10 border border-brand-accent/30 rounded-lg px-3 py-1 flex items-center gap-2"
                    >
                      <span className="text-sm text-brand-text">{email}</span>
                      <button
                        onClick={() => removeToEmail(email)}
                        className="text-brand-text-muted hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={toEmailInput}
                  onChange={(e) => setToEmailInput(e.target.value)}
                  placeholder="Enter recipient email"
                  className="flex-1 px-3 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-sm text-brand-text placeholder-brand-text-muted focus:outline-none focus:border-brand-accent"
                />
                <button
                  onClick={addToEmail}
                  className="px-4 py-2 bg-brand-accent/20 border border-brand-accent text-brand-accent rounded-lg hover:bg-brand-accent/30 transition-colors text-sm font-medium"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* CC Emails */}
          <div>
            <label className="block text-sm font-semibold text-brand-text mb-2">
              CC: <span className="text-xs text-brand-text-muted">(Optional)</span>
            </label>
            <div className="space-y-2">
              {ccEmails.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {ccEmails.map((email) => (
                    <div
                      key={email}
                      className="bg-brand-accent/10 border border-brand-accent/30 rounded-lg px-3 py-1 flex items-center gap-2"
                    >
                      <span className="text-sm text-brand-text">{email}</span>
                      <button
                        onClick={() => removeCcEmail(email)}
                        className="text-brand-text-muted hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={ccEmailInput}
                  onChange={(e) => setCcEmailInput(e.target.value)}
                  placeholder="Enter CC email (optional)"
                  className="flex-1 px-3 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-sm text-brand-text placeholder-brand-text-muted focus:outline-none focus:border-brand-accent"
                />
                <button
                  onClick={addCcEmail}
                  className="px-4 py-2 bg-brand-accent/20 border border-brand-accent text-brand-accent rounded-lg hover:bg-brand-accent/30 transition-colors text-sm font-medium"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Custom Message */}
          <div>
            <label className="block text-sm font-semibold text-brand-text mb-2">
              Custom Message: <span className="text-xs text-brand-text-muted">(Optional)</span>
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a personal message to include in the email (optional)"
              className="w-full px-3 py-2 bg-brand-dark border border-brand-dark-border rounded-lg text-sm text-brand-text placeholder-brand-text-muted focus:outline-none focus:border-brand-accent"
              rows={4}
            />
            <p className="text-xs text-brand-text-muted mt-1">
              A default professional message will be sent if you don't add a custom message.
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <p className="text-xs text-blue-300">
              Your CV and cover letter will be attached to the email automatically.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-brand-dark-card px-6 py-4 border-t border-brand-dark-border flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-brand-dark-border text-brand-text-muted rounded-lg hover:bg-brand-dark-border/80 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSendEmail}
            disabled={loading || !gmailConnected}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {loading ? "Sending..." : "Send Application"}
          </button>
        </div>
      </div>
    </div>
  );
};
