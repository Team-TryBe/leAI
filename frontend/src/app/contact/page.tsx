"use client"

import { useState } from 'react'
import { Mail, Phone, MapPin, Send, MessageSquare, Zap, Heart, HelpCircle } from 'lucide-react'
import { SiteHeader } from '@/components/SiteHeader'
import { SiteFooter } from '@/components/SiteFooter'

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
    <div className="bg-gradient-to-br from-brand-primary/8 via-white to-brand-secondary-50 text-gray-900 overflow-hidden">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 sm:pt-40 sm:pb-20 px-4 bg-gradient-to-br from-brand-primary/12 via-white to-brand-secondary-50 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(36,37,188,0.14),transparent_45%),linear-gradient(0deg,rgba(36,37,188,0.08),transparent_60%)]" />
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,rgba(60,127,231,0.32),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(44,44,223,0.28),transparent_45%),radial-gradient(circle_at_50%_80%,rgba(28,29,137,0.18),transparent_45%)]" />
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-brand-secondary-300/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-brand-primary/22 rounded-full blur-3xl" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-secondary-100/30 to-transparent" />
        </div>
        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <button className="inline-block px-4 py-2 rounded-full bg-[#2728D2] border border-white text-sm font-semibold text-white mb-4">
            We'd Love to Hear From You
          </button>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-display font-bold text-white leading-tight">
            Get in Touch
          </h1>
          <p className="text-lg sm:text-xl text-white max-w-2xl mx-auto">
            Ask a question, report an issue, or request a demo.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 sm:py-16 px-4 bg-gradient-to-b from-black to-[#2728D2]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div className="space-y-8">
            <h2 className="text-3xl font-display font-bold text-gray-900">Contact Information</h2>
            
            <div className="space-y-6">
              {/* Email */}
              <div className="bg-white/95 p-5 rounded-xl border border-brand-primary/20 space-y-3 hover:border-brand-primary hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-primary rounded-lg flex items-center justify-center">
                    <Mail className="text-white" size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Email</h3>
                </div>
                <p className="text-gray-800">hello@tryleai.com</p>
                <a href="mailto:hello@tryleai.com" className="text-sm text-brand-primary hover:text-brand-primary-hover transition font-semibold">
                  Send us an email →
                </a>
              </div>

              {/* Phone */}
              <div className="bg-white/95 p-5 rounded-xl border border-brand-primary/20 space-y-3 hover:border-brand-primary hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-primary rounded-lg flex items-center justify-center">
                    <Phone className="text-white" size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Phone</h3>
                </div>
                <p className="text-gray-800">+254 701 234 567</p>
                <p className="text-xs text-gray-600">Available Mon-Fri, 9AM-5PM EAT</p>
              </div>

              {/* Location */}
              <div className="bg-white/95 p-5 rounded-xl border border-brand-primary/20 space-y-3 hover:border-brand-primary hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-primary rounded-lg flex items-center justify-center">
                    <MapPin className="text-white" size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Location</h3>
                </div>
                <p className="text-gray-800">Nairobi, Kenya</p>
                <p className="text-xs text-gray-600">We're based in Kenya serving Africa and beyond</p>
              </div>
            </div>

            {/* Response Time */}
            <div className="bg-brand-primary text-white rounded-xl p-5 space-y-2">
              <h4 className="font-semibold">⚡ Response Time</h4>
              <p className="text-sm text-brand-secondary-100">
                We typically respond to all inquiries within 24 hours. For urgent matters, email us with "URGENT" in the subject line.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white/95 p-6 rounded-2xl border border-brand-primary/20 shadow-lg space-y-5">
            <h2 className="text-3xl font-display font-bold text-gray-900">Send us a Message</h2>
            
            {submitted ? (
              <div className="space-y-4 py-8">
                <div className="text-4xl text-center">✅</div>
                <h3 className="text-xl font-semibold text-center text-gray-900">Message Sent!</h3>
                <p className="text-center text-gray-700">
                  Thank you for reaching out. We'll get back to you shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formState.name}
                    onChange={handleChange}
                    required
                    placeholder="Your name"
                    className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formState.email}
                    onChange={handleChange}
                    required
                    placeholder="your@email.com"
                    className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900">Subject</label>
                  <input
                    type="text"
                    name="subject"
                    value={formState.subject}
                    onChange={handleChange}
                    required
                    placeholder="How can we help?"
                    className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition"
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-900">Message</label>
                  <textarea
                    name="message"
                    value={formState.message}
                    onChange={handleChange}
                    required
                    placeholder="Tell us more..."
                    rows={4}
                    className="w-full px-4 py-2.5 bg-white border-2 border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="w-full py-3 bg-brand-primary text-white rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-brand-primary-hover hover:shadow-brand-secondary-300/40 transition-all"
                >
                  Send Message <Send size={18} />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
