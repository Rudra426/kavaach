import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import toast from 'react-hot-toast'
import { CheckCircle2, Shield, CloudRain, CalendarClock } from 'lucide-react'
import { predictPremium, registerRider } from '../lib/api'
import { formatINR } from '../lib/format'
import { setSession } from '../lib/session'
import type { PremiumQuote } from '../types/api'
import { RouteTransition } from '../components/layout/RouteTransition'
import { SkeletonBlock } from '../components/ui/SkeletonBlock'

const steps = ['Basic Info', 'Delivery Profile', 'UPI & Review']

const cityOptions = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Pune',
  'Chennai', 'Ahmedabad', 'Vadodara', 'Surat', 'Jaipur', 'Other',
]

// ── Pharma delivery platforms only — matches backend PLATFORM_ENC ─────────────
const platformOptions = [
  { label: 'PharmEasy',       value: 'pharmeasy' },
  { label: 'Netmeds',         value: 'netmeds' },
  { label: 'Tata 1mg',        value: 'tata1mg' },
  { label: 'Apollo 24×7',     value: 'apollo24x7' },
  { label: 'PhonePe Health',  value: 'phonepe' },
]

const medicineTypeOptions = [
  { label: 'Regular / OTC',          value: 'regular_cold' },
  { label: 'Insulin / Injectables',  value: 'insulin' },
  { label: 'Vaccines',               value: 'vaccine' },
  { label: 'Biologics',              value: 'biologic' },
]

const MIN_WEEKLY_EARNINGS  = 2000
const MAX_WEEKLY_EARNINGS  = 15000
const MIN_AVG_DELIVERIES   = 1
const MAX_AVG_DELIVERIES   = 30
const MIN_EXPERIENCE_YEARS = 0
const MAX_EXPERIENCE_YEARS = 20

type DeliveryType = 'hyperlocal' | 'same_day' | 'scheduled'

interface ConsentState {
  policy_issuance?: boolean
  location_use?: boolean
  fraud_scoring?: boolean
  notifications?: boolean
  timestamp?: string
}

interface RegisterLocationState {
  startStep?: number
  consent?: ConsentState
  prefill?: {
    name?: string
    phone?: string
    city?: string
    pincode?: string
  }
}

