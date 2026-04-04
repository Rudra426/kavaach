import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getClaim } from '../lib/api'
import type { ClaimDetail } from '../types/api'
import { formatDate, formatINR } from '../lib/format'
import { RouteTransition } from '../components/layout/RouteTransition'
import { SkeletonBlock } from '../components/ui/SkeletonBlock'
import { TierBadge } from '../components/ui/TierBadge'

export function ClaimDetailPage() {
  const { claim_id } = useParams()
  const [claim, setClaim] = useState<ClaimDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!claim_id) {
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const data = await getClaim(claim_id)
        setClaim(data)
      } catch (error) {
        toast.error('Unable to load claim detail')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [claim_id])

  const scorePercent = useMemo(() => {
    if (!claim) {
      return 0
    }
    return Math.max(0, Math.min(100, claim.fraud_score))
  }, [claim])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg px-4 py-8 md:px-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-24" />
          <SkeletonBlock className="h-44" />
        </div>
      </div>
    )
  }

  if (!claim) {
    return (
      <RouteTransition className="min-h-screen bg-bg px-4 py-8 md:px-8">
        <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-6 text-muted">Claim not found.</div>
      </RouteTransition>
    )
  }

  return (
    <RouteTransition className="min-h-screen bg-bg px-4 py-8 md:px-8">
      <div className="mx-auto max-w-3xl space-y-4">
        <header className="card">
          <p className="font-mono text-sm text-muted">Claim ID: {claim.claim_id}</p>
          <h1 className="mt-2 font-display text-3xl text-primary">{claim.trigger.type?.toUpperCase() ?? 'PARAMETRIC'} Event Claim</h1>
          <p className="text-sm text-muted">Filed on {formatDate(claim.created_at)}</p>
        </header>

        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-text">Fraud tier analysis</h2>
            <TierBadge tier={claim.tier} pulse={claim.status !== 'paid'} />
          </div>
          <div className="mt-4">
            <div className="relative h-2 rounded-full bg-border">
              <div className="h-full rounded-full bg-primary" style={{ width: `${scorePercent}%` }} />
              <span className="absolute -top-7 text-xs text-muted" style={{ left: `calc(${scorePercent}% - 12px)` }}>
                ●
              </span>
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted">
              <span>0</span>
              <span>100</span>
            </div>
            <p className="mt-3 text-sm text-text">
              Your fraud score: <strong>{claim.fraud_score}</strong> - {claim.tier_explanation}
            </p>
          </div>
        </section>

        <section className="card">
          <h2 className="font-display text-2xl text-text">Payout breakdown</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Total claim</dt>
              <dd className="font-mono">{formatINR(claim.payout_amount + claim.held_amount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Immediate released</dt>
              <dd className="font-mono">{formatINR(claim.payout_amount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Held amount</dt>
              <dd className="font-mono">{formatINR(claim.held_amount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">UPI transfer status</dt>
              <dd>
                <span className={claim.status.includes('paid') ? 'badge-green' : 'badge-yellow'}>
                  {claim.status.includes('paid') ? 'SUCCESS' : 'PENDING'}
                </span>
              </dd>
            </div>
          </dl>
        </section>

        {(claim.tier === 'YELLOW' || claim.tier === 'RED') && (
          <section className="card border-l-4 border-l-warning">
            <h2 className="font-display text-2xl text-text">ServiceNow review</h2>
            <p className="mt-2 text-sm text-muted">Ticket ID</p>
            <p className="font-mono text-base text-text">{claim.servicenow_ticket ?? 'Pending assignment'}</p>
            <p className="mt-2 text-sm text-muted">Our team reviews within 24 hours.</p>
          </section>
        )}
      </div>
    </RouteTransition>
  )
}
