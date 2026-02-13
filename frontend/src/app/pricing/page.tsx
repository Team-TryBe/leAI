import Link from 'next/link'
import { Check, ArrowRight, Zap, Crown, Bolt } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'

export default function Pricing() {
  const plans = [
    {
      name: 'Freemium',
      price: '0',
      period: '/month',
      description: 'Perfect for getting started',
      icon: Bolt,
      features: [
        '2 applications per month',
        'Basic AI Model (Gemini Flash)',
        'Standard CV Templates',
        'Email Support',
      ],
      cta: 'Start Free',
      popular: false,
    },
    {
      name: 'Pay-As-You-Go',
      price: '50',
      period: 'per application',
      description: 'Perfect for occasional applicants',
      icon: Zap,
      features: [
        '1 Full Pro Application',
        'CV + Cover Letter + Email',
        'Direct Send as Me',
        'Premium AI (Claude 3.5)',
        'No Subscription Required',
      ],
      cta: 'Pay Per Use',
      popular: false,
    },
    {
      name: 'Pro Monthly',
      price: '1,999',
      period: '/month',
      description: 'Most popular for active job seekers',
      icon: Crown,
      features: [
        'Unlimited Applications (Fair Use)',
        'Premium AI Models (Claude + Gemini)',
        'ATS-Optimized Custom Layouts',
        'Direct Email Send',
        'Advanced Job Scraping',
        'Email Open Tracking',
        'Multi-Model Intelligence',
        'ATS Score Check',
        'WhatsApp Alerts',
      ],
      cta: 'Get Pro',
      popular: true,
    },
    {
      name: 'Pro Annual',
      price: '19,990',
      period: '/year',
      description: 'Save 20% with annual commitment',
      icon: Crown,
      features: [
        'Everything in Pro Monthly',
        'LinkedIn Profile Makeover',
        'Hidden Market Weekly Report',
        'Human Review Credit (1x)',
        'Priority Support',
        'Advanced Job Scraping',
        'Email Open Tracking',
        'Multi-Model Intelligence',
        'ATS Score Check',
      ],
      cta: 'Go Annual',
      popular: false,
    },
  ]

  return (
    <div className="bg-gradient-to-br from-brand-primary/8 via-white to-brand-secondary-50 text-gray-900 overflow-hidden">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 px-4 bg-gradient-to-br from-brand-primary/12 via-white to-brand-secondary-50 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(36,37,188,0.1),transparent_45%),linear-gradient(0deg,rgba(36,37,188,0.06),transparent_60%)]" />
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_20%_20%,rgba(60,127,231,0.3),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(44,44,223,0.25),transparent_45%)]" />
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-brand-secondary-300/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-brand-primary/20 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 rounded-full bg-[#2728d2] border border-white text-sm font-semibold text-white mb-4"
          >
            Simple, Transparent Pricing
          </button>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-display font-bold text-white leading-tight">
            Plans for Every Goal
            <span className="block mt-2 text-brand-primary text-2xl font-semibold">AI-powered. Local-first.</span>
          </h1>
          <p className="text-lg sm:text-xl text-white max-w-2xl mx-auto">
            Choose the plan that fits your job search journey — all include AI personalization and direct-send.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 sm:py-16 px-4 bg-gradient-to-b from-black to-[#2728d2]">
        <div className="max-w-7xl mx-auto">
          {/* Cards Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
            {plans.map((plan, idx) => {
              const Icon = plan.icon
              return (
                <div
                  key={idx}
                  className={`relative rounded-xl transition-all duration-300 ${
                    plan.popular
                      ? 'bg-brand-primary text-white p-5 scale-100 md:scale-105 shadow-2xl ring-2 ring-brand-primary'
                      : 'bg-white/95 p-5 border-2 border-brand-primary/30 hover:border-brand-primary hover:shadow-xl'
                  }`}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span className="px-3 py-1 rounded-full bg-gradient-to-r from-brand-primary to-brand-secondary-500 text-white text-xs font-bold shadow-lg">
                        ⭐ MOST POPULAR
                      </span>
                    </div>
                  )}

                  {/* Icon */}
                  <div className="flex justify-between items-start mb-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${plan.popular ? 'bg-white/10 ring-1 ring-white/10' : 'bg-brand-primary'}`}>
                      <Icon className="text-white" size={20} />
                    </div>
                    {idx === 1 && <span className="text-xs font-semibold px-2 py-1 rounded-full bg-brand-secondary-50 text-brand-secondary-700">Flexible</span>}
                    {idx === 3 && <span className="text-xs font-semibold px-2 py-1 rounded-full bg-brand-secondary-50 text-brand-secondary-700">Save 20%</span>}
                  </div>

                  {/* Header */}
                  <div className="mb-3">
                    <h3 className={`text-xl font-bold mb-1 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                    <p className={`text-xs ${plan.popular ? 'text-gray-200' : 'text-gray-700'}`}>{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-3xl font-black ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                        {plan.price === '0' ? 'Free' : `${plan.price}`}
                      </span>
                      {plan.price !== '0' && (
                        <>
                      <span className={`text-lg font-bold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>KSH</span>
                        <span className={`text-xs ${plan.popular ? 'text-gray-200' : 'text-gray-700'}`}>{plan.period}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Features - Compact */}
                  <ul className="space-y-2 mb-4 min-h-[140px]">
                    {plan.features.slice(0, 4).map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.popular ? 'text-green-400' : 'text-green-600'}`} />
                        <span className={`text-xs leading-tight ${plan.popular ? 'text-gray-200' : 'text-gray-800'}`}>{feature}</span>
                      </li>
                    ))}
                    {plan.features.length > 4 && (
                      <li className={`text-xs ${plan.popular ? 'text-gray-300' : 'text-gray-700'} pl-6`}>
                        +{plan.features.length - 4} more features
                      </li>
                    )}
                  </ul>

                  {/* CTA Button */}
                  <button className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                    plan.popular
                      ? 'bg-white text-brand-primary hover:bg-gray-100'
                      : 'bg-brand-primary text-white hover:bg-brand-primary-hover'
                  }`}>
                    {plan.cta}
                    <ArrowRight size={16} />
                  </button>
                </div>
              )
            })}
          </div>

        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 sm:py-20 px-4 bg-black">
        <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-center mb-12 text-white">Feature Comparison</h2>
          
          <div className="overflow-x-auto bg-white/95 rounded-2xl border border-brand-primary/20 shadow-md">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300 bg-brand-primary/5">
                  <th className="text-left py-4 px-6 text-gray-800 font-bold">Feature</th>
                  <th className="text-center py-4 px-6 text-gray-900 font-bold">Freemium</th>
                  <th className="text-center py-4 px-6 text-gray-900 font-bold">Pay-As-You-Go</th>
                  <th className="text-center py-4 px-6 text-gray-900 font-bold">Pro Monthly</th>
                  <th className="text-center py-4 px-6 text-gray-900 font-bold">Pro Annual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {[
                  { feature: 'Applications/month', freemium: '2', paygo: '1', pro: '∞', annual: '∞' },
                  { feature: 'AI Models', freemium: 'Gemini Flash', paygo: 'Claude 3.5', pro: 'All Premium', annual: 'All Premium' },
                  { feature: 'CV Templates', freemium: 'Standard', paygo: 'ATS-Optimized', pro: 'Custom Layouts', annual: 'Custom Layouts' },
                  { feature: 'Direct Email Send', freemium: '✗', paygo: '✓', pro: '✓', annual: '✓' },
                  { feature: 'Job Scraping', freemium: 'Basic', paygo: 'Basic', pro: 'Advanced', annual: 'Advanced' },
                  { feature: 'Email Open Tracking', freemium: '✗', paygo: '✗', pro: '✓', annual: '✓' },
                  { feature: 'ATS Score Check', freemium: '✗', paygo: '✗', pro: '✓', annual: '✓' },
                  { feature: 'WhatsApp Alerts', freemium: '✗', paygo: '✗', pro: '✓', annual: '✓' },
                  { feature: 'LinkedIn Makeover', freemium: '✗', paygo: '✗', pro: '✗', annual: '✓' },
                  { feature: 'Priority Support', freemium: '✗', paygo: '✗', pro: '✗', annual: '✓' },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-brand-primary/3 transition">
                    <td className="py-4 px-6 text-gray-800 font-semibold">{row.feature}</td>
                    <td className="py-4 px-6 text-center text-gray-900 text-sm">{row.freemium === '✓' ? <span className="text-green-700 font-bold">✓</span> : row.freemium === '∞' ? <span className="font-bold text-gray-900">∞</span> : row.freemium === '✗' ? <span className="text-gray-400">—</span> : <span className="text-xs text-gray-800">{row.freemium}</span>}</td>
                    <td className="py-4 px-6 text-center text-gray-900 text-sm">{row.paygo === '✓' ? <span className="text-green-700 font-bold">✓</span> : row.paygo === '∞' ? <span className="font-bold text-gray-900">∞</span> : row.paygo === '✗' ? <span className="text-gray-400">—</span> : <span className="text-xs text-gray-800">{row.paygo}</span>}</td>
                    <td className="py-4 px-6 text-center text-gray-900 text-sm">{row.pro === '✓' ? <span className="text-green-700 font-bold">✓</span> : row.pro === '∞' ? <span className="font-bold text-gray-900">∞</span> : row.pro === '✗' ? <span className="text-gray-400">—</span> : <span className="text-xs text-gray-800">{row.pro}</span>}</td>
                    <td className="py-4 px-6 text-center text-gray-900 text-sm">{row.annual === '✓' ? <span className="text-green-700 font-bold">✓</span> : row.annual === '∞' ? <span className="font-bold text-gray-900">∞</span> : row.annual === '✗' ? <span className="text-gray-400">—</span> : <span className="text-xs text-gray-800">{row.annual}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 sm:py-20 px-4 bg-black">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-center mb-12 text-white">Common Questions</h2>
          
          <div className="space-y-3 sm:space-y-4">
            {[
              {
                q: 'Can I switch plans?',
                a: 'Yes! Upgrade or downgrade anytime. Changes take effect immediately on your next billing cycle.'
              },
              {
                q: 'Do you offer refunds?',
                a: 'We offer a 7-day money-back guarantee. No questions asked if you\'re not satisfied.'
              },
              {
                q: 'What payment methods are accepted?',
                a: 'We accept all major credit cards, M-Pesa, and bank transfers for Kenyan customers.'
              },
              {
                q: 'How does pay-as-you-go work?',
                a: 'Simply pay 50 KSH per application. No subscription needed. Get full Pro features for each application you purchase.'
              },
              {
                q: 'What does "Fair Use" mean?',
                a: 'Unlimited applications means you can apply as much as you need for genuine job seeking. We monitor for abuse but genuine users never hit limits.'
              },
            ].map((item, i) => (
              <details key={i} className="bg-white/95 p-4 sm:p-6 rounded-xl border border-brand-primary/20 cursor-pointer group hover:border-brand-primary/50 hover:shadow-md transition-all">
                <summary className="font-bold text-base sm:text-lg flex items-center justify-between text-gray-900">
                  {item.q}
                  <span className="text-gray-700 group-open:rotate-180 transition">▼</span>
                </summary>
                <p className="text-sm sm:text-base text-gray-700 mt-3 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 px-4 relative overflow-hidden bg-[#2728D2]">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(36,37,188,0.15),transparent_45%),linear-gradient(0deg,rgba(36,37,188,0.06),transparent_60%)]" />
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_10%_10%,rgba(60,127,231,0.22),transparent_35%),radial-gradient(circle_at_90%_90%,rgba(36,37,188,0.18),transparent_40%)]" />
          <div className="absolute -top-28 right-0 w-80 h-80 bg-brand-secondary-300/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-28 left-0 w-80 h-80 bg-brand-primary/25 rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-secondary-100/30 to-transparent" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-3">
            <h2 className="text-4xl sm:text-5xl font-display font-bold text-white">Ready to Transform?</h2>
            <p className="text-lg text-brand-secondary-100">Join thousands of job seekers already using LeAI</p>
          </div>
          <Link href="/auth/signup" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-bold rounded-lg hover:bg-gray-100 transition shadow-lg hover:shadow-brand-secondary-300/40 text-lg">
            Start Your Journey <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
