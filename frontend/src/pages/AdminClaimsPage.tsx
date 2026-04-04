import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import toast from 'react-hot-toast'
import { approveClaim, getAdminClaims, rejectClaim } from '../lib/api'
import type { ClaimListItem } from '../types/api'
import { formatDate, formatINR } from '../lib/format'
import { RouteTransition } from '../components/layout/RouteTransition'
import { AdminSidebar } from '../components/navigation/AdminSidebar'
import { SkeletonBlock } from '../components/ui/SkeletonBlock'
import { TierBadge } from '../components/ui/TierBadge'

export function AdminClaimsPage() {
  const [claims, setClaims] = useState<ClaimListItem[]>([])
  const [loading, setLoading] = useState(true)
  const rowsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const result = await getAdminClaims()
        setClaims(result)
      } catch (error) {
        toast.error('Unable to load claims queue')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('[data-queue-row]', {
        opacity: 0,
        y: 10,
        stagger: 0.04,
        duration: 0.26,
        ease: 'power2.out',
      })
    }, rowsRef)

    return () => {
      ctx.revert()
    }
  }, [claims])

  const handleAction = async (claimId: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await approveClaim(claimId)
      } else {
        await rejectClaim(claimId)
      }

      gsap.to(`[data-queue-row=\"${claimId}\"]`, {
        x: 28,
        opacity: 0,
        duration: 0.24,
        onComplete: () => {
          setClaims((prev) => prev.filter((claim) => claim.id !== claimId))
        },
      })
      toast.success(`Claim ${action}d`)
    } catch (error) {
      toast.error(`Could not ${action} claim`)    }
  }

  return (
    <RouteTransition className="min-h-screen bg-bg px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-7xl gap-4">
        <AdminSidebar />

        <div className="w-full">
          <h1 className="font-display text-3xl text-primary">Admin Claims Queue</h1>

          {loading ? (
            <div className="mt-4 space-y-3">
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
              <SkeletonBlock className="h-16" />
            </div>
          ) : (
            <div ref={rowsRef} className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface p-4">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="py-2 pr-3">Claim</th>
                    <th className="py-2 pr-3">Rider</th>
                    <th className="py-2 pr-3">Tier</th>
                    <th className="py-2 pr-3">Fraud</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((claim) => (
                    <tr key={claim.id} data-queue-row={claim.id} className="border-b border-border/70">
                      <td className="py-3 pr-3 font-mono">{claim.id}</td>
                      <td className="py-3 pr-3 font-mono">{claim.rider_id}</td>
                      <td className="py-3 pr-3">
                        <TierBadge tier={claim.tier} />
                      </td>
                      <td className="py-3 pr-3">{claim.fraud_score}</td>
                      <td className="py-3 pr-3">{formatINR(claim.payout_amount + claim.held_amount)}</td>
                      <td className="py-3 pr-3">{formatDate(claim.created_at)}</td>
                      <td className="py-3">
                        {claim.tier === 'GREEN' ? (
                          <span className="text-muted">Auto</span>
                        ) : (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => handleAction(claim.id, 'approve')} className="rounded-lg bg-accent2 px-3 py-1 text-white">
                              Approve
                            </button>
                            <button type="button" onClick={() => handleAction(claim.id, 'reject')} className="rounded-lg bg-danger px-3 py-1 text-white">
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RouteTransition>
  )
}
