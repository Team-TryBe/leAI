'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import {
  Check,
  X,
  Zap,
  Calendar,
  CreditCard,
  Download,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  Lock,
  Crown,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { getAuthToken } from '@/lib/auth'
import Link from 'next/link'

interface Plan {
  id: string
  name: string
  price: number
  period: string
  description: string
  features: Array<{ text: string; included: boolean }>
  badge?: string
  recommended?: boolean
}

interface UserSubscription {
  current_plan: string
  status: string
  started_at: string
  next_billing_date: string
  auto_renew: boolean
  cancellation_requested: boolean
}

interface Invoice {
  id: string
  amount: number
  date: string
  status: 'paid' | 'pending' | 'failed'
  plan_name: string
  download_url?: string
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Freemium',
    price: 0,
    period: '/month',
    description: 'Perfect for getting started',
    features: [
      { text: '2 applications per month', included: true },
      { text: 'Basic AI Model (Gemini Flash)', included: true },
      { text: 'Standard CV Templates', included: true },
      { text: 'Email Support', included: true },
      { text: 'Unlimited AI Analysis', included: false },
      { text: 'Direct Email Send', included: false },
      { text: 'ATS Score Check', included: false },
      { text: 'WhatsApp Alerts', included: false },
      { text: 'Email Open Tracking', included: false },
    ],
    recommended: false,
  },
  {
    id: 'paygo',
    name: 'Pay-As-You-Go',
    price: 50,
    period: 'per application',
    description: 'Perfect for occasional applicants',
    badge: 'Flexible',
    features: [
      { text: '1 Full Pro Application', included: true },
      { text: 'CV + Cover Letter + Email', included: true },
      { text: 'Direct Send as Me', included: true },
      { text: 'Premium AI (Claude 3.5)', included: true },
      { text: 'Dashboard Analytics', included: false },
      { text: 'Revision History', included: false },
      { text: 'No Subscription Required', included: true },
      { text: 'Cancel Anytime', included: true },
    ],
    recommended: false,
  },
  {
    id: 'pro',
    name: 'Pro Monthly',
    price: 1999,
    period: '/month',
    description: 'Most popular for active job seekers',
    badge: 'Popular',
    recommended: true,
    features: [
      { text: 'Unlimited Applications (Fair Use)', included: true },
      { text: 'Premium AI Models (Claude + Gemini)', included: true },
      { text: 'ATS-Optimized Custom Layouts', included: true },
      { text: 'Direct Email Send', included: true },
      { text: 'Advanced Job Scraping', included: true },
      { text: 'Email Open Tracking', included: true },
      { text: 'Multi-Model Intelligence', included: true },
      { text: 'ATS Score Check', included: true },
      { text: 'WhatsApp Alerts', included: true },
    ],
  },
  {
    id: 'annual',
    name: 'Pro Annual',
    price: 19990,
    period: '/year',
    description: 'Save 20% with annual commitment',
    badge: 'Best Value',
    features: [
      { text: 'Everything in Pro Monthly', included: true },
      { text: 'LinkedIn Profile Makeover', included: true },
      { text: 'Hidden Market Weekly Report', included: true },
      { text: 'Human Review Credit (1x)', included: true },
      { text: 'Priority Support', included: true },
      { text: 'Advanced Job Scraping', included: true },
      { text: 'Email Open Tracking', included: true },
      { text: 'Multi-Model Intelligence', included: true },
      { text: 'ATS Score Check', included: true },
    ],
  },
]

