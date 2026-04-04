import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, CloudLightning, Flame, IndianRupee, Wallet } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import gsap from 'gsap'
import toast from 'react-hot-toast'
import { getDashboard, getRiderProfile } from '../lib/api'
import type { DashboardResponse, RiderProfile } from '../types/api'
import { formatDate, formatINR } from '../lib/format'
import { RouteTransition } from '../components/layout/RouteTransition'
import { SkeletonBlock } from '../components/ui/SkeletonBlock'
import { TierBadge } from '../components/ui/TierBadge'
import { CurrencyCounter } from '../components/ui/CurrencyCounter'
import { BottomNav } from '../components/navigation/BottomNav'
import { EmptyState } from '../components/ui/EmptyState'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  life: number
}

export function DashboardPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const riderId = id ?? ''

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [profile, setProfile] = useState<RiderProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const ringRef = useRef<SVGCircleElement | null>(null)
  const confettiRef = useRef<HTMLCanvasElement | null>(null)

  const hasGreenPayout = useMemo(
    () => (dashboard?.claims ?? []).some((claim) => claim.tier === 'GREEN' && claim.status.includes('paid')),
    [dashboard],
  )

  useEffect(() => {
    if (!riderId) {
      navigate('/login')
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const [dashboardData, profileData] = await Promise.all([getDashboard(riderId), getRiderProfile(riderId)])
        setDashboard(dashboardData)
        setProfile(profileData)
      } catch (error) {
        toast.error('Could not load dashboard')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [riderId, navigate])

  useEffect(() => {
    if (!ringRef.current || loading) {
      return
    }

    const circle = ringRef.current
    const radius = circle.r.baseVal.value
    const circumference = 2 * Math.PI * radius

    gsap.set(circle, {
      strokeDasharray: circumference,
      strokeDashoffset: circumference,
    })

    gsap.to(circle, {
      strokeDashoffset: circumference * 0.1,
      duration: 1.2,
      ease: 'power3.inOut',
    })
  }, [loading])

  useEffect(() => {
    if (!hasGreenPayout || !confettiRef.current) {
      return
    }

    const canvas = confettiRef.current
    const context = canvas.getContext('2d')
    if (!context) {
      return
    }

    const width = canvas.width
    const height = canvas.height

    const particles: Particle[] = Array.from({ length: 70 }, () => ({
      x: width / 2,
      y: 40,
      vx: (Math.random() - 0.5) * 6,
      vy: Math.random() * 4 + 2,
      size: Math.random() * 4 + 2,
      color: ['#2E7D5E', '#E8732A', '#D4A017', '#1A3A2A'][Math.floor(Math.random() * 4)],
      life: 1,
    }))

    let animationFrame = 0

    const tick = () => {
      context.clearRect(0, 0, width, height)
      particles.forEach((particle) => {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.vy += 0.06
        particle.life -= 0.015

        context.globalAlpha = Math.max(particle.life, 0)
        context.fillStyle = particle.color
        context.beginPath()
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        context.fill()
      })

      if (particles.some((particle) => particle.life > 0)) {
        animationFrame = requestAnimationFrame(tick)
      } else {
        context.clearRect(0, 0, width, height)
      }
    }

    tick()

    return () => {
      cancelAnimationFrame(animationFrame)
      context.clearRect(0, 0, width, height)
    }
  }, [hasGreenPayout])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg px-4 py-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <SkeletonBlock className="h-36" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </div>
          <SkeletonBlock className="h-48" />
        </div>
      </div>
    )
  }

  if (!dashboard || !profile) {
    return (
      <RouteTransition className="min-h-screen bg-bg px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <EmptyState title="Dashboard unavailable" description="Please login again to load your rider profile." />
        </div>
      </RouteTransition>
    )
  }

  return (
    <RouteTransition className="min-h-screen bg-bg px-4 pb-24 pt-5 md:px-8 md:pb-10">
      <canvas ref={confettiRef} width={900} height={260} className="pointer-events-none fixed left-0 top-0 z-40 h-[220px] w-full" />
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <p className="font-display text-2xl text-primary">नमस्ते, {dashboard.rider.name} 👋</p>
            <p className="text-sm text-muted">{dashboard.rider.city}</p>
          </div>
          <Link to={`/notifications/${dashboard.rider.id}`} className="relative rounded-full border border-border bg-surface p-3">
            <Bell className="h-5 w-5 text-primary" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-danger" />
          </Link>
        </header>

        <section className="overflow-hidden rounded-3xl bg-primary p-6 text-white shadow-card">
          <div className="flex flex-wrap justify-between gap-5">
            <div>
              <p className="text-sm text-white/75">Weekly Coverage</p>
              <CurrencyCounter amount={profile.policy.coverage_amount} className="mt-2 block font-display text-5xl leading-none" />
              <p className="mt-3 text-sm text-white/75">Policy status: ACTIVE · Renews in {profile.policy.days_until_due ?? 0} days</p>
            </div>
            <div className="relative h-28 w-28">
              <svg viewBox="0 0 120 120" className="h-full w-full">
                <circle cx="60" cy="60" r="45" stroke="rgba(255,255,255,0.25)" strokeWidth="10" fill="none" />
                <circle
                  ref={ringRef}
                  cx="60"
                  cy="60"
                  r="45"
                  stroke="#E8732A"
                  strokeWidth="10"
                  strokeLinecap="round"
                  fill="none"
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">0% used</span>
            </div>
          </div>
        </section>

        <section className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1">
          <article className="min-w-[220px] card">
            <p className="text-sm text-muted">Premium</p>
            <p className="mt-1 font-display text-2xl text-primary">{formatINR(dashboard.policy.weekly_premium)}/week</p>
            <p className="text-xs text-muted">Next due: {formatDate(dashboard.policy.next_payment_due)}</p>
          </article>
          <article className="min-w-[220px] card">
            <p className="text-sm text-muted">No-claim weeks</p>
            <p className="mt-1 flex items-center gap-1 font-display text-2xl text-primary">
              {dashboard.policy.no_claim_weeks}
              <Flame className="h-5 w-5 text-accent" />
            </p>
            <p className="text-xs text-muted">Discount grows till 15%</p>
          </article>
          <article className="min-w-[220px] card">
            <p className="text-sm text-muted">Total paid out</p>
            <p className="mt-1 font-display text-2xl text-primary">{formatINR(profile.stats.total_received)}</p>
            <p className="text-xs text-muted">Across {profile.stats.paid_claims} paid claims</p>
          </article>
        </section>

        {dashboard.weather_alert && (
          <section className="rounded-2xl border border-warning bg-[rgba(212,160,23,0.16)] p-4 text-sm text-text">
            <div className="flex items-center gap-2 font-semibold">
              <CloudLightning className="h-5 w-5 text-warning" />
              ⚠ Flood alert active in your area - claims processing automatically
            </div>
          </section>
        )}

        <section className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl text-primary">Recent Claims</h2>
            <Link to="/claims" className="text-sm text-accent underline">
              View all
            </Link>
          </div>
          {dashboard.claims.length === 0 ? (
            <EmptyState title="No claims yet" description="Once weather triggers are active, your claim updates will appear here." />
          ) : (
            <ul className="space-y-3">
              {dashboard.claims.map((claim) => {
                const isActive = ['pending', 'review', 'approved'].includes(claim.status)
                return (
                  <li key={claim.id} className="rounded-xl border border-border bg-bg p-3">
                    <Link to={`/claim/${claim.id}`} className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-text">{formatDate(claim.created_at)} · Trigger {claim.trigger_id}</p>
                        <p className="text-sm text-muted">
                          Amount <span className="font-mono">{formatINR(claim.payout_amount)}</span> · Status {claim.status}
                        </p>
                      </div>
                      <TierBadge tier={claim.tier} pulse={isActive} />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="card flex flex-wrap gap-3">
          <Link to={`/policy/${dashboard.rider.id}`} className="btn-ghost">
            <Wallet className="h-4 w-4" /> Policy
          </Link>
          <Link to={`/payments/${dashboard.rider.id}`} className="btn-ghost">
            <IndianRupee className="h-4 w-4" /> Payments
          </Link>
          <Link to={`/weather/${dashboard.rider.pincode}`} className="btn-ghost">
            <CloudLightning className="h-4 w-4" /> Weather
          </Link>
        </section>
      </div>
      <BottomNav />
    </RouteTransition>
  )
}
