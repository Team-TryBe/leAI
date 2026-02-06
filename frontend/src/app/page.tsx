import Link from 'next/link'
import { CheckCircle2, Zap, Brain, Shield, Users, ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <div className="bg-brand-dark text-brand-text">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-brand-dark-card/80 backdrop-blur-xl border-b border-brand-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-display font-bold bg-gradient-brand bg-clip-text text-transparent">LeAI</div>
          <div className="hidden md:flex gap-8 items-center">
            <Link href="/#features" className="text-sm hover:text-brand-primary transition">Features</Link>
            <Link href="/pricing" className="text-sm hover:text-brand-primary transition">Pricing</Link>
            <Link href="/about" className="text-sm hover:text-brand-primary transition">About</Link>
            <Link href="/contact" className="text-sm hover:text-brand-primary transition">Contact</Link>
          </div>
          <div className="flex gap-3">
            <Link href="/auth/login" className="px-4 py-2 text-sm font-semibold text-brand-primary hover:text-brand-primary-light transition">
              Sign In
            </Link>
            <Link href="/auth/signup" className="px-4 py-2 text-sm font-semibold bg-brand-primary text-white rounded-lg hover:bg-brand-primary-hover transition">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-40 left-20 w-96 h-96 bg-brand-primary/20 rounded-full filter blur-3xl animate-float" />
          <div className="absolute bottom-40 right-20 w-96 h-96 bg-brand-accent/20 rounded-full filter blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative max-w-5xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 rounded-full border border-brand-dark-border">
            <span className="w-2 h-2 bg-brand-primary rounded-full animate-pulse" />
            <span className="text-sm text-brand-primary font-semibold">Welcome to tryleai</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-6xl md:text-7xl font-display font-bold leading-tight">
            Your AI-Powered
            <span className="block bg-gradient-brand bg-clip-text text-transparent">Career Assistant</span>
          </h1>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-brand-text-muted max-w-3xl mx-auto leading-relaxed">
            Land your dream job faster. From job discovery to application submission—LeAI handles it all with AI-powered precision, tailored for your success.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Link href="/auth/signup" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-brand text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-brand-primary/40 transition-all transform hover:scale-105">
              Start Free <ArrowRight size={20} />
            </Link>
            <Link href="/pricing" className="inline-flex items-center justify-center px-8 py-4 bg-brand-dark-card border border-brand-dark-border text-brand-text rounded-lg font-semibold hover:border-brand-primary transition">
              View Pricing
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 pt-16 border-t border-brand-dark-border">
            <div>
              <div className="text-3xl font-bold text-brand-primary">1000+</div>
              <div className="text-sm text-brand-text-muted">Users Empowered</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-brand-primary">50K+</div>
              <div className="text-sm text-brand-text-muted">Applications Submitted</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-brand-primary">95%</div>
              <div className="text-sm text-brand-text-muted">Success Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-6xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-display font-bold">Powerful Features</h2>
            <p className="text-xl text-brand-text-muted max-w-2xl mx-auto">Everything you need to ace your job hunt</p>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="card-dark p-6 space-y-4 group hover:border-brand-primary transition">
              <div className="w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center group-hover:bg-brand-primary/40 transition">
                <Brain className="text-brand-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold">AI Job Analysis</h3>
              <p className="text-brand-text-muted">Intelligent extraction of requirements from any job posting</p>
            </div>

            {/* Feature 2 */}
            <div className="card-dark p-6 space-y-4 group hover:border-brand-primary transition">
              <div className="w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center group-hover:bg-brand-primary/40 transition">
                <Zap className="text-brand-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold">Auto-Generate Materials</h3>
              <p className="text-brand-text-muted">Tailored CVs, cover letters, and outreach emails in seconds</p>
            </div>

            {/* Feature 3 */}
            <div className="card-dark p-6 space-y-4 group hover:border-brand-primary transition">
              <div className="w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center group-hover:bg-brand-primary/40 transition">
                <Shield className="text-brand-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold">ATS Optimized</h3>
              <p className="text-brand-text-muted">Every document crafted to pass Applicant Tracking Systems</p>
            </div>

            {/* Feature 4 */}
            <div className="card-dark p-6 space-y-4 group hover:border-brand-primary transition">
              <div className="w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center group-hover:bg-brand-primary/40 transition">
                <Users className="text-brand-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold">Profile Management</h3>
              <p className="text-brand-text-muted">Centralized master profile for consistent applications</p>
            </div>

            {/* Feature 5 */}
            <div className="card-dark p-6 space-y-4 group hover:border-brand-primary transition">
              <div className="w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center group-hover:bg-brand-primary/40 transition">
                <CheckCircle2 className="text-brand-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold">Track Applications</h3>
              <p className="text-brand-text-muted">Monitor status and manage all applications in one dashboard</p>
            </div>

            {/* Feature 6 */}
            <div className="card-dark p-6 space-y-4 group hover:border-brand-primary transition">
              <div className="w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center group-hover:bg-brand-primary/40 transition">
                <Zap className="text-brand-primary" size={24} />
              </div>
              <h3 className="text-xl font-semibold">Smart Recommendations</h3>
              <p className="text-brand-text-muted">AI-powered job matching based on your profile & preferences</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-dark bg-gradient-mesh">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-display font-bold">Ready to Transform Your Career?</h2>
          <p className="text-xl text-brand-text-muted">Join 1000+ job seekers who've landed their dream roles with LeAI</p>
          <Link href="/auth/signup" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-brand text-white rounded-lg font-semibold hover:shadow-xl hover:shadow-brand-primary/40 transition-all transform hover:scale-105">
            Get Started Free Today <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-brand-dark-border py-12 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="text-xl font-display font-bold bg-gradient-brand bg-clip-text text-transparent mb-4">LeAI</div>
            <p className="text-sm text-brand-text-muted">Empowering careers through AI</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm text-brand-text-muted">
              <li><Link href="/pricing" className="hover:text-brand-primary transition">Pricing</Link></li>
              <li><Link href="/#features" className="hover:text-brand-primary transition">Features</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-brand-text-muted">
              <li><Link href="/about" className="hover:text-brand-primary transition">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-brand-primary transition">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm text-brand-text-muted">
              <li><a href="#" className="hover:text-brand-primary transition">Privacy</a></li>
              <li><a href="#" className="hover:text-brand-primary transition">Terms</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-brand-dark-border pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-brand-text-muted">
          <p>&copy; 2026 LeAI. All rights reserved.</p>
          <div className="flex gap-4 mt-4 md:mt-0">
            <a href="#" className="hover:text-brand-primary transition">Twitter</a>
            <a href="#" className="hover:text-brand-primary transition">LinkedIn</a>
            <a href="#" className="hover:text-brand-primary transition">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
