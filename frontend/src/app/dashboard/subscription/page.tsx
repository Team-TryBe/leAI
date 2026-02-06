'use client'

import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { CheckCircle, ArrowRight, Zap, Users, Shield, TrendingUp } from 'lucide-react'
import { useState } from 'react'

export default function SubscriptionPage() {
  const [selectedPlan, setSelectedPlan] = useState('pro')

  const currentPlan = {
    name: 'Pro',
    price: '1,999',
    billing: 'month',
    started: 'Dec 1, 2024',
    nextBilling: 'Jan 1, 2025',
    status: 'active',
  }

  const plans = [
    {
      id: 'freemium',
      name: 'Freemium',
      price: '0',
      period: '/month',
      description: 'Perfect for getting started',
      features: ['3 apps per month', 'Basic AI analysis', 'Standard CV', 'Email support', 'Dashboard access'],
      cta: 'Current Plan',
      popular: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '1,999',
      period: '/month',
      description: 'Most popular for job seekers',
      features: [
        'Unlimited applications',
        'AI matching & analysis',
        'Advanced CV & cover letters',
        'Outreach emails',
        'Priority support',
        'Application tracking',
        'Profile management',
        'ATS optimization',
      ],
      cta: 'Your Current Plan',
      popular: true,
    },
    {
      id: 'pro-yearly',
      name: 'Pro Yearly',
      price: '19,990',
      period: '/year',
      description: 'Save 20% with annual billing',
      features: ['Everything in Pro', 'Annual report', 'Exclusive resources', 'Priority coaching'],
      cta: 'Upgrade to Yearly',
      popular: false,
    },
  ]

  const payAsYouGo = {
    name: 'Pay-as-you-go',
    price: '100',
    per: 'per application',
    description: 'No commitment, pay only for what you use',
    features: ['Per app billing', 'No subscription required', 'Full features available', 'Cancel anytime'],
  }

  const usage = [
    { name: 'Applications Used', current: 45, limit: 'Unlimited', percentage: 0 },
    { name: 'AI Analysis', current: 42, limit: 'Unlimited', percentage: 0 },
    { name: 'Generated Covers', current: 38, limit: 'Unlimited', percentage: 0 },
    { name: 'Support Requests', current: 12, limit: '50/month', percentage: 24 },
  ]

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-display font-bold text-brand-text">Subscription 💳</h1>
        <p className="text-brand-text-muted">Manage your plan and billing</p>
      </div>

      {/* Current Plan Card */}
      <div className="card-dark p-8 space-y-6 border-l-4 border-l-brand-primary bg-gradient-to-r from-brand-primary/5 to-transparent">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-brand-text">{currentPlan.name} Plan</h2>
              <p className="text-brand-text-muted">KSH {currentPlan.price}/{currentPlan.billing}</p>
            </div>
            <div className="px-4 py-2 rounded-full bg-brand-success/20 text-brand-success text-sm font-semibold">
              ✓ Active
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div>
              <p className="text-brand-text-muted text-sm">Plan Started</p>
              <p className="text-brand-text font-semibold">{currentPlan.started}</p>
            </div>
            <div>
              <p className="text-brand-text-muted text-sm">Next Billing Date</p>
              <p className="text-brand-text font-semibold">{currentPlan.nextBilling}</p>
            </div>
            <div>
              <p className="text-brand-text-muted text-sm">Status</p>
              <p className="text-brand-text font-semibold capitalize">{currentPlan.status}</p>
            </div>
            <div>
              <p className="text-brand-text-muted text-sm">Renewal</p>
              <p className="text-brand-text font-semibold">Auto</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-brand-dark-border">
          <button className="px-6 py-2 rounded-lg bg-brand-primary text-white font-semibold hover:bg-brand-primary/90 transition flex items-center justify-center gap-2">
            <Zap size={18} />
            Upgrade to Yearly
          </button>
          <button className="px-6 py-2 rounded-lg border border-brand-dark-border text-brand-text font-semibold hover:bg-brand-dark-border/50 transition">
            Download Invoice
          </button>
          <button className="px-6 py-2 rounded-lg border border-brand-dark-border text-brand-text font-semibold hover:bg-brand-dark-border/50 transition">
            Manage Payment
          </button>
        </div>
      </div>

      {/* Usage */}
      <div className="card-dark p-6 space-y-6">
        <h2 className="text-xl font-semibold text-brand-text">Usage This Month</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {usage.map((item) => (
            <div key={item.name} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-brand-text-muted">{item.name}</span>
                <span className="text-sm font-semibold text-brand-text">
                  {item.current}/{item.limit}
                </span>
              </div>
              <div className="w-full h-2 bg-brand-dark-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-primary to-brand-accent transition-all"
                  style={{ width: `${item.percentage || 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Plans */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-brand-text">Available Plans</h2>
          <p className="text-brand-text-muted">Switch or upgrade your plan anytime</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-lg transition-all ${
                plan.popular ? 'card-dark p-8 scale-105 border-2 border-brand-primary' : 'card-dark p-6 border border-brand-dark-border'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 rounded-full bg-brand-primary text-white text-xs font-bold">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-brand-text">{plan.name}</h3>
                  <p className="text-sm text-brand-text-muted">{plan.description}</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-brand-text">KSH {plan.price}</span>
                    <span className="text-brand-text-muted">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle size={18} className="text-brand-success flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-brand-text">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  disabled={plan.id === 'pro'}
                  className={`w-full py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
                    plan.id === 'pro'
                      ? 'bg-brand-primary/20 text-brand-primary cursor-not-allowed'
                      : 'bg-brand-primary text-white hover:bg-brand-primary/90'
                  }`}
                >
                  {plan.cta}
                  {plan.id !== 'pro' && <ArrowRight size={18} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pay-as-you-go Option */}
      <div className="card-dark p-6 space-y-4 bg-brand-dark/50">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-brand-accent" size={24} />
          <div>
            <h3 className="text-lg font-bold text-brand-text">{payAsYouGo.name}</h3>
            <p className="text-sm text-brand-text-muted">{payAsYouGo.description}</p>
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-brand-text">KSH {payAsYouGo.price}</span>
          <span className="text-brand-text-muted">{payAsYouGo.per}</span>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {payAsYouGo.features.map((feature, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm text-brand-text-muted">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-accent" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Billing History */}
      <div className="card-dark p-6 space-y-6">
        <h2 className="text-xl font-semibold text-brand-text">Billing History</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-brand-dark-border">
              <tr>
                <th className="text-left py-3 text-brand-text-muted font-medium">Date</th>
                <th className="text-left py-3 text-brand-text-muted font-medium">Plan</th>
                <th className="text-left py-3 text-brand-text-muted font-medium">Amount</th>
                <th className="text-left py-3 text-brand-text-muted font-medium">Status</th>
                <th className="text-left py-3 text-brand-text-muted font-medium">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-dark-border">
              {[
                { date: 'Jan 1, 2025', plan: 'Pro Monthly', amount: 'KSH 1,999', status: 'upcoming', invoice: 'INV-001' },
                { date: 'Dec 1, 2024', plan: 'Pro Monthly', amount: 'KSH 1,999', status: 'paid', invoice: 'INV-001' },
                { date: 'Nov 1, 2024', plan: 'Pro Monthly', amount: 'KSH 1,999', status: 'paid', invoice: 'INV-001' },
              ].map((item, idx) => (
                <tr key={idx} className="hover:bg-brand-dark-border/50 transition">
                  <td className="py-3 text-brand-text">{item.date}</td>
                  <td className="py-3 text-brand-text font-medium">{item.plan}</td>
                  <td className="py-3 text-brand-text font-semibold">{item.amount}</td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        item.status === 'paid'
                          ? 'bg-brand-success/20 text-brand-success'
                          : 'bg-brand-accent/20 text-brand-accent'
                      }`}
                    >
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </td>
                  <td className="py-3">
                    <button className="text-brand-primary hover:underline font-medium">{item.invoice}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-brand-text">Subscription FAQ</h2>
        <div className="space-y-3">
          {[
            {
              q: 'Can I change my plan anytime?',
              a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.',
            },
            {
              q: 'Do you offer refunds?',
              a: 'We offer a 7-day money-back guarantee if you\'re not satisfied with your subscription.',
            },
            {
              q: 'What payment methods do you accept?',
              a: 'We accept all major credit cards, M-Pesa, and bank transfers for Kenyan customers.',
            },
            {
              q: 'Can I cancel my subscription?',
              a: 'You can cancel anytime from your subscription settings. Your access continues until the end of your billing period.',
            },
          ].map((item, idx) => (
            <details key={idx} className="card-dark p-4 cursor-pointer group">
              <summary className="font-semibold text-brand-text flex items-center justify-between">
                {item.q}
                <span className="group-open:rotate-180 transition">▼</span>
              </summary>
              <p className="text-brand-text-muted text-sm mt-3">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
