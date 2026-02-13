import Link from 'next/link'
import { CheckCircle2, Zap, Brain, Shield, Users, ArrowRight, Sparkles, FileText, Send } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'

export default function Home() {
  return (
    <div className="bg-white text-gray-900">
      <SiteHeader />

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-secondary-50 via-white to-gray-50">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-brand-secondary-300/25 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-brand-secondary-400/20 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-secondary-50 rounded-full border border-brand-secondary-100">
              <Sparkles className="w-4 h-4 text-brand-secondary-700" />
              <span className="text-sm text-brand-secondary-700 font-semibold">Transform Your Job Search with AI</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-[1.1] tracking-tight text-black">
              Land Your Dream Job
              <span className="block mt-2 text-brand-secondary-700">10x Faster</span>
            </h1>

            {/* Subheading */}
            <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              From job discovery to application submission LeAI automates your entire job search workflow with AI-powered precision. Built for the Kenyan market.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/auth/signup" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 transition-all shadow-lg hover:shadow-brand-secondary-300/40">
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/#how-it-works" className="inline-flex items-center justify-center px-8 py-4 bg-white border-2 border-brand-secondary-100 text-black rounded-lg font-semibold hover:border-brand-secondary-600 transition-all">
                See How It Works
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-16 max-w-3xl mx-auto">
              <div className="space-y-2">
                <div className="text-4xl md:text-5xl font-bold text-black">95%</div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl md:text-5xl font-bold text-black">5x</div>
                <div className="text-sm text-gray-600">Faster Applications</div>
              </div>
              <div className="space-y-2">
                <div className="text-4xl md:text-5xl font-bold text-black">1000+</div>
                <div className="text-sm text-gray-600">Happy Users</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 bg-gradient-to-b from-white via-gray-50 to-brand-secondary-50">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-black">Everything You Need to Succeed</h2>
            <p className="text-xl text-gray-600">Powerful features designed to streamline your job search and maximize your success rate</p>
          </div>

          {/* Feature Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl border border-brand-secondary-100 hover:border-brand-secondary-600 transition-all group hover:shadow-xl">
              <div className="w-14 h-14 bg-brand-secondary-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Brain className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-black mb-3">AI Job Analysis</h3>
              <p className="text-gray-600 leading-relaxed">Intelligent extraction of requirements from any job posting with multimodal support</p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl border border-brand-secondary-100 hover:border-brand-secondary-600 transition-all group hover:shadow-xl">
              <div className="w-14 h-14 bg-brand-secondary-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileText className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-black mb-3">Auto-Generate Materials</h3>
              <p className="text-gray-600 leading-relaxed">Tailored CVs, cover letters, and outreach emails generated in seconds using Gemini AI</p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl border border-brand-secondary-100 hover:border-brand-secondary-600 transition-all group hover:shadow-xl">
              <div className="w-14 h-14 bg-brand-secondary-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-black mb-3">ATS Optimized</h3>
              <p className="text-gray-600 leading-relaxed">Every document crafted to pass Applicant Tracking Systems with single-column format</p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white p-8 rounded-2xl border border-brand-secondary-100 hover:border-brand-secondary-600 transition-all group hover:shadow-xl">
              <div className="w-14 h-14 bg-brand-secondary-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Send className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-black mb-3">Gmail Integration</h3>
              <p className="text-gray-600 leading-relaxed">Direct application submission via Gmail OAuth2 with PDF attachments</p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white p-8 rounded-2xl border border-brand-secondary-100 hover:border-brand-secondary-600 transition-all group hover:shadow-xl">
              <div className="w-14 h-14 bg-brand-secondary-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-black mb-3">Master Profile</h3>
              <p className="text-gray-600 leading-relaxed">Centralized profile management for consistent, personalized applications</p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white p-8 rounded-2xl border border-brand-secondary-100 hover:border-brand-secondary-600 transition-all group hover:shadow-xl">
              <div className="w-14 h-14 bg-brand-secondary-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="text-white" size={28} />
              </div>
              <h3 className="text-xl font-bold text-black mb-3">Track Applications</h3>
              <p className="text-gray-600 leading-relaxed">Monitor status and manage all applications in one unified dashboard</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-black">How It Works</h2>
            <p className="text-xl text-gray-600">Get started in minutes and land your dream job in days</p>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Step 1 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-brand-secondary-700 text-white rounded-full flex items-center justify-center text-2xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-bold text-black">Build Your Profile</h3>
                <p className="text-gray-600">Create your master profile once. We'll use it to personalize every application.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-brand-secondary-700 text-white rounded-full flex items-center justify-center text-2xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-bold text-black">Extract Job Details</h3>
                <p className="text-gray-600">Paste any job URL or upload a screenshot. Our AI extracts all requirements instantly.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-brand-secondary-700 text-white rounded-full flex items-center justify-center text-2xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-bold text-black">Generate Documents</h3>
                <p className="text-gray-600">AI creates tailored CVs and cover letters optimized for each specific role.</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-brand-secondary-700 text-white rounded-full flex items-center justify-center text-2xl font-bold">
                  4
                </div>
                <h3 className="text-xl font-bold text-black">Apply via Gmail</h3>
                <p className="text-gray-600">Review and send applications directly from your Gmail with one click.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-black text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-24 right-0 w-72 h-72 bg-brand-secondary-500/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 left-0 w-72 h-72 bg-brand-secondary-600/25 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-6xl font-display font-bold leading-tight">Ready to Land Your Dream Job?</h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">Join 1000+ professionals who've transformed their job search with AI-powered automation</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/auth/signup" className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black rounded-lg font-semibold hover:bg-gray-100 transition-all shadow-lg hover:shadow-brand-secondary-300/40">
              Get Started Free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/contact" className="inline-flex items-center justify-center px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-black transition-all">
              Talk to Sales
            </Link>
          </div>
          <div className="flex items-center justify-center gap-8 pt-8 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Free forever plan</span>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
