import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getPolicy } from '../lib/api'
import type { PolicyResponse } from '../types/api'
import { formatDate, formatINR } from '../lib/format'
import { RouteTransition } from '../components/layout/RouteTransition'
import { SkeletonBlock } from '../components/ui/SkeletonBlock'
import { BottomNav } from '../components/navigation/BottomNav'

export function PolicyPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [policy, setPolicy] = useState<PolicyResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      navigate('/login')
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const data = await getPolicy(id)
        setPolicy(data)
      } catch (error) {
        toast.error('Unable to load policy details')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id, navigate])

  return (
    <RouteTransition className="min-h-screen bg-bg px-4 pb-24 pt-6 md:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl text-primary">Policy Details</h1>
        {loading ? (
          <div className="mt-4 space-y-3">
            <SkeletonBlock className="h-28" />
            <SkeletonBlock className="h-56" />
          </div>
        ) : policy ? (
          <div className="mt-4 space-y-4">
            <section className="card bg-primary text-white">
              <p className="text-sm text-white/75">Weekly Premium</p>
              <p className="mt-2 font-display text-5xl">{formatINR(policy.weekly_premium)}</p>
              <p className="mt-2 text-sm text-white/80">Coverage amount: {formatINR(policy.coverage_amount)}</p>
            </section>

            <section className="card">
              <dl className="grid gap-3 md:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted">Policy ID</dt>
                  <dd className="font-mono text-text">{policy.policy_id}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Status</dt>
                  <dd>
                    <span className="badge-green">{policy.status.toUpperCase()}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">No-claim weeks</dt>
                  <dd>{policy.no_claim_weeks}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Discount</dt>
                  <dd>{Math.min(policy.no_claim_weeks * 3, 15)}%</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Start date</dt>
                  <dd>{formatDate(policy.start_date)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted">Next due</dt>
                  <dd>{formatDate(policy.next_payment_due)}</dd>
                </div>
              </dl>
            </section>
          </div>
        ) : (
          <p className="mt-4 text-muted">No active policy found.</p>
        )}
      </div>
      <BottomNav />
    </RouteTransition>
  )
}
