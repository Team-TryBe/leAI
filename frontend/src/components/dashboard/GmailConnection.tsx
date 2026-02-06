/**
 * Gmail Connection Component
 *
 * Component for managing Gmail OAuth2 connection.
 * Allows users to:
 * - Connect their Gmail account via OAuth2
 * - See connection status
 * - Disconnect their Gmail account
 *
 * Documentation:
 * ✅ Step 2: The Frontend Redirect (Next.js)
 * - Initiate OAuth2 flow when "Connect Gmail" is clicked
 * - Handle redirect back from Google with auth code
 * - Display status and disconnect button
 */

"use client";

import React, { useState, useEffect } from "react";
import { Mail, Check, Loader, AlertCircle, Unlink } from "lucide-react";
import { getAuthToken } from "@/lib/auth";

interface GmailConnectionProps {
  onConnectionChange?: (connected: boolean) => void;
}

export const GmailConnection: React.FC<GmailConnectionProps> = ({
  onConnectionChange,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [error, setError] = useState("");
  const [connectedEmail, setConnectedEmail] = useState("");

  useEffect(() => {
    checkGmailStatus();
  }, []);

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    console.log('🔍 OAuth callback check:', { code: code ? 'present' : 'missing', state: state ? 'present' : 'missing' });
    
    if (code && state) {
      console.log('✅ Auth code and state found, storing tokens...');
      storeGmailTokens(code, state);
    }
  }, []);

  const storeGmailTokens = async (code: string, state: string) => {
    try {
      console.log('📤 Storing Gmail tokens, sending code and state to backend...');
      const token = getAuthToken();
      if (!token) {
        console.error('❌ No auth token found');
        return;
      }

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "http://localhost:8000";

      console.log('🌐 API URL:', apiUrl);
      console.log('📝 Request body:', { code: code.substring(0, 20) + '...', state });

      const response = await fetch(`${apiUrl}/api/v1/auth/gmail/store-tokens`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, state }),
      });

      console.log('📊 Response status:', response.status);
      const data = await response.json();
      console.log('📦 Response data:', data);

      if (response.ok) {
        if (data.success) {
          console.log('✅ Gmail tokens stored successfully!');
          setIsConnected(true);
          setConnectedEmail(data.data?.email || "");
          // Clear URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          // Call callback
          onConnectionChange?.(true);
        }
      } else {
        const errorMsg = data.detail || "Failed to store Gmail tokens";
        console.error('❌ Failed to store tokens:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error("❌ Error storing Gmail tokens:", err);
      setError(err instanceof Error ? err.message : "Failed to connect Gmail");
    }
  };

  const checkGmailStatus = async () => {
    try {
      setCheckingStatus(true);
      const token = getAuthToken();
      if (!token) return;

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "http://localhost:8000";

      const response = await fetch(`${apiUrl}/api/v1/auth/gmail/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setIsConnected(data.data.gmail_connected);
          setConnectedEmail(data.data.connected_email);
        }
      }
    } catch (err) {
      console.error("Error checking Gmail status:", err);
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getAuthToken();
      if (!token) {
        setError("Please log in first");
        return;
      }

      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "http://localhost:8000";

      // Step 1: Get the OAuth2 URL from backend
      const response = await fetch(`${apiUrl}/api/v1/auth/gmail/connect`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error("Failed to initiate Gmail connection");
      }

      const data = await response.json();
      if (data.success && data.data && data.data.auth_url) {
        // Step 2: Redirect to Google OAuth2
        window.location.href = data.data.auth_url;
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect Gmail");
      setLoading(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (
      !confirm(
        "Are you sure you want to disconnect Gmail? You won't be able to send applications via Gmail until you reconnect."
      )
    ) {
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

      const response = await fetch(`${apiUrl}/api/v1/auth/gmail/disconnect`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect Gmail");
      }

      setIsConnected(false);
      setConnectedEmail("");
      onConnectionChange?.(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect Gmail");
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="bg-brand-dark-card border border-brand-dark-border rounded-xl p-6">
        <div className="flex items-center gap-3">
          <Loader className="w-5 h-5 text-brand-accent animate-spin" />
          <p className="text-brand-text-muted">Checking Gmail connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-dark-card border border-brand-dark-border rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Mail className="w-5 h-5 text-brand-accent" />
          <div>
            <h3 className="font-semibold text-brand-text">Gmail Integration</h3>
            <p className="text-xs text-brand-text-muted mt-1">
              Send job applications directly to recruiters
            </p>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="mb-6 p-4 rounded-lg bg-brand-dark/50 border border-brand-dark-border">
        <div className="flex items-center gap-3">
          {isConnected ? (
            <>
              <Check className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-green-400">
                  Gmail Connected
                </p>
                {connectedEmail && (
                  <p className="text-xs text-brand-text-muted mt-1">
                    {connectedEmail}
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium text-yellow-400">
                  Gmail Not Connected
                </p>
                <p className="text-xs text-brand-text-muted mt-1">
                  Connect to send applications via Gmail
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Info Box */}
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-xs text-blue-300 space-y-2">
        <p>
          <strong>How it works:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Connect your Gmail account using OAuth2</li>
          <li>
            Your credentials are encrypted and stored securely
          </li>
          <li>Send applications with CV and cover letter as attachments</li>
          <li>Easily disconnect at any time</li>
        </ul>
      </div>

      {/* Actions */}
      {!isConnected ? (
        <button
          onClick={handleConnectGmail}
          disabled={loading}
          className="w-full px-4 py-3 bg-gradient-to-r from-brand-accent to-[#a78bfa] text-white rounded-lg hover:shadow-lg hover:shadow-brand-accent/50 transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" />
              Connect Gmail Account
            </>
          )}
        </button>
      ) : (
        <button
          onClick={handleDisconnectGmail}
          disabled={loading}
          className="w-full px-4 py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Disconnecting...
            </>
          ) : (
            <>
              <Unlink className="w-4 h-4" />
              Disconnect Gmail
            </>
          )}
        </button>
      )}
    </div>
  );
};
