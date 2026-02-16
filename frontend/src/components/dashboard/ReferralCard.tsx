'use client'

import { useState, useEffect } from 'react'
import { Copy, Check, MessageCircle, Share2, Linkedin, Heart } from 'lucide-react'
import { getAuthToken } from '@/lib/auth'
import { apiClient } from '@/lib/api'

interface ReferralStats {
  code: string
  referral_credits: number
  has_earned_reward: boolean
  total_referrals: number
  successful_referrals: number
  pending_referrals: number
  reward_earned_at: string | null
}

export function ReferralCard() {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://127.0.0.1:8000'

  useEffect(() => {
    fetchReferralStats()
  }, [])

  const fetchReferralStats = async () => {
    try {
      const token = getAuthToken()
      if (!token) return

      const response = await fetch(`${apiUrl}/api/v1/referral/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.data)
      }
    } catch (err) {
      console.error('Failed to load referral stats:', err)
      setError('Failed to load referral information')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-blue-200 rounded w-1/3"></div>
          <div className="h-8 bg-blue-200 rounded w-2/3"></div>
          <div className="h-10 bg-blue-200 rounded w-full"></div>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return null
  }

  const referralLink = `https://leai.co.ke/signup?ref=${stats.code}`
  const shareMessage = `Join me on LeAI and get a free application credit! Use my referral code: ${stats.code}`
  const shareUrl = referralLink

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(shareMessage + '\n' + referralLink)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const handleTwitterShare = () => {
    const text = encodeURIComponent(`Found this career hack on Aditus! Get 1 free job application - use my code: ${stats.code} ${shareUrl}`)
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank')
  }

  const handleLinkedInShare = () => {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`, '_blank')
  }

  const handleInstagramCopy = () => {
    handleCopyLink()
    // For Instagram, we just copy and let user share manually
    alert(`Link copied! Share it in your Instagram Story or DM.\nCode: ${stats.code}`)
  }

  return (
    <div className="space-y-4">
      {/* Reward Status */}
      <div className="referral-reward-card border-l-4 border-[#2728D2] rounded-lg p-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-black">Get 1 Free Application Credit</h3>
            <div className="text-right">
              <p className="text-3xl font-bold text-[#2728D2]">{stats.referral_credits}</p>
              <p className="text-xs text-gray-600 mt-1">Credits Earned</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="referral-progress-label">Referral Progress</span>
              <span className="font-medium text-black">
                {stats.successful_referrals}/1
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-[#2728D2] to-indigo-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(stats.successful_referrals / 1) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Status */}
          {stats.has_earned_reward ? (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              <Heart size={16} className="text-green-600" />
              <span className="text-sm font-medium">🎉 You've earned your first reward!</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
              <Heart size={16} />
              <span className="text-sm">Invite 1 friend to earn 1 free credit</span>
            </div>
          )}
        </div>
      </div>

      {/* Referral Code Section */}
      <div className="referral-code-card rounded-lg p-6 space-y-4">
        <div>
          <label className="referral-code-label text-xs font-semibold uppercase">Your Referral Code</label>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={stats.code}
              readOnly
              className="referral-code-input flex-1 px-4 py-3 rounded-lg font-mono text-lg font-bold text-[#2728D2] focus:outline-none focus:ring-2 focus:ring-[#2728D2]/30"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 py-3 bg-[#2728D2] hover:bg-[#1f20a8] text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Share Link Input */}
        <div>
          <label className="referral-code-label text-xs font-semibold uppercase">Referral Link</label>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="referral-code-input flex-1 px-4 py-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2728D2]/30 truncate"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              title="Copy link"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* Social Share Buttons */}
      <div>
        <label className="text-xs font-semibold text-gray-600 uppercase block mb-3">
          Share on Social Media
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* WhatsApp */}
          <button
            onClick={handleWhatsAppShare}
            className="flex items-center justify-center gap-2 px-3 py-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-green-700 font-medium text-sm transition-all hover:shadow-md"
            title="Share on WhatsApp"
          >
            <MessageCircle size={18} />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

          {/* Twitter */}
          <button
            onClick={handleTwitterShare}
            className="flex items-center justify-center gap-2 px-3 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 font-medium text-sm transition-all hover:shadow-md"
            title="Share on Twitter"
          >
            <Share2 size={18} />
            <span className="hidden sm:inline">Twitter</span>
          </button>

          {/* LinkedIn */}
          <button
            onClick={handleLinkedInShare}
            className="flex items-center justify-center gap-2 px-3 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-700 font-medium text-sm transition-all hover:shadow-md"
            title="Share on LinkedIn"
          >
            <Linkedin size={18} />
            <span className="hidden sm:inline">LinkedIn</span>
          </button>

          {/* Instagram */}
          <button
            onClick={handleInstagramCopy}
            className="flex items-center justify-center gap-2 px-3 py-3 bg-pink-50 hover:bg-pink-100 border border-pink-200 rounded-lg text-pink-700 font-medium text-sm transition-all hover:shadow-md"
            title="Share on Instagram"
          >
            <Heart size={18} />
            <span className="hidden sm:inline">Instagram</span>
          </button>
        </div>
      </div>

      {/* Referral Stats */}
      <div className="referral-stats-card grid grid-cols-3 gap-3 rounded-lg p-4">
        <div className="text-center">
          <p className="referral-stats-value text-2xl font-bold text-[#2728D2]">{stats.total_referrals}</p>
          <p className="referral-stats-label text-xs text-gray-600 mt-1">Total Referrals</p>
        </div>
        <div className="text-center">
          <p className="referral-stats-value text-2xl font-bold text-green-600">{stats.successful_referrals}</p>
          <p className="referral-stats-label text-xs text-gray-600 mt-1">Verified</p>
        </div>
        <div className="text-center">
          <p className="referral-stats-value text-2xl font-bold text-yellow-600">{stats.pending_referrals}</p>
          <p className="referral-stats-label text-xs text-gray-600 mt-1">Pending</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-xs text-blue-800 leading-relaxed">
          <strong>💡 How it works:</strong> Share your code with friends. When they verify their email, you both get rewards!
          Your friend gets 50% off their first month, and you get 1 free application credit.
        </p>
      </div>
    </div>
  )
}
