import { useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  CloudRain,
  IndianRupee,
  ShieldCheck,
  ArrowRight,
  Shield,
  CloudLightning,
} from 'lucide-react'
import { RouteTransition } from '../components/layout/RouteTransition'

gsap.registerPlugin(ScrollTrigger)

const socialProof = '10,000+ riders protected · 23 cities · ₹4.2 Cr paid'

const statItems = [
  { label: 'Active Riders', value: 12400, prefix: '' },
  { label: 'Claims Settled', value: 6840, prefix: '' },
  { label: 'Paid Out', value: 42000000, prefix: '₹' },
]

export function LandingPage() {
  const heroWords = useMemo(() => 'Your income. Protected. Always.'.split(' '), [])
  const heroRef = useRef<HTMLHeadingElement | null>(null)
  const statsRef = useRef<HTMLDivElement | null>(null)
  const featureRef = useRef<HTMLDivElement | null>(null)
  const lineRef = useRef<SVGPathElement | null>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from('.hero-word', {
        y: 40,
        opacity: 0,
        stagger: 0.08,
        duration: 0.7,
        ease: 'power2.out',
      })

      if (lineRef.current) {
        const lineLength = lineRef.current.getTotalLength()
        gsap.set(lineRef.current, { strokeDasharray: lineLength, strokeDashoffset: lineLength })
        gsap.to(lineRef.current, {
          strokeDashoffset: 0,
          duration: 1.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: lineRef.current,
            start: 'top 85%',
            once: true,
          },
        })
      }

      gsap.from('.feature-card', {
        opacity: 0,
        y: 42,
        duration: 0.6,
        stagger: 0.14,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: featureRef.current,
          start: 'top 75%',
          once: true,
        },
      })

      statItems.forEach((item, index) => {
        const statEl = document.querySelector<HTMLDivElement>(`[data-stat-index="${index}"]`)
        if (!statEl) {
          return
        }

        const proxy = { value: 0 }
        gsap.to(proxy, {
          value: item.value,
          duration: 1.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: statsRef.current,
            start: 'top 80%',
            once: true,
          },
          onUpdate: () => {
            const rounded = Math.round(proxy.value)
            const formatted = rounded.toLocaleString('en-IN')
            statEl.textContent = `${item.prefix}${formatted}`
          },
        })
      })
    })

    return () => {
      ctx.revert()
    }
  }, [])

  return (
    <RouteTransition>
      <div className="bg-bg text-text">
        <section className="relative min-h-screen overflow-hidden bg-primary px-6 pb-20 pt-16 text-white md:px-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.12),transparent_48%)]" />
          <div className="relative mx-auto flex max-w-6xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="mb-4 inline-flex rounded-full border border-white/30 px-4 py-2 text-xs uppercase tracking-[0.16em] text-white/85">
                Parametric Income Insurance
              </p>
              <h1 ref={heroRef} className="font-display text-4xl leading-tight md:text-6xl">
                {heroWords.map((word, index) => (
                  <span key={`${word}-${index}`} className="hero-word mr-3 inline-block">
                    {word}
                  </span>
                ))}
              </h1>
              <p className="mt-5 max-w-xl text-base text-white/80 md:text-lg">
                Parametric insurance that pays before you ask. Triggered by real weather and AQI events in your pincode.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/register" className="btn-primary">
                  Get Covered
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#how-it-works" className="btn-ghost">
                  See how it works
                </a>
              </div>
              <p className="mt-10 text-sm text-white/75">{socialProof}</p>
            </div>

            <div className="relative w-full max-w-md self-end rounded-3xl bg-white p-5 text-text shadow-2xl">
              <div className="absolute -right-4 -top-4 rounded-full bg-accent2 px-3 py-1 text-xs font-semibold text-white">
                GREEN
              </div>
              <p className="text-sm text-muted">Weekly Coverage</p>
              <p className="mt-2 font-display text-4xl text-primary">₹2,400</p>
              <div className="mt-4 rounded-2xl bg-bg p-4">
                <p className="text-xs uppercase tracking-wide text-muted">Policy Status</p>
                <p className="mt-2 text-sm font-medium text-accent2">आपकी policy active है</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted">Risk Tier</span>
                  <span className="rounded-full bg-[rgba(46,125,94,0.14)] px-3 py-1 font-semibold text-accent2">Low-Medium</span>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 h-16 w-full bg-bg [clip-path:polygon(0_40%,100%_0,100%_100%,0_100%)]" />
        </section>

        <section id="how-it-works" className="px-6 py-16 md:px-12">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-3xl text-primary md:text-4xl">How Kavaach Works</h2>
            <p className="mt-3 max-w-2xl text-muted">
              Built for delivery riders with real-world triggers, simple onboarding, and rapid UPI disbursals.
            </p>

            <svg viewBox="0 0 1200 120" className="my-8 hidden w-full md:block">
              <path
                ref={lineRef}
                d="M60 60 C240 20, 360 100, 540 60 S900 20, 1140 60"
                stroke="#D4A017"
                strokeWidth="2"
                strokeDasharray="7 8"
                fill="none"
              />
            </svg>

            <div ref={featureRef} className="grid gap-4 md:grid-cols-3">
              <article className="feature-card card">
                <ShieldCheck className="h-8 w-8 text-primary" />
                <h3 className="mt-4 font-display text-xl text-text">Register in 2 mins</h3>
                <p className="mt-2 text-sm text-muted">Quick onboarding with rider profile, earnings, and pincode details.</p>
              </article>
              <article className="feature-card card">
                <CloudRain className="h-8 w-8 text-primary" />
                <h3 className="mt-4 font-display text-xl text-text">We watch weather for you</h3>
                <p className="mt-2 text-sm text-muted">Automatic trigger checks for rain, heat, AQI, and cyclones every 15 minutes.</p>
              </article>
              <article className="feature-card card">
                <IndianRupee className="h-8 w-8 text-primary" />
                <h3 className="mt-4 font-display text-xl text-text">Payout hits UPI automatically</h3>
                <p className="mt-2 text-sm text-muted">Green-tier claims are paid instantly while review tiers stay transparent.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="px-6 pb-16 md:px-12">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-display text-3xl text-primary">Claim Tier Explainer</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <article className="card border-l-4 border-l-accent2">
                <h3 className="font-display text-lg text-text">Instant Full Payout</h3>
                <p className="mt-2 text-sm text-muted">Fraud score ≤ 30. 100% transferred immediately.</p>
              </article>
              <article className="card border-l-4 border-l-warning">
                <h3 className="font-display text-lg text-text">Partial + Review</h3>
                <p className="mt-2 text-sm text-muted">60% now, 40% after quick review ticket closure.</p>
              </article>
              <article className="card border-l-4 border-l-danger">
                <h3 className="font-display text-lg text-text">Manual Review</h3>
                <p className="mt-2 text-sm text-muted">Claim investigation starts with ServiceNow incident raised.</p>
              </article>
            </div>
          </div>
        </section>

        <section ref={statsRef} className="bg-surface px-6 py-12 md:px-12">
          <div className="mx-auto grid max-w-5xl gap-4 rounded-3xl border border-border bg-bg p-6 shadow-card md:grid-cols-3">
            {statItems.map((item, index) => (
              <div key={item.label} className="rounded-2xl border border-border bg-surface p-5 text-center">
                <div data-stat-index={index} className="font-display text-3xl text-primary md:text-4xl">
                  {item.prefix}0
                </div>
                <p className="mt-2 text-sm text-muted">{item.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-primary px-6 py-10 text-white md:px-12">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-4 text-center text-sm md:text-base">
            <Shield className="h-5 w-5" />
            <span>{socialProof}</span>
            <CloudLightning className="h-5 w-5" />
          </div>
        </section>
      </div>
    </RouteTransition>
  )
}
