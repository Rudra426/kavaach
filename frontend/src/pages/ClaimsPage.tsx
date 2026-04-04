import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getClaimsForRider } from '../lib/api'
import type { ClaimListItem, Tier } from '../types/api'
import { formatDate, formatINR } from '../lib/format'
import { RouteTransition } from '../components/layout/RouteTransition'
import { SkeletonBlock } from '../components/ui/SkeletonBlock'
import { TierBadge } from '../components/ui/TierBadge'
import { EmptyState } from '../components/ui/EmptyState'
import { BottomNav } from '../components/navigation/BottomNav'

export function ClaimsPage() {
  const [searchParams] = useSearchParams()
  const riderId = searchParams.get('rider_id') ?? localStorage.getItem('kavaach_rider_id') ?? ''

  const [claims, setClaims] = useState<ClaimListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tierFilter, setTierFilter] = useState<'ALL' | Tier>('ALL')

  useEffect(() => {
    if (!riderId) {
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const result = await getClaimsForRider(riderId)
        setClaims(result)
      } catch (error) {
        toast.error('Failed to load claims history')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [riderId])

  const filteredClaims = useMemo(() => {
    if (tierFilter === 'ALL') {
      return claims
    }
    return claims.filter((claim) => claim.tier === tierFilter)
  }, [claims, tierFilter])

  return (
    <RouteTransition className="min-h-screen bg-bg px-4 pb-24 pt-6 md:px-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-3xl text-primary">Claims History</h1>

        <div className="mt-4 flex flex-wrap gap-2">
          {(['ALL', 'GREEN', 'YELLOW', 'RED'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setTierFilter(tier)}
              className={`rounded-full border px-4 py-2 text-sm ${
                tierFilter === tier ? 'border-primary bg-primary text-white' : 'border-border bg-white text-text'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-5 space-y-3">
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
          </div>
        ) : filteredClaims.length === 0 ? (
          <div className="mt-5">
            <EmptyState title="No claims yet" description="When weather trigger events happen, claims will show up here automatically." />
          </div>
        ) : (
          <ul className="mt-5 space-y-3">
            {filteredClaims.map((claim) => (
              <li key={claim.id} className="card">
                <Link to={`/claim/${claim.id}`} className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-text">Claim #{claim.id}</p>
                    <p className="text-sm text-muted">
                      {formatDate(claim.created_at)} · Paid {formatINR(claim.payout_amount)} · Held {formatINR(claim.held_amount)}
                    </p>
                  </div>
                  <TierBadge tier={claim.tier} pulse={claim.status !== 'paid'} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <BottomNav />
    </RouteTransition>
  )
}
