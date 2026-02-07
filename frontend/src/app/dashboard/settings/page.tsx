'use client';

import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { GmailConnection } from '@/components/dashboard/GmailConnection';
import {
  Mail,
  Lock,
  User,
  Bell,
  Eye,
  LogOut,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Shield,
  Trash2,
  Camera,
  Copy,
  Check,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuthToken } from '@/lib/auth';

interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  location?: string;
  professional_summary?: string;
  created_at: string;
}

interface FormError {
  [key: string]: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [formErrors, setFormErrors] = useState<FormError>({});
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState<UserProfile>({
    id: 0,
    email: '',
    full_name: '',
    phone: '',
    location: '',
    professional_summary: '',
    created_at: '',
  });

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const [notifications, setNotifications] = useState({
    email: true,
    jobMatches: true,
    applicationStatus: true,
    marketingEmails: false,
  });

  const [privacy, setPrivacy] = useState({
    profilePublic: false,
    showApplications: false,
    dataCollection: true,
  });

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          router.push('/auth/login');
          return;
        }

        const response = await fetch('http://127.0.0.1:8000/api/v1/users/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        const result = await response.json();
        const userData = result.data;
        setFormData({
          id: userData.id,
          email: userData.email,
          full_name: userData.full_name || '',
          phone: userData.phone || '',
          location: userData.location || '',
          professional_summary: userData.professional_summary || '',
          created_at: userData.created_at,
        });
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching user data:', error);
        setErrorMessage('Failed to load profile data');
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  useEffect(() => {
    const gmailConnected = searchParams.get('gmail_connected');
    const gmailError = searchParams.get('gmail_error');

    if (gmailConnected === 'true') {
      setActiveTab('gmail');
      setSuccessMessage(
        'Gmail connected successfully! You can now send applications.'
      );
      setTimeout(() => setSuccessMessage(''), 4000);
      router.replace('/dashboard/settings');
      return;
    }

    if (gmailError) {
      setActiveTab('gmail');
      const errorMap: Record<string, string> = {
        token_exchange_failed:
          'Gmail connection failed during token exchange. Please try again.',
        no_access_token:
          'Gmail connection failed: missing access token. Please try again.',
      };
      setErrorMessage(
        errorMap[gmailError] || 'Gmail connection failed. Please try again.'
      );
      router.replace('/dashboard/settings');
    }
  }, [router, searchParams]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFormErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  };

  const handleNotificationChange = (key: string) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  const handlePrivacyChange = (key: string) => {
    setPrivacy((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }));
  };

  const validateProfile = () => {
    const errors: FormError = {};

    if (!formData.full_name || formData.full_name.trim().length < 2) {
      errors.full_name = 'Name must be at least 2 characters';
    }
    if (formData.phone && !/^[\d\s\-+()]+$/.test(formData.phone)) {
      errors.phone = 'Invalid phone number format';
    }

    return errors;
  };

  const handleSaveProfile = async () => {
    const errors = validateProfile();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const token = getAuthToken();
      if (!token) {
        router.push('/auth/login');
        return;
      }

      const response = await fetch('http://127.0.0.1:8000/api/v1/users/me', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          phone: formData.phone,
          location: formData.location,
          professional_summary: formData.professional_summary,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update profile');
      }

      setSuccessMessage('✓ Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to update profile'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.current || !passwords.new || !passwords.confirm) {
      setFormErrors({ password: 'All password fields are required' });
      return;
    }

    if (passwords.new !== passwords.confirm) {
      setFormErrors({ password: 'Passwords do not match' });
      return;
    }

    if (passwords.new.length < 8) {
      setFormErrors({
        password: 'Password must be at least 8 characters',
      });
      return;
    }

    setIsSaving(true);
    setErrorMessage('');

    try {
      const token = getAuthToken();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSuccessMessage('✓ Password changed successfully!');
      setShowPasswordChange(false);
      setPasswords({ current: '', new: '', confirm: '' });
      setFormErrors({});
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to change password'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    router.push('/auth/login');
  };

  const handleCopyUserId = () => {
    navigator.clipboard.writeText(formData.id.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Eye },
    { id: 'gmail', label: 'Gmail', icon: Mail },
  ];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary mx-auto"></div>
            <p className="text-brand-text-muted">Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-primary/10 via-brand-accent/5 to-purple-500/10 border border-brand-primary/20 p-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-brand-primary/20 flex items-center justify-center">
              <User className="w-5 h-5 text-brand-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-brand-text">Settings</h1>
              <p className="text-xs text-brand-text-muted">
                Manage your account and preferences
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 flex items-center gap-2 text-sm">
            <CheckCircle size={16} className="text-green-500" />
            <span className="text-green-600">{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 flex items-center gap-2 text-sm">
            <AlertCircle size={16} className="text-red-500" />
            <span className="text-red-600">{errorMessage}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-brand-dark-border">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium transition flex items-center gap-2 relative ${
                  activeTab === tab.id
                    ? 'text-brand-primary'
                    : 'text-brand-text-muted hover:text-brand-text'
                }`}
              >
                <TabIcon size={14} />
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            <div className="card-dark p-4 space-y-4 rounded-xl">
              <h2 className="text-sm font-semibold text-brand-text">
                Personal Information
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-brand-text-muted mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-brand-dark-border rounded-lg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                    placeholder="Your full name"
                  />
                  {formErrors.full_name && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.full_name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-text-muted mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-3 py-2 bg-brand-dark-border/50 rounded-lg text-sm text-brand-text-muted"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-text-muted mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-brand-dark-border rounded-lg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                    placeholder="+254 XXX XXX XXX"
                  />
                  {formErrors.phone && (
                    <p className="text-xs text-red-500 mt-1">
                      {formErrors.phone}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-text-muted mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-brand-dark-border rounded-lg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                    placeholder="City, Country"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-text-muted mb-1">
                    Professional Summary
                  </label>
                  <textarea
                    name="professional_summary"
                    value={formData.professional_summary}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-brand-dark-border rounded-lg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/50 min-h-24"
                    placeholder="Tell us about yourself..."
                  />
                  <p className="text-xs text-brand-text-muted mt-1">
                    {formData.professional_summary?.length || 0}/500 characters
                  </p>
                </div>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="w-full px-4 py-2 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                <Save size={14} />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="space-y-4">
            {!showPasswordChange ? (
              <button
                onClick={() => setShowPasswordChange(true)}
                className="w-full card-dark p-4 rounded-xl text-left hover:border-brand-primary/30 transition text-sm font-medium text-brand-text flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Lock size={14} />
                  Change Password
                </span>
                <span>&rarr;</span>
              </button>
            ) : (
              <div className="card-dark p-4 rounded-xl space-y-3">
                <h3 className="text-sm font-semibold text-brand-text">
                  Change Password
                </h3>

                <div>
                  <label className="block text-xs font-medium text-brand-text-muted mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={passwords.current}
                    onChange={(e) =>
                      setPasswords({ ...passwords, current: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-brand-dark-border rounded-lg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-text-muted mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={passwords.new}
                    onChange={(e) =>
                      setPasswords({ ...passwords, new: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-brand-dark-border rounded-lg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-brand-text-muted mb-1">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={passwords.confirm}
                    onChange={(e) =>
                      setPasswords({ ...passwords, confirm: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-brand-dark-border rounded-lg text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                  />
                </div>

                {formErrors.password && (
                  <p className="text-xs text-red-500">
                    {formErrors.password}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleChangePassword}
                    disabled={isSaving}
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-brand-primary to-brand-accent text-white rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
                  >
                    {isSaving ? 'Updating...' : 'Update Password'}
                  </button>
                  <button
                    onClick={() => setShowPasswordChange(false)}
                    className="flex-1 px-3 py-2 bg-brand-dark-border text-brand-text rounded-lg text-sm font-semibold hover:bg-brand-dark-border/80 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-3">
            {Object.entries(notifications).map(([key, value]) => (
              <label
                key={key}
                className="card-dark p-4 rounded-xl flex items-center justify-between cursor-pointer hover:border-brand-primary/30 transition"
              >
                <span className="text-sm font-medium text-brand-text">
                  {key === 'email' && 'Email Notifications'}
                  {key === 'jobMatches' && 'Job Matches'}
                  {key === 'applicationStatus' && 'Application Status'}
                  {key === 'marketingEmails' && 'Marketing Emails'}
                </span>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() => handleNotificationChange(key)}
                  className="w-4 h-4"
                />
              </label>
            ))}
          </div>
        )}

        {/* Privacy Tab */}
        {activeTab === 'privacy' && (
          <div className="space-y-3">
            {Object.entries(privacy).map(([key, value]) => (
              <label
                key={key}
                className="card-dark p-4 rounded-xl flex items-center justify-between cursor-pointer hover:border-brand-primary/30 transition"
              >
                <span className="text-sm font-medium text-brand-text">
                  {key === 'profilePublic' && 'Make Profile Public'}
                  {key === 'showApplications' && 'Show Applications'}
                  {key === 'dataCollection' && 'Allow Data Collection'}
                </span>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() => handlePrivacyChange(key)}
                  className="w-4 h-4"
                />
              </label>
            ))}
          </div>
        )}

        {/* Gmail Tab */}
        {activeTab === 'gmail' && <GmailConnection />}
      </div>
    </DashboardLayout>
  );
}