const SAMPLE_INVOICES: Invoice[] = [
  {
    id: 'INV-001',
    amount: 1999,
    date: 'January 1, 2025',
    status: 'paid',
    plan_name: 'Pro Monthly',
  },
  {
    id: 'INV-002',
    amount: 1999,
    date: 'December 1, 2024',
    status: 'paid',
    plan_name: 'Pro Monthly',
  },
  {
    id: 'INV-003',
    amount: 1999,
    date: 'November 1, 2024',
    status: 'paid',
    plan_name: 'Pro Monthly',
  },
]

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>(SAMPLE_INVOICES)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'plans' | 'billing' | 'invoices'>('plans')

  useEffect(() => {
    fetchSubscriptionData()
  }, [])

  const fetchSubscriptionData = async () => {
    try {
      const token = getAuthToken()
      if (!token) return

      // Mock data for now - replace with actual API calls
      setSubscription({
        current_plan: 'pro',
        status: 'active',
        started_at: 'Dec 1, 2024',
        next_billing_date: 'Jan 1, 2025',
        auto_renew: true,
        cancellation_requested: false,
      })
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpgradePlan = async (planId: string) => {
    setUpgrading(planId)
    try {
      const token = getAuthToken()
      if (!token) return

      // Call backend to upgrade plan
      const response = await fetch('http://localhost:8000/api/v1/subscriptions/upgrade', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan_id: planId }),
      })

      if (response.ok) {
        fetchSubscriptionData()
      }
    } catch (error) {
      console.error('Failed to upgrade plan:', error)
    } finally {
      setUpgrading(null)
    }
  }

  const handleDownloadInvoice = (invoiceId: string) => {
    // Implement invoice download
    console.log('Downloading invoice:', invoiceId)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-primary mx-auto"></div>
            <p className="text-brand-text-muted">Loading subscription...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-brand-text">Plans & Billing</h1>
          <p className="text-sm text-brand-text-muted">Choose the perfect plan for your job search journey</p>
        </div>

        {/* Current Plan Status Card (if subscribed) */}
        {subscription && (
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-primary/20 via-brand-accent/10 to-purple-500/10 border border-brand-primary/30 p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-primary/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-brand-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="text-sm font-bold text-brand-text">
                      {PLANS.find((p) => p.id === subscription.current_plan)?.name}
                    </h3>
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-semibold">
                      Active
                    </span>
                  </div>
                  <p className="text-xs text-brand-text-muted">
                    Renews {subscription.next_billing_date}
                  </p>
                </div>
              </div>
              <Link
                href="#billing"
                onClick={() => setActiveTab('billing')}
                className="text-xs text-brand-primary hover:underline flex items-center gap-1"
              >
                Manage
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* Pricing Toggle (Monthly/Annual) */}
        <div className="flex items-center justify-center gap-3 p-1 bg-brand-dark-border/50 rounded-lg max-w-xs mx-auto">
          <button className="flex-1 px-4 py-2 rounded-md text-sm font-medium bg-brand-primary text-white transition">
            Monthly
          </button>
          <button className="flex-1 px-4 py-2 rounded-md text-sm font-medium text-brand-text-muted hover:text-brand-text transition">
            Annual
            <span className="ml-1 text-xs text-green-400">Save 20%</span>
          </button>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => {
            const isCurrentPlan = subscription?.current_plan === plan.id
            const isUpgrade = !isCurrentPlan && plan.price > (PLANS.find(p => p.id === subscription?.current_plan)?.price || 0)
            
            return (
              <div
                key={plan.id}
                className={`relative rounded-xl transition-all ${
                  plan.recommended
                    ? 'border-2 border-brand-primary bg-gradient-to-br from-brand-primary/5 to-brand-accent/5 shadow-lg'
                    : 'border border-brand-dark-border bg-brand-dark-card hover:border-brand-primary/30'
                }`}
              >
                {/* Recommended Badge */}
                {plan.recommended && (
                  <div className="absolute -top-3 left-0 right-0 flex justify-center">
                    <span className="px-3 py-1 bg-gradient-to-r from-brand-primary to-brand-accent text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1">
                      <Sparkles size={12} />
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Badge (non-recommended) */}
                {!plan.recommended && plan.badge && (
                  <div className="absolute top-3 right-3">
                    <span className="px-2 py-1 bg-brand-accent/20 text-brand-accent text-xs font-semibold rounded-md">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="p-4 space-y-4">
                  {/* Plan Header */}
                  <div>
                    <h3 className="text-lg font-bold text-brand-text mb-1">{plan.name}</h3>
                    <p className="text-xs text-brand-text-muted">{plan.description}</p>
                  </div>

                  {/* Pricing */}
                  <div className="border-b border-brand-dark-border pb-4">
                    {plan.price === 0 ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-brand-text">Free</span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs text-brand-text-muted">KES</span>
                          <span className="text-3xl font-bold text-brand-text">
                            {plan.price.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-brand-text-muted mt-0.5">{plan.period}</p>
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleUpgradePlan(plan.id)}
                    disabled={upgrading === plan.id || isCurrentPlan}
                    className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      isCurrentPlan
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
                        : plan.recommended
                        ? 'bg-gradient-to-r from-brand-primary to-brand-accent text-white hover:shadow-md'
                        : 'bg-brand-dark-border hover:bg-brand-primary/20 text-brand-text hover:text-brand-primary border border-transparent hover:border-brand-primary/30'
                    } ${upgrading === plan.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {upgrading === plan.id ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-current"></div>
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      <>
                        <Check size={14} />
                        Current Plan
                      </>
                    ) : isUpgrade ? (
                      <>
                        <ArrowRight size={14} />
                        Upgrade
                      </>
                    ) : (
                      'Select Plan'
                    )}
                  </button>

                  {/* Key Features (Top 5) */}
                  <div className="space-y-2">
                    {plan.features.slice(0, 5).map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        {feature.included ? (
                          <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-brand-text-muted/40 flex-shrink-0 mt-0.5" />
                        )}
                        <span
                          className={`text-xs leading-tight ${
                            feature.included ? 'text-brand-text' : 'text-brand-text-muted/60'
                          }`}
                        >
                          {feature.text}
                        </span>
                      </div>
                    ))}
                    {plan.features.length > 5 && (
                      <p className="text-xs text-brand-text-muted/60 pt-1 flex items-center gap-1">
                        <Info size={12} />
                        +{plan.features.length - 5} more features
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Billing & Invoice Section */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2 pb-2 border-b border-brand-dark-border">
            <CreditCard className="w-4 h-4 text-brand-text-muted" />
            <h2 className="text-sm font-semibold text-brand-text">Billing & Invoices</h2>
          </div>

          {subscription && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Billing Info */}
              <div className="lg:col-span-2 card-dark p-4 space-y-3">
                <h3 className="text-sm font-semibold text-brand-text mb-2">Payment Details</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-brand-dark-border">
                    <span className="text-xs text-brand-text-muted">Billing Cycle</span>
                    <span className="text-xs text-brand-text font-medium">Monthly</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-brand-dark-border">
                    <span className="text-xs text-brand-text-muted">Started</span>
                    <span className="text-xs text-brand-text font-medium">{subscription.started_at}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-brand-dark-border">
                    <span className="text-xs text-brand-text-muted">Next Billing</span>
                    <span className="text-xs text-brand-text font-medium">{subscription.next_billing_date}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs text-brand-text-muted">Auto-Renewal</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        subscription.auto_renew
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {subscription.auto_renew ? 'On' : 'Off'}
                    </span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="pt-3 border-t border-brand-dark-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-brand-text">Payment Method</span>
                    <button className="text-xs text-brand-primary hover:underline">Update</button>
                  </div>
                  <div className="p-3 bg-brand-dark/50 rounded-lg border border-brand-dark-border">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-6 bg-gradient-to-br from-green-400 to-green-600 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">M</span>
                      </div>
                      <div>
                        <p className="text-xs text-brand-text font-medium">M-Pesa</p>
                        <p className="text-xs text-brand-text-muted">+254 7XX XXX XXX</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Usage */}
              <div className="space-y-4">
                {/* Usage Stats */}
                <div className="card-dark p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-brand-primary" />
                    <h3 className="text-sm font-semibold text-brand-text">Usage This Month</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-brand-text-muted">Applications</span>
                        <span className="text-xs text-brand-text font-semibold">45/150</span>
                      </div>
                      <div className="w-full bg-brand-dark/50 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-brand-primary to-brand-accent h-full transition-all" style={{ width: '30%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-brand-text-muted">API Calls</span>
                        <span className="text-xs text-brand-text font-semibold">320/1000</span>
                      </div>
                      <div className="w-full bg-brand-dark/50 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-brand-accent to-green-400 h-full transition-all" style={{ width: '32%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="card-dark p-4 space-y-2">
                  <h3 className="text-sm font-semibold text-brand-text mb-2">Quick Actions</h3>
                  
                  <button className="w-full px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs font-medium transition border border-red-500/30 flex items-center justify-center gap-2">
                    <Lock size={14} />
                    Cancel Subscription
                  </button>
                  
                  <button className="w-full px-3 py-2 bg-brand-dark-border hover:bg-brand-dark text-brand-text rounded-lg text-xs font-medium transition flex items-center justify-center gap-2">
                    <AlertCircle size={14} />
                    Request Refund
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Invoice History */}
          <div className="card-dark overflow-hidden">
            <div className="p-4 border-b border-brand-dark-border">
              <h3 className="text-sm font-semibold text-brand-text">Recent Invoices</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b border-brand-dark-border bg-brand-dark/30">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-brand-text-muted">Invoice</th>
                    <th className="text-left px-4 py-2 font-medium text-brand-text-muted">Date</th>
                    <th className="text-left px-4 py-2 font-medium text-brand-text-muted">Plan</th>
                    <th className="text-right px-4 py-2 font-medium text-brand-text-muted">Amount</th>
                    <th className="text-center px-4 py-2 font-medium text-brand-text-muted">Status</th>
                    <th className="text-center px-4 py-2 font-medium text-brand-text-muted">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-dark-border">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-brand-dark/30 transition">
                      <td className="px-4 py-2 text-brand-text font-medium">{invoice.id}</td>
                      <td className="px-4 py-2 text-brand-text-muted">{invoice.date}</td>
                      <td className="px-4 py-2 text-brand-text">{invoice.plan_name}</td>
                      <td className="px-4 py-2 text-right text-brand-text font-semibold">
                        KES {invoice.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            invoice.status === 'paid'
                              ? 'bg-green-500/20 text-green-400'
                              : invoice.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          onClick={() => handleDownloadInvoice(invoice.id)}
                          className="inline-flex items-center text-brand-primary hover:text-brand-accent transition p-1 rounded hover:bg-brand-primary/10"
                          title="Download"
                        >
                          <Download size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ / Help Section */}
        <div className="card-dark p-4 bg-gradient-to-br from-brand-primary/5 to-brand-accent/5 border border-brand-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-primary/20 flex items-center justify-center flex-shrink-0">
              <Info className="w-4 h-4 text-brand-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-brand-text mb-1">Need help choosing?</h3>
              <p className="text-xs text-brand-text-muted mb-3">
                Not sure which plan fits your needs? Our team can help you find the perfect match.
              </p>
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center gap-1 text-xs text-brand-primary hover:underline font-medium"
              >
                Contact Support
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
