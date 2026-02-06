import Link from 'next/link'
import { Check, ArrowRight, Zap, Crown, Bolt } from 'lucide-react'

export default function Pricing() {
  const plans = [
    {
      name: 'Freemium',
      price: '0',
      period: '/month',
      description: 'Get started free',
      icon: Bolt,
      features: ['3 apps/month', 'Basic AI analysis', 'Standard CV', 'Email support'],
      cta: 'Start Free',
      popular: false,
    },
    {
      name: 'Pro',
      price: '1,999',
      period: '/month',
      description: 'Unlimited applications',
      icon: Crown,
      features: ['Unlimited apps', 'AI matching', 'Advanced CV/letters', 'Outreach emails', 'Priority support', 'ATS optimization', 'Analytics'],
      cta: 'Get Pro',
      popular: true,
    },
    {
      name: 'Pro Annual',
      price: '19,990',
      period: '/year',
      description: 'Save 20%',
      icon: Zap,
      features: ['Everything Pro', 'Annual report', 'Coaching access', '20% savings'],
      cta: 'Go Annual',
      popular: false,
    },
  ]

  return (
    <div className="bg-brand-dark text-brand-text overflow-hidden">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-brand-dark-card/80 backdrop-blur-xl border-b border-brand-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <Link href="/" className="text-2xl font-display font-bold bg-gradient-brand bg-clip-text text-transparent">LeAI</Link>
          <div className="flex gap-2 sm:gap-3">
            <Link href="/auth/login" className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-brand-primary hover:text-brand-primary-light transition">
              Sign In
            </Link>
            <Link href="/auth/signup" className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover transition">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 px-4 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl -top-20 -right-20 animate-float" style={{animationDelay: '0s'}} />
          <div className="absolute w-96 h-96 bg-brand-accent/10 rounded-full blur-3xl -bottom-20 -left-20 animate-float" style={{animationDelay: '2s'}} />
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-block px-4 py-2 rounded-full bg-brand-primary/20 border border-brand-primary/50 text-sm font-semibold text-brand-primary mb-4">
            💰 Simple, Transparent Pricing
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-display font-black bg-gradient-brand bg-clip-text text-transparent leading-tight">
            Plans for Every Goal
          </h1>
          <p className="text-lg sm:text-xl text-brand-text-muted max-w-2xl mx-auto">
            Choose the plan that fits your job search journey. All plans include full AI features.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Pay-as-you-go info */}
          <div className="text-center mb-12 p-4 sm:p-6 rounded-xl bg-brand-accent/10 border border-brand-accent/30 inline-block w-full">
            <p className="text-sm sm:text-base text-brand-text-muted">
              💡 Or pay <span className="font-bold text-brand-accent">100 KSH per app</span> with no commitment
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
            {plans.map((plan, idx) => {
              const Icon = plan.icon
              return (
                <div
                  key={idx}
                  className={`relative rounded-2xl transition-all duration-300 ${
                    plan.popular
                      ? 'card-dark p-6 sm:p-8 scale-100 md:scale-105 border-2 border-brand-primary shadow-2xl shadow-brand-primary/20'
                      : 'card-dark p-6 sm:p-8 border border-brand-dark-border hover:border-brand-primary/50'
                  }`}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                      <span className="px-4 py-1 rounded-full bg-gradient-brand text-white text-xs sm:text-sm font-bold">
                        🔥 MOST POPULAR
                      </span>
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* Header */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="text-2xl sm:text-3xl font-bold">{plan.name}</h3>
                          <p className="text-xs sm:text-sm text-brand-text-muted">{plan.description}</p>
                        </div>
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.popular ? 'from-brand-primary to-brand-primary-light' : 'from-brand-accent to-brand-primary'} flex items-center justify-center`}>
                          <Icon className="text-white" size={24} />
                        </div>
                      </div>

                      {/* Price */}
                      <div className="pt-3 border-t border-brand-dark-border">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl sm:text-5xl font-black text-brand-text">KSH {plan.price}</span>
                          <span className="text-sm text-brand-text-muted">{plan.period}</span>
                        </div>
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-brand-success flex-shrink-0 mt-0.5" />
                          <span className="text-sm sm:text-base text-brand-text-muted">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <button className={`w-full py-3 rounded-lg font-bold transition-all duration-300 flex items-center justify-center gap-2 ${
                      plan.popular
                        ? 'bg-gradient-brand text-white hover:shadow-lg hover:shadow-brand-primary/50 hover:-translate-y-1'
                        : 'bg-brand-dark-border text-brand-text hover:bg-brand-primary/20 hover:border-brand-primary/50'
                    }`}>
                      {plan.cta}
                      <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 sm:py-20 px-4 bg-gradient-dark/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-center mb-12">Feature Comparison</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-dark-border">
                  <th className="text-left py-4 px-4 text-brand-text-muted font-semibold">Feature</th>
                  <th className="text-center py-4 px-4 text-brand-text font-bold">Freemium</th>
                  <th className="text-center py-4 px-4 text-brand-text font-bold">Pro</th>
                  <th className="text-center py-4 px-4 text-brand-text font-bold">Annual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-dark-border">
                {[
                  { feature: 'Applications/month', freemium: '3', pro: '∞', annual: '∞' },
                  { feature: 'AI Matching', freemium: '✓', pro: '✓', annual: '✓' },
                  { feature: 'Advanced CV/Letters', freemium: '✗', pro: '✓', annual: '✓' },
                  { feature: 'Outreach Emails', freemium: '✗', pro: '✓', annual: '✓' },
                  { feature: 'Priority Support', freemium: '✗', pro: '✓', annual: '✓' },
                  { feature: 'Analytics Dashboard', freemium: '✗', pro: '✓', annual: '✓' },
                  { feature: 'ATS Optimization', freemium: '✗', pro: '✓', annual: '✓' },
                  { feature: 'Annual Report', freemium: '✗', pro: '✗', annual: '✓' },
                  { feature: 'Coaching Access', freemium: '✗', pro: '✗', annual: '✓' },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-brand-primary/5 transition">
                    <td className="py-3 px-4 text-brand-text-muted font-medium text-sm">{row.feature}</td>
                    <td className="py-3 px-4 text-center text-brand-text">{row.freemium === '✓' ? <span className="text-brand-success font-bold">✓</span> : row.freemium === '∞' ? <span className="font-bold">∞</span> : <span className="text-brand-text-muted">—</span>}</td>
                    <td className="py-3 px-4 text-center text-brand-text">{row.pro === '✓' ? <span className="text-brand-success font-bold">✓</span> : row.pro === '∞' ? <span className="font-bold">∞</span> : <span className="text-brand-text-muted">—</span>}</td>
                    <td className="py-3 px-4 text-center text-brand-text">{row.annual === '✓' ? <span className="text-brand-success font-bold">✓</span> : row.annual === '∞' ? <span className="font-bold">∞</span> : <span className="text-brand-text-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-center mb-12">Common Questions</h2>
          
          <div className="space-y-3 sm:space-y-4">
            {[
              {
                q: '❓ Can I switch plans?',
                a: 'Yes! Upgrade or downgrade anytime. Changes take effect immediately on your next billing cycle.'
              },
              {
                q: '💰 Do you offer refunds?',
                a: 'We offer a 7-day money-back guarantee. No questions asked if you\'re not satisfied.'
              },
              {
                q: '💳 What payment methods are accepted?',
                a: 'We accept all major credit cards, M-Pesa, and bank transfers for Kenyan customers.'
              },
              {
                q: '🔄 How does pay-as-you-go work?',
                a: 'Simply pay 100 KSH per application. No subscription needed. Use it your way.'
              },
              {
                q: '📆 Is there a free trial?',
                a: 'Yes! Start free with our Freemium plan and get 3 apps per month forever.'
              },
            ].map((item, i) => (
              <details key={i} className="card-dark p-4 sm:p-6 cursor-pointer group hover:border-brand-primary/50 transition-colors">
                <summary className="font-bold text-base sm:text-lg flex items-center justify-between">
                  {item.q}
                  <span className="text-brand-primary group-open:rotate-180 transition">▼</span>
                </summary>
                <p className="text-sm sm:text-base text-brand-text-muted mt-3 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 px-4 bg-gradient-brand/10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute w-96 h-96 bg-brand-primary/20 rounded-full blur-3xl top-0 right-0" />
          <div className="absolute w-96 h-96 bg-brand-accent/20 rounded-full blur-3xl bottom-0 left-0" />
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          <div className="space-y-3">
            <h2 className="text-4xl sm:text-5xl font-display font-bold">Ready to Transform?</h2>
            <p className="text-lg text-brand-text-muted">Join thousands of job seekers already using LeAI</p>
          </div>
          <Link href="/auth/signup" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-brand text-white font-bold rounded-lg hover:shadow-xl hover:shadow-brand-primary/50 transition transform hover:scale-105 text-lg">
            Start Your Journey <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-brand-dark-border">
        <div className="max-w-6xl mx-auto text-center text-sm text-brand-text-muted">
          <p>© 2026 LeAI. All rights reserved. | Made for Africa's Future Talent</p>
        </div>
      </footer>
    </div>
  )
}
