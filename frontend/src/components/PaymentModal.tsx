'use client'

import { useState, useEffect } from 'react'
import { X, CheckCircle, Loader2, AlertCircle, Smartphone } from 'lucide-react'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  planType: 'paygo' | 'pro_monthly' | 'pro_annual'
  amount: number
  onSuccess?: () => void
}

interface PaymentStatus {
  status: 'pending' | 'completed' | 'failed' | 'cancelled'
  message?: string
  mpesaReceipt?: string
}

export function PaymentModal({ isOpen, onClose, planType, amount, onSuccess }: PaymentModalProps) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8000'

  // Poll payment status
  useEffect(() => {
    if (!checkoutRequestId) return

    const pollInterval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch(`${apiUrl}/api/v1/payments/status/${checkoutRequestId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const result = await response.json()
          const status = result.data.status

          if (status === 'completed') {
            setPaymentStatus({
              status: 'completed',
              message: 'Payment successful!',
              mpesaReceipt: result.data.mpesa_receipt,
            })
            clearInterval(pollInterval)
            setTimeout(() => {
              onSuccess?.()
              handleClose()
            }, 2000)
          } else if (status === 'failed' || status === 'cancelled') {
            setPaymentStatus({
              status: status as 'failed' | 'cancelled',
              message: result.data.result_desc || 'Payment failed',
            })
            clearInterval(pollInterval)
          }
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 3000) // Poll every 3 seconds

    return () => clearInterval(pollInterval)
  }, [checkoutRequestId, apiUrl, onSuccess])

  const formatPhoneNumber = (value: string): string => {
    // Remove all non-numeric characters
    let cleaned = value.replace(/\D/g, '')

    // Format to 254XXXXXXXXX
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.slice(1)
    } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
      cleaned = '254' + cleaned
    } else if (cleaned.startsWith('254')) {
      // Already formatted
    } else if (cleaned.startsWith('+254')) {
      cleaned = cleaned.slice(1)
    }

    return cleaned
  }

  const validatePhoneNumber = (phone: string): boolean => {
    const formatted = formatPhoneNumber(phone)
    // Kenya phone numbers: 254 + 9 digits (7XX or 1XX)
    return /^254[71]\d{8}$/.test(formatted)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(e.target.value)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validatePhoneNumber(phone)) {
      setError('Please enter a valid Kenyan phone number (07XX XXX XXX or 01XX XXX XXX)')
      return
    }

    setLoading(true)
    setError(null)
    setPaymentStatus({ status: 'pending', message: 'Initiating payment...' })

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${apiUrl}/api/v1/payments/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: formatPhoneNumber(phone),
          amount,
          plan_type: planType,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Payment initiation failed')
      }

      const result = await response.json()
      setCheckoutRequestId(result.data.checkout_request_id)
      setPaymentStatus({
        status: 'pending',
        message: 'Check your phone for the M-Pesa prompt and enter your PIN',
      })
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment')
      setPaymentStatus(null)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setPhone('')
    setLoading(false)
    setCheckoutRequestId(null)
    setPaymentStatus(null)
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  const planNames = {
    paygo: 'Pay-As-You-Go',
    pro_monthly: 'Pro Monthly',
    pro_annual: 'Pro Annual',
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-brand-dark border border-brand-dark-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-brand-dark-border">
          <div>
            <h3 className="text-2xl font-bold text-brand-text">M-Pesa Payment</h3>
            <p className="text-brand-text-muted mt-1">
              {planNames[planType]} - KES {amount.toLocaleString()}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-brand-text-muted hover:text-brand-text transition p-2 hover:bg-brand-dark-border rounded-lg"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Payment Status */}
          {paymentStatus && (
            <div
              className={`p-4 rounded-xl border ${
                paymentStatus.status === 'completed'
                  ? 'bg-green-500/10 border-green-500/30'
                  : paymentStatus.status === 'pending'
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-red-500/10 border-red-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                {paymentStatus.status === 'completed' && (
                  <CheckCircle className="text-green-400 flex-shrink-0" size={24} />
                )}
                {paymentStatus.status === 'pending' && (
                  <Loader2 className="text-blue-400 flex-shrink-0 animate-spin" size={24} />
                )}
                {(paymentStatus.status === 'failed' || paymentStatus.status === 'cancelled') && (
                  <AlertCircle className="text-red-400 flex-shrink-0" size={24} />
                )}
                <div className="flex-1">
                  <p
                    className={`font-medium ${
                      paymentStatus.status === 'completed'
                        ? 'text-green-400'
                        : paymentStatus.status === 'pending'
                        ? 'text-blue-400'
                        : 'text-red-400'
                    }`}
                  >
                    {paymentStatus.message}
                  </p>
                  {paymentStatus.mpesaReceipt && (
                    <p className="text-sm text-brand-text-muted mt-1">
                      Receipt: {paymentStatus.mpesaReceipt}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-red-400 flex-shrink-0" size={20} />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Payment Form */}
          {!checkoutRequestId && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-text mb-2">
                  M-Pesa Phone Number
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted">
                    <Smartphone size={20} />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="07XX XXX XXX or 01XX XXX XXX"
                    className="w-full pl-12 pr-4 py-3 bg-brand-dark border border-brand-dark-border rounded-lg text-brand-text placeholder:text-brand-text-muted focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                    disabled={loading}
                    required
                  />
                </div>
                <p className="text-xs text-brand-text-muted mt-2">
                  Enter the phone number registered with M-Pesa
                </p>
              </div>

              <div className="p-4 rounded-xl bg-brand-primary/10 border border-brand-primary/30">
                <h4 className="font-semibold text-brand-text mb-2">How it works:</h4>
                <ol className="text-sm text-brand-text-muted space-y-1 list-decimal list-inside">
                  <li>Enter your M-Pesa number</li>
                  <li>Click "Pay" to receive the STK push</li>
                  <li>Enter your M-Pesa PIN on your phone</li>
                  <li>Wait for confirmation</li>
                </ol>
              </div>

              <button
                type="submit"
                disabled={loading || !phone}
                className="w-full py-3 px-6 bg-brand-primary hover:bg-brand-primary/90 disabled:bg-brand-primary/50 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay KES ${amount.toLocaleString()}`
                )}
              </button>
            </form>
          )}

          {/* Waiting for PIN */}
          {checkoutRequestId && paymentStatus?.status === 'pending' && (
            <div className="text-center py-8 space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <Smartphone className="text-blue-400 animate-pulse" size={32} />
                </div>
              </div>
              <div>
                <p className="text-brand-text font-medium">Waiting for payment...</p>
                <p className="text-sm text-brand-text-muted mt-1">
                  Check your phone and enter your M-Pesa PIN
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-brand-dark-border p-6">
          <p className="text-xs text-center text-brand-text-muted">
            Secured by Safaricom M-Pesa. Your payment information is encrypted and secure.
          </p>
        </div>
      </div>
    </div>
  )
}
