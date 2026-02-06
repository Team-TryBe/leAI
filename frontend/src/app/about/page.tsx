import Link from 'next/link'
import { ArrowRight, Lightbulb, Target, Heart, Rocket, Users, Zap, Globe } from 'lucide-react'

export default function About() {
  const team = [
    {
      name: 'Caleb Kiptoo',
      role: 'Founder & CEO',
      icon: '🚀',
      desc: 'Visionary leader building the future of career automation'
    },
    {
      name: 'Innovation Lab',
      role: 'Tech & Product',
      icon: '⚡',
      desc: 'Cutting-edge AI and UX engineering'
    },
    {
      name: 'Global Team',
      role: 'Support & Growth',
      icon: '🌍',
      desc: '24/7 dedicated customer success'
    },
  ]

  const values = [
    {
      icon: Rocket,
      title: 'Innovation First',
      description: 'Pushing boundaries of what AI can achieve',
      color: 'from-brand-primary to-brand-primary-light'
    },
    {
      icon: Globe,
      title: 'Accessible to All',
      description: 'Affordable, global, truly inclusive',
      color: 'from-brand-accent to-brand-primary'
    },
    {
      icon: Heart,
      title: 'User Obsessed',
      description: 'Your success drives everything we do',
      color: 'from-brand-error to-brand-accent'
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
      <section className="relative py-16 sm:py-24 px-4 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl -top-20 -right-20 animate-float" style={{animationDelay: '0s'}} />
          <div className="absolute w-96 h-96 bg-brand-accent/10 rounded-full blur-3xl -bottom-20 -left-20 animate-float" style={{animationDelay: '2s'}} />
        </div>
        
        <div className="max-w-4xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-block px-4 py-2 rounded-full bg-brand-primary/20 border border-brand-primary/50 text-sm font-semibold text-brand-primary mb-4">
            ✨ About Our Mission
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-display font-black bg-gradient-brand bg-clip-text text-transparent leading-tight">
            We're Redefining Career Success
          </h1>
          <p className="text-lg sm:text-xl text-brand-text-muted max-w-2xl mx-auto">
            AI-powered job automation for everyone. Level the playing field and land the opportunities you deserve.
          </p>
        </div>
      </section>

      {/* Mission & Story Section */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Mission */}
          <div className="card-dark p-8 sm:p-10 space-y-4 mb-12 hover:border-brand-primary/50 transition-colors duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-brand-primary/20 flex items-center justify-center text-2xl">🎯</div>
              <h2 className="text-3xl sm:text-4xl font-display font-bold">Our Mission</h2>
            </div>
            <p className="text-lg text-brand-text-muted leading-relaxed">
              We believe talent shouldn't be hidden by tedious bureaucracy. LeAI democratizes access to AI tools that level the playing field—especially in emerging markets where opportunity meets innovation.
            </p>
            <p className="text-base text-brand-text-muted leading-relaxed">
              By automating the repetitive, we free you to focus on growth, networking, and landing opportunities that excite you.
            </p>
          </div>

          {/* Story Grid */}
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-center mb-12">
            <div className="space-y-5 order-2 md:order-1">
              <h3 className="text-3xl sm:text-4xl font-display font-bold">Founded in 2026</h3>
              <div className="space-y-3 text-brand-text-muted">
                <p>
                  After observing thousands of talented graduates waste hours on applications only to face rejection due to formatting, we asked: <span className="text-brand-primary italic">"What if AI could handle this?"</span>
                </p>
                <p>
                  LeAI was born—combining cutting-edge AI with deep market understanding across Africa.
                </p>
              </div>
            </div>
            <div className="order-1 md:order-2 grid grid-cols-3 gap-3 sm:gap-4">
              {[
                { stat: '1000+', label: 'Jobs Landed', icon: '🚀' },
                { stat: '50K+', label: 'Apps Sent', icon: '📤' },
                { stat: '95%', label: 'Success Rate', icon: '⭐' }
              ].map((item, i) => (
                <div key={i} className="card-dark p-4 sm:p-6 text-center space-y-2 hover:scale-105 transition transform">
                  <div className="text-3xl sm:text-4xl">{item.icon}</div>
                  <div className="text-2xl sm:text-3xl font-bold text-brand-primary">{item.stat}</div>
                  <div className="text-xs sm:text-sm text-brand-text-muted">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 sm:py-20 px-4 bg-gradient-dark/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-display font-bold mb-3">Our Core Values</h2>
            <p className="text-brand-text-muted max-w-2xl mx-auto">What drives everything we do</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {values.map((value, i) => {
              const Icon = value.icon
              return (
                <div key={i} className="group card-dark p-8 sm:p-10 space-y-4 hover:border-brand-primary/50 transition-all duration-300 hover:-translate-y-1">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${value.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="text-white" size={28} />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold">{value.title}</h3>
                  <p className="text-sm sm:text-base text-brand-text-muted leading-relaxed">{value.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-display font-bold mb-3">Meet the Team</h2>
            <p className="text-brand-text-muted max-w-2xl mx-auto">Passionate builders creating the future</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {team.map((member, i) => (
              <div key={i} className="card-dark p-8 space-y-4 text-center hover:scale-105 transition-transform">
                <div className="text-6xl mx-auto mb-2">{member.icon}</div>
                <h3 className="text-xl sm:text-2xl font-bold">{member.name}</h3>
                <p className="text-sm font-semibold text-brand-primary">{member.role}</p>
                <p className="text-sm text-brand-text-muted">{member.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 sm:py-20 px-4 bg-gradient-brand/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl sm:text-5xl font-display font-bold mb-12 text-center">Why Choose LeAI?</h2>
          
          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            {[
              { emoji: '🌍', title: 'Built for Africa', desc: 'Understands local job markets & opportunities' },
              { emoji: '💰', title: 'Affordable AI', desc: 'Quality tools at accessible prices' },
              { emoji: '✅', title: 'Proven Results', desc: '95% of users land interviews' },
              { emoji: '🔒', title: 'Privacy First', desc: 'Your data is always yours' },
              { emoji: '⚡', title: 'Super Fast', desc: 'Instant AI-powered analysis & optimization' },
              { emoji: '🤝', title: 'Real Support', desc: 'Human team, not just bots' }
            ].map((item, i) => (
              <div key={i} className="card-dark p-6 space-y-2 hover:border-brand-primary/50 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="text-3xl flex-shrink-0">{item.emoji}</span>
                  <div>
                    <h3 className="font-bold text-lg">{item.title}</h3>
                    <p className="text-sm text-brand-text-muted">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl sm:text-5xl font-display font-bold">Ready to Transform Your Career?</h2>
            <p className="text-lg text-brand-text-muted">Join 1000+ job seekers already using LeAI</p>
          </div>
          <Link href="/auth/signup" className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-brand text-white font-bold rounded-lg hover:shadow-lg hover:shadow-brand-primary/50 transition transform hover:scale-105">
            Get Started Free <ArrowRight size={20} />
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