export function RegisterPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state as RegisterLocationState | null) ?? {}

  const initialStep = Math.min(Math.max(state.startStep ?? 1, 1), 3)
  const consentData  = state.consent ?? null  // Phase 3 — DPDP consent from ConsentPage

  const [step, setStep]           = useState(initialStep)
  const [otpSent, setOtpSent]     = useState(initialStep > 1)
  const [otpVerified, setOtpVerified] = useState(initialStep > 1)

  const [name,    setName]    = useState(state.prefill?.name    ?? '')
  const [phone,   setPhone]   = useState(state.prefill?.phone   ?? '')
  const [city,    setCity]    = useState(state.prefill?.city    ?? 'Mumbai')
  const [pincode, setPincode] = useState(state.prefill?.pincode ?? '')

  // Default platform changed to 'pharmeasy' — NOT food delivery apps
  const [platforms,     setPlatforms]     = useState<string[]>(['pharmeasy'])
  const [deliveryType,  setDeliveryType]  = useState<DeliveryType>('hyperlocal')
  const [weeklyEarnings,  setWeeklyEarnings]  = useState(6200)
  const [coldChain,     setColdChain]     = useState(false)
  const [medicineType,  setMedicineType]  = useState('regular_cold')
  const [experienceYears, setExperienceYears] = useState(1)
  const [avgDeliveries, setAvgDeliveries] = useState(12)

  const [upiId,        setUpiId]        = useState('')
  const [quote,        setQuote]        = useState<PremiumQuote | null>(null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [submitting,   setSubmitting]   = useState(false)

  const panelRef    = useRef<HTMLDivElement | null>(null)
  const progressRef = useRef<HTMLDivElement | null>(null)

  const progressPercent = useMemo(() => ((step - 1) / (steps.length - 1)) * 100, [step])

  const safeWeeklyEarnings = useMemo(
    () => Math.min(MAX_WEEKLY_EARNINGS, Math.max(MIN_WEEKLY_EARNINGS, Number(weeklyEarnings) || 0)),
    [weeklyEarnings],
  )
  const safeExperienceYears = useMemo(
    () => Math.min(MAX_EXPERIENCE_YEARS, Math.max(MIN_EXPERIENCE_YEARS, Number(experienceYears) || 0)),
    [experienceYears],
  )
  const safeAvgDeliveries = useMemo(
    () => Math.min(MAX_AVG_DELIVERIES, Math.max(MIN_AVG_DELIVERIES, Number(avgDeliveries) || 0)),
    [avgDeliveries],
  )

  // Derive medicine_type: if cold chain toggle off, use 'regular_cold'
  const resolvedMedicineType = coldChain ? medicineType : 'regular_cold'

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(panelRef.current, { x: 28, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: 'power2.out' })
      gsap.to(progressRef.current, { width: `${progressPercent}%`, duration: 0.42, ease: 'power2.out' })
    }, panelRef)
    return () => { ctx.revert() }
  }, [step, progressPercent])

  useEffect(() => {
    if (step < 2 || pincode.length !== 6) return

    const timeout = window.setTimeout(async () => {
      setLoadingQuote(true)
      try {
        const next = await predictPremium({
          pincode,
          weekly_earnings:        safeWeeklyEarnings,
          platforms,
          delivery_type:          deliveryType,
          cold_chain:             coldChain,
          medicine_type:          resolvedMedicineType,
          experience_years:       safeExperienceYears,
          avg_deliveries_per_day: safeAvgDeliveries,
          no_claim_weeks:         0,
        })
        setQuote(next)
      } catch {
        setQuote(null)
      } finally {
        setLoadingQuote(false)
      }
    }, 500)

    return () => { window.clearTimeout(timeout) }
  }, [step, pincode, safeWeeklyEarnings, platforms, deliveryType, coldChain, resolvedMedicineType, safeExperienceYears, safeAvgDeliveries])

  const togglePlatform = (value: string) => {
    setPlatforms((prev) => {
      if (prev.includes(value)) {
        return prev.length === 1 ? prev : prev.filter((v) => v !== value)
      }
      return [...prev, value]
    })
  }

  const sendOtp = () => {
    if (phone.length < 10) { toast.error('Enter valid phone number'); return }
    setOtpSent(true)
    toast.success('OTP sent (mock): 123456')
  }

  const verifyOtp = () => {
    setOtpVerified(true)
    toast.success('Phone verified')
  }

  const nextStep = () => {
    if (step === 1) {
      if (!name || phone.length < 10 || pincode.length !== 6) {
        toast.error('Please complete basic details')
        return
      }
      if (!otpSent)     { sendOtp();   return }
      if (!otpVerified) { verifyOtp() }
    }
    setStep((prev) => Math.min(prev + 1, 3))
  }

  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1))

  const activatePolicy = async () => {
    if (!upiId.includes('@')) { toast.error('Enter valid UPI ID'); return }

    try {
      setSubmitting(true)
      const result = await registerRider({
        name,
        phone,
        upi_id:                 upiId,
        pincode,
        platforms,
        delivery_type:          deliveryType,
        weekly_earnings:        safeWeeklyEarnings,
        experience_years:       safeExperienceYears,
        cold_chain:             coldChain,
        medicine_type:          resolvedMedicineType,
        avg_deliveries_per_day: safeAvgDeliveries,
        consent:                consentData,   // Phase 3 — DPDP consent forwarded to backend
      })

      setSession(result.rider_id, phone)
      toast.success('Policy activated successfully')
      navigate(`/dashboard/${result.rider_id}`)
    } catch {
      toast.error('Registration failed. Please verify details.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <RouteTransition className="min-h-screen bg-bg px-4 py-8 md:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="font-display text-3xl text-primary">Rider Onboarding</h1>
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">Step {step}/3</span>
        </div>

        <div className="mb-4 h-3 overflow-hidden rounded-full bg-white">
          <div ref={progressRef} className="h-full rounded-full bg-accent" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="mb-6 grid grid-cols-3 gap-2">
          {steps.map((label, index) => (
            <div
              key={label}
              className={`rounded-full border px-3 py-2 text-center text-xs ${
                index + 1 <= step ? 'border-primary bg-primary text-white' : 'border-border bg-white text-muted'
              }`}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Phase 3 — Consent warning banner if consent was not passed */}
        {!consentData && (
          <div className="mb-4 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-xs text-yellow-800">
            ⚠️ You skipped the consent page. Your data preferences will not be recorded.{' '}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => navigate('/consent', { state: { redirect: '/register' } })}
            >
              Go back to consent
            </button>
          </div>
        )}

        <div ref={panelRef} key={step} className="card">

          {/* ── Step 1: Basic Info ───────────────────────────────────────── */}
          {step === 1 && (
            <div className="step-panel space-y-4">
              <h2 className="font-display text-2xl text-text">Basic Info</h2>

              <div>
                <label className="text-sm text-muted">Full Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input-base mt-1" placeholder="Ramesh Kumar" />
              </div>

              <div>
                <label className="text-sm text-muted">Phone Number</label>
                <div className="mt-1 flex gap-2">
                  <span className="rounded-xl bg-primary px-3 py-3 text-sm text-white">+91</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="input-base"
                    placeholder="9876543210"
                  />
                </div>
                {!otpSent ? (
                  <button type="button" onClick={sendOtp} className="mt-2 text-sm text-accent">Send OTP</button>
                ) : (
                  <button type="button" onClick={verifyOtp} className="mt-2 inline-flex items-center gap-1 text-sm text-accent2">
                    <CheckCircle2 className="h-4 w-4" /> OTP verified
                  </button>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm text-muted">City</label>
                  <select value={city} onChange={(e) => setCity(e.target.value)} className="input-base mt-1">
                    {cityOptions.map((opt) => <option key={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted">Pincode</label>
                  <input
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input-base mt-1"
                    placeholder="400063"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Delivery Profile ─────────────────────────────────── */}
          {step === 2 && (
            <div className="step-panel space-y-5">
              <h2 className="font-display text-2xl text-text">Delivery Profile</h2>

              {/* Platform — pharma apps only */}
              <div>
                <p className="text-sm text-muted">Medicine Delivery Platform <span className="text-xs text-primary">(select all that apply)</span></p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {platformOptions.map(({ label, value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => togglePlatform(value)}
                      className={`rounded-full border px-4 py-2 text-sm transition-all ${
                        platforms.includes(value)
                          ? 'border-primary bg-primary text-white'
                          : 'border-border bg-white text-text hover:border-primary/50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {platforms.length > 1 && (
                  <p className="mt-1 text-xs text-primary">Multi-platform bonus applied to premium ✓</p>
                )}
              </div>

              {/* Delivery Type */}
              <div>
                <p className="text-sm text-muted">Delivery Type</p>
                <div className="mt-2 grid gap-3 md:grid-cols-3">
                  {[
                    { type: 'hyperlocal' as DeliveryType, icon: Shield,       label: 'Hyperlocal',  sub: '< 5 km radius' },
                    { type: 'same_day'   as DeliveryType, icon: CloudRain,    label: 'Same-Day',    sub: 'within 24 hrs' },
                    { type: 'scheduled'  as DeliveryType, icon: CalendarClock, label: 'Scheduled',  sub: 'advance orders' },
                  ].map(({ type, icon: Icon, label, sub }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setDeliveryType(type)}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        deliveryType === type
                          ? 'border-primary bg-[rgba(26,58,42,0.08)]'
                          : 'border-border bg-white hover:border-primary/40'
                      }`}
                    >
                      <Icon className="h-5 w-5 text-primary" />
                      <p className="mt-2 font-medium text-sm">{label}</p>
                      <p className="text-xs text-muted">{sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Weekly Earnings */}
              <div>
                <p className="text-sm text-muted">Weekly earnings: <strong>{formatINR(safeWeeklyEarnings)}</strong></p>
                <input
                  type="range"
                  min={MIN_WEEKLY_EARNINGS}
                  max={MAX_WEEKLY_EARNINGS}
                  step={100}
                  value={safeWeeklyEarnings}
                  onChange={(e) => setWeeklyEarnings(Number(e.target.value) || MIN_WEEKLY_EARNINGS)}
                  className="mt-2 w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted mt-1">
                  <span>{formatINR(MIN_WEEKLY_EARNINGS)}</span>
                  <span>{formatINR(MAX_WEEKLY_EARNINGS)}</span>
                </div>
              </div>

              {/* Experience + Avg Deliveries */}
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted">Experience (years)</p>
                  <input
                    type="number" min={MIN_EXPERIENCE_YEARS} max={MAX_EXPERIENCE_YEARS} step={0.5}
                    value={safeExperienceYears}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      setExperienceYears(Math.min(MAX_EXPERIENCE_YEARS, Math.max(MIN_EXPERIENCE_YEARS, Number.isFinite(n) ? n : 0)))
                    }}
                    className="input-base mt-1"
                  />
                </div>
                <div>
                  <p className="text-sm text-muted">Avg deliveries / day</p>
                  <input
                    type="number" min={MIN_AVG_DELIVERIES} max={MAX_AVG_DELIVERIES}
                    value={safeAvgDeliveries}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      setAvgDeliveries(Math.min(MAX_AVG_DELIVERIES, Math.max(MIN_AVG_DELIVERIES, Number.isFinite(n) ? n : MIN_AVG_DELIVERIES)))
                    }}
                    className="input-base mt-1"
                  />
                </div>
              </div>

              {/* Cold Chain toggle */}
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-white p-3">
                <div>
                  <span className="text-sm font-medium text-text">Cold-chain deliveries</span>
                  <p className="text-xs text-muted">Insulin, vaccines, biologics — higher coverage</p>
                </div>
                <input
                  type="checkbox" checked={coldChain}
                  onChange={(e) => setColdChain(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
              </label>

              {/* Medicine Type — only visible if cold chain is on */}
              {coldChain && (
                <div>
                  <p className="text-sm text-muted">Medicine Type</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {medicineTypeOptions.map(({ label, value }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setMedicineType(value)}
                        className={`rounded-xl border px-3 py-2 text-sm text-left transition-all ${
                          medicineType === value
                            ? 'border-primary bg-[rgba(26,58,42,0.08)] font-semibold text-primary'
                            : 'border-border bg-white text-text hover:border-primary/40'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Premium estimate */}
              <div className="rounded-xl bg-[rgba(232,115,42,0.09)] p-3 text-sm text-text">
                Estimated weekly premium:{' '}
                <strong>{quote ? formatINR(quote.weekly_premium) : loadingQuote ? 'calculating...' : 'enter pincode first'}</strong>
              </div>
            </div>
          )}

          {/* ── Step 3: UPI & Review ─────────────────────────────────────── */}
          {step === 3 && (
            <div className="step-panel space-y-4">
              <h2 className="font-display text-2xl text-text">UPI & Review</h2>

              <div>
                <label className="text-sm text-muted">UPI ID</label>
                <input
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="input-base mt-1"
                  placeholder="rahul@ybl"
                />
                <p className="mt-1 text-xs text-muted">Weekly premium will be auto-deducted via UPI</p>
              </div>

              {loadingQuote ? (
                <div className="space-y-2">
                  <SkeletonBlock className="h-16" />
                  <SkeletonBlock className="h-16" />
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-white p-4">
                  <h3 className="font-display text-lg text-primary">Policy Summary</h3>
                  <dl className="mt-3 space-y-2 text-sm">
                    {[
                      ['Name',            name],
                      ['City Zone',       quote?.city || city],
                      ['Platform(s)',     platforms.map((p) => platformOptions.find((o) => o.value === p)?.label ?? p).join(', ')],
                      ['Delivery Type',   deliveryType.replace('_', '-')],
                      ['Cold Chain',      coldChain ? `Yes — ${medicineTypeOptions.find((o) => o.value === medicineType)?.label}` : 'No'],
                      ['Weekly Premium',  quote ? formatINR(quote.weekly_premium) : 'N/A'],
                      ['Coverage Amount', quote ? formatINR(quote.coverage_amount) : 'N/A'],
                      ['Risk Tier',       quote?.risk_level ?? 'Medium'],
                    ].map(([dt, dd]) => (
                      <div key={dt} className="flex justify-between">
                        <dt className="text-muted">{dt}</dt>
                        <dd className="font-mono text-right max-w-[55%]">{dd}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              {/* Phase 3 — Consent confirmation */}
              {consentData && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs text-primary">
                  ✓ Consent recorded at{' '}
                  {consentData.timestamp
                    ? new Date(consentData.timestamp).toLocaleTimeString('en-IN')
                    : 'session start'}{' '}
                  — DPDP Act 2023 compliant
                </div>
              )}

              <div className="rounded-xl bg-surface-offset border border-border px-4 py-3 text-xs text-muted leading-relaxed">
                By activating, you agree to Kavaach's{' '}
                <a href="/key-facts" className="underline text-primary">Key Facts Statement</a>,{' '}
                <a href="/privacy-notice" className="underline text-primary">Privacy Notice</a>, and{' '}
                30-day free look period. Coverage is for income loss only — not health, life, or vehicle damage.
              </div>
            </div>
          )}

          {/* ── Navigation ───────────────────────────────────────────────── */}
          <div className="mt-6 flex items-center justify-between gap-3">
            <button type="button" onClick={prevStep} disabled={step === 1} className="btn-ghost disabled:opacity-40">
              Back
            </button>
            {step < 3 ? (
              <button type="button" onClick={nextStep} className="btn-primary">Continue</button>
            ) : (
              <button type="button" onClick={activatePolicy} className="btn-primary" disabled={submitting}>
                {submitting ? 'Activating...' : 'Activate Policy'}
              </button>
            )}
          </div>
        </div>
      </div>
    </RouteTransition>
  )
}
