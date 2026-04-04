import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getPayments, payNow, subscribePremium } from '../lib/api'
import type { PaymentResponse } from '../types/api'
import { formatDate, formatINR } from '../lib/format'
import { RouteTransition } from '../components/layout/RouteTransition'
import { SkeletonBlock } from '../components/ui/SkeletonBlock'
import { BottomNav } from '../components/navigation/BottomNav'

export function PaymentsPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [data, setData] = useState<PaymentResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      navigate('/login')
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const result = await getPayments(id)
        setData(result)
      } catch (error) {
        toast.error('Could not fetch payment history')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id, navigate])

  const handlePayNow = async () => {
    if (!id) {
      return
    }
    try {
      const result = await payNow(id)
      window.open(result.payment_link, '_blank', 'noopener,noreferrer')
      toast.success('Payment link generated')
    } catch (error) {
      toast.error('Unable to create payment link')
    }
  }

  const handleSubscribe = async () => {
    if (!id) {
      return
    }
    try {
      const result = await subscribePremium(id)
      window.open(result.payment_link, '_blank', 'noopener,noreferrer')
      toast.success('Auto-debit setup link ready')
    } catch (error) {
      toast.error('Unable to create subscription link')
    }
  }

  return (
    <RouteTransition className="min-h-screen bg-bg px-4 pb-24 pt-6 md:px-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="font-display text-3xl text-primary">Premium Payments</h1>

        {loading ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-14" />
            <SkeletonBlock className="h-14" />
          </div>
        ) : data ? (
          <>
            <section className="card bg-primary text-white">
              <p className="text-sm text-white/75">Weekly premium</p>
              <p className="mt-2 font-display text-5xl">{formatINR(data.weekly_premium)}</p>
              <p className="mt-2 text-sm text-white/80">Next due on {formatDate(data.next_due)}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={handlePayNow} className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white">
                  Pay this week
                </button>
                <button type="button" onClick={handleSubscribe} className="rounded-full border border-white/40 px-4 py-2 text-sm">
                  Enable auto-debit
                </button>
              </div>
            </section>

            <section className="card">
              <h2 className="font-display text-2xl text-text">Recent weeks</h2>
              <ul className="mt-3 space-y-2">
                {data.payments.map((payment) => (
                  <li key={payment.week} className="flex flex-wrap items-center justify-between rounded-xl border border-border bg-bg p-3 text-sm">
                    <span>Week {payment.week} · Due {formatDate(payment.due_date)}</span>
                    <span className="font-mono">{formatINR(payment.amount)}</span>
                    <span className={payment.status === 'paid' ? 'badge-green' : 'badge-yellow'}>{payment.status.toUpperCase()}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : (
          <section className="card text-muted">Payment history unavailable.</section>
        )}
      </div>
      <BottomNav />
    </RouteTransition>
  )
}
