'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Mail, Phone, MapPin, Send, MessageSquare, Zap, Heart, HelpCircle } from 'lucide-react'

export default function Contact() {
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormState({
      ...formState,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => {
      setSubmitted(false)
      setFormState({ name: '', email: '', subject: '', message: '' })
    }, 3000)
  }

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
            💬 We'd Love to Hear From You
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-display font-black bg-gradient-brand bg-clip-text text-transparent leading-tight">
            Get in Touch
          </h1>
          <p className="text-lg sm:text-xl text-brand-text-muted max-w-2xl mx-auto">
            Have questions? We're here to help. Reach out anytime!
          </p>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-16 sm:py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 sm:gap-8 mb-12">
            {[
              { icon: Mail, label: 'Email', value: 'hello@tryleai.com', desc: 'Drop us a line' },
              { icon: Phone, label: 'Phone', value: '+254 701 234 567', desc: 'Call us during business hours' },
              { icon: MapPin, label: 'Location', value: 'Nairobi, Kenya', desc: 'East Africa Hub' }
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <div key={i} className="card-dark p-6 sm:p-8 space-y-4 group hover:border-brand-primary/50 transition-colors">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="text-white" size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{item.label}</h3>
                    <p className="text-sm text-brand-text-muted mb-2">{item.desc}</p>
                    <p className="text-lg font-semibold text-brand-primary">{item.value}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>
      <section className="py-20 px-4 bg-gradient-dark bg-gradient-mesh">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-display font-bold">Get in Touch</h1>
          <p className="text-xl text-brand-text-muted">We'd love to hear from you. Send us a message!</p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div className="space-y-8">
            <h2 className="text-3xl font-display font-bold">Contact Information</h2>
            
            <div className="space-y-6">
              {/* Email */}
              <div className="card-dark p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center">
                    <Mail className="text-brand-primary" size={24} />
                  </div>
                  <h3 className="text-lg font-semibold">Email</h3>
                </div>
                <p className="text-brand-text-muted">hello@tryleai.com</p>
                <a href="mailto:hello@tryleai.com" className="text-sm text-brand-primary hover:text-brand-primary-light transition">
                  Send us an email
                </a>
              </div>

              {/* Phone */}
              <div className="card-dark p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center">
                    <Phone className="text-brand-primary" size={24} />
                  </div>
                  <h3 className="text-lg font-semibold">Phone</h3>
                </div>
                <p className="text-brand-text-muted">+254 XXX XXX XXX</p>
                <p className="text-xs text-brand-text-muted">Available Mon-Fri, 9AM-5PM EAT</p>
              </div>

              {/* Location */}
              <div className="card-dark p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center">
                    <MapPin className="text-brand-primary" size={24} />
                  </div>
                  <h3 className="text-lg font-semibold">Location</h3>
                </div>
                <p className="text-brand-text-muted">Nairobi, Kenya</p>
                <p className="text-xs text-brand-text-muted">We're based in Kenya serving Africa and beyond</p>
              </div>
            </div>

            {/* Response Time */}
            <div className="bg-brand-primary/10 border border-brand-dark-border rounded-lg p-6 space-y-3">
              <h4 className="font-semibold">Response Time</h4>
              <p className="text-sm text-brand-text-muted">
                We typically respond to all inquiries within 24 hours. For urgent matters, email us with "URGENT" in the subject line.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="card-dark p-8 space-y-6">
            <h2 className="text-3xl font-display font-bold">Send us a Message</h2>
            
            {submitted ? (
              <div className="space-y-4 py-8">
                <div className="text-4xl text-center">✅</div>
                <h3 className="text-xl font-semibold text-center">Message Sent!</h3>
                <p className="text-center text-brand-text-muted">
                  Thank you for reaching out. We'll get back to you shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formState.name}
                    onChange={handleChange}
                    required
                    placeholder="Your name"
                    className="w-full px-4 py-3 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formState.email}
                    onChange={handleChange}
                    required
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Subject</label>
                  <input
                    type="text"
                    name="subject"
                    value={formState.subject}
                    onChange={handleChange}
                    required
                    placeholder="How can we help?"
                    className="w-full px-4 py-3 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary transition"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Message</label>
                  <textarea
                    name="message"
                    value={formState.message}
                    onChange={handleChange}
                    required
                    placeholder="Tell us more..."
                    rows={5}
                    className="w-full px-4 py-3 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text placeholder-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary transition resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="w-full py-3 bg-gradient-brand text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-brand-primary/40 transition"
                >
                  Send Message <Send size={18} />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-brand-dark-border py-12 px-4">
        <div className="max-w-6xl mx-auto text-center text-sm text-brand-text-muted">
          <p>&copy; 2026 LeAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
