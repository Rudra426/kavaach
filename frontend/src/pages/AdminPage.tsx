import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import toast from 'react-hot-toast'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'
import {
  approveClaim,
  getAdminClaims,
  getAdminHeatmap,
  getAdminStats,
  rejectClaim,
} from '../lib/api'
import type { AdminHeatmapPoint, AdminStats, ClaimListItem } from '../types/api'
import { formatINR } from '../lib/format'
import { RouteTransition } from '../components/layout/RouteTransition'
import { AdminSidebar } from '../components/navigation/AdminSidebar'
import { SkeletonBlock } from '../components/ui/SkeletonBlock'
import { TierBadge } from '../components/ui/TierBadge'

function sparkData(value: number) {
  return [
    { x: 1, y: value * 0.4 },
    { x: 2, y: value * 0.7 },
    { x: 3, y: value * 0.5 },
    { x: 4, y: value * 0.9 },
    { x: 5, y: value * 0.8 },
  ]
}

export function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [claims, setClaims] = useState<ClaimListItem[]>([])
  const [heatmap, setHeatmap] = useState<AdminHeatmapPoint[]>([])
  const [loading, setLoading] = useState(true)

  const tableRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [statsData, claimsData, heatmapData] = await Promise.all([
          getAdminStats(),
          getAdminClaims(),
          getAdminHeatmap(),
        ])
        setStats(statsData)
        setClaims(claimsData.slice(0, 8))
        setHeatmap(heatmapData)
      } catch (error) {
        toast.error('Unable to load admin dashboard')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('[data-claim-row]', {
        opacity: 0,
        y: 10,
        stagger: 0.04,
        duration: 0.28,
        ease: 'power2.out',
      })
    }, tableRef)

    return () => {
      ctx.revert()
    }
  }, [claims])

  const statCards = useMemo(() => {
    if (!stats) {
      return []
    }

    return [
      { label: 'Total riders', value: stats.total_riders.toLocaleString('en-IN') },
      { label: 'Active policies', value: stats.active_policies.toLocaleString('en-IN') },
      { label: 'Claims this week', value: stats.total_claims.toLocaleString('en-IN') },
      { label: 'Payouts disbursed', value: formatINR(stats.total_paid_amount) },
    ]
  }, [stats])

  const toneForRisk = (score: number): string => {
    if (score <= 2) {
      return 'bg-[rgba(46,125,94,0.24)]'
    }
    if (score <= 3.5) {
      return 'bg-[rgba(212,160,23,0.24)]'
    }
    return 'bg-[rgba(192,57,43,0.24)]'
  }

  const handleAction = async (claimId: string, action: 'approve' | 'reject') => {
    try {
      if (action === 'approve') {
        await approveClaim(claimId)
      } else {
        await rejectClaim(claimId)
      }

      gsap.to(`[data-claim-row=\"${claimId}\"]`, {
        x: 30,
        opacity: 0,
        duration: 0.25,
        onComplete: () => {
          setClaims((prev) => prev.filter((claim) => claim.id !== claimId))
        },
      })
      toast.success(`Claim ${action}d`)
    } catch (error) {
      toast.error(`Could not ${action} claim`)
    }
  }

  return (
    <RouteTransition className="min-h-screen bg-bg px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-7xl gap-4">
        <AdminSidebar />

        <div className="w-full space-y-4">
          <h1 className="font-display text-3xl text-primary">Admin Panel</h1>

          {loading ? (
            <div className="space-y-3">
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-40" />
              <SkeletonBlock className="h-40" />
            </div>
          ) : (
            <>
              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {statCards.map((card) => (
                  <article key={card.label} className="card">
                    <p className="text-sm text-muted">{card.label}</p>
                    <p className="mt-2 font-display text-3xl text-primary">{card.value}</p>
                    <div className="mt-3 h-14">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkData(Number(String(card.value).replace(/[^0-9]/g, '') || 0))}>
                          <Area type="monotone" dataKey="y" stroke="#2E7D5E" fill="rgba(46,125,94,0.15)" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </article>
                ))}
              </section>

              <section className="card" ref={tableRef}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-display text-2xl text-text">Claims queue</h2>
                  <a href="/admin/claims" className="text-sm text-accent underline">
                    Open full queue
                  </a>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted">
                        <th className="py-2 pr-3">Rider</th>
                        <th className="py-2 pr-3">Fraud</th>
                        <th className="py-2 pr-3">Tier</th>
                        <th className="py-2 pr-3">Amount</th>
                        <th className="py-2">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claims.map((claim) => (
                        <tr key={claim.id} data-claim-row={claim.id} className="border-b border-border/70">
                          <td className="py-3 pr-3 font-mono">{claim.rider_id}</td>
                          <td className="py-3 pr-3">{claim.fraud_score}</td>
                          <td className="py-3 pr-3">
                            <TierBadge tier={claim.tier} />
                          </td>
                          <td className="py-3 pr-3">{formatINR(claim.payout_amount + claim.held_amount)}</td>
                          <td className="py-3">
                            {claim.tier === 'GREEN' ? (
                              <span className="text-muted">Auto-paid</span>
                            ) : (
                              <div className="flex gap-2">
                                <button type="button" className="rounded-lg bg-accent2 px-3 py-1 text-white" onClick={() => handleAction(claim.id, 'approve')}>
                                  Approve
                                </button>
                                <button type="button" className="rounded-lg bg-danger px-3 py-1 text-white" onClick={() => handleAction(claim.id, 'reject')}>
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
              </section>

              <section id="heatmap" className="card">
                <h2 className="font-display text-2xl text-text">Pincode heatmap</h2>
                <p className="mt-1 text-sm text-muted">Risk-level overview across covered zones</p>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                  {heatmap.slice(0, 24).map((point) => (
                    <div key={point.pincode} className={`rounded-xl border border-border p-3 ${toneForRisk(point.risk_score)}`}>
                      <p className="font-mono text-xs text-text">{point.pincode}</p>
                      <p className="mt-1 text-xs text-muted">{point.city}</p>
                      <p className="text-sm font-semibold text-text">Risk {point.risk_score}</p>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </RouteTransition>
  )
}
