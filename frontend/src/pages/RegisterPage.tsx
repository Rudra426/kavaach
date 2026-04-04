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
const cityOptions = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Pune', 'Chennai', 'Jaipur', 'Other']
const platformOptions = ['Zomato', 'Swiggy', 'Blinkit', 'Dunzo', 'Multiple']

const MIN_WEEKLY_EARNINGS = 2000
const MAX_WEEKLY_EARNINGS = 15000
const MIN_AVG_DELIVERIES = 1
const MAX_AVG_DELIVERIES = 30
const MIN_EXPERIENCE_YEARS = 0
const MAX_EXPERIENCE_YEARS = 20

type DeliveryType = 'hyperlocal' | 'same_day' | 'scheduled'

interface RegisterLocationState {
  startStep?: number
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

  const [step, setStep] = useState(initialStep)
  const [otpSent, setOtpSent] = useState(initialStep > 1)
  const [otpVerified, setOtpVerified] = useState(initialStep > 1)

  const [name, setName] = useState(state.prefill?.name ?? '')
  const [phone, setPhone] = useState(state.prefill?.phone ?? '')
  const [city, setCity] = useState(state.prefill?.city ?? 'Mumbai')
  const [pincode, setPincode] = useState(state.prefill?.pincode ?? '')

  const [platforms, setPlatforms] = useState<string[]>(['Zomato'])
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('hyperlocal')
  const [weeklyEarnings, setWeeklyEarnings] = useState(6200)
  const [coldChain, setColdChain] = useState(false)
  const [experienceYears, setExperienceYears] = useState(1)
  const [avgDeliveries, setAvgDeliveries] = useState(12)

  const [upiId, setUpiId] = useState('')
  const [quote, setQuote] = useState<PremiumQuote | null>(null)
  const [loadingQuote, setLoadingQuote] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const panelRef = useRef<HTMLDivElement | null>(null)
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

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(panelRef.current, { x: 28, opacity: 0 }, { x: 0, opacity: 1, duration: 0.35, ease: 'power2.out' })
      gsap.to(progressRef.current, { width: `${progressPercent}%`, duration: 0.42, ease: 'power2.out' })
    }, panelRef)

    return () => {
      ctx.revert()
    }
  }, [step, progressPercent])

  useEffect(() => {
    if (step < 2 || pincode.length !== 6) {
      return
    }

    const timeout = window.setTimeout(async () => {
      setLoadingQuote(true)
      try {
        const next = await predictPremium({
          pincode,
          weekly_earnings: safeWeeklyEarnings,
          platforms,
          delivery_type: deliveryType,
          cold_chain: coldChain,
          medicine_type: coldChain ? 'regular_cold' : 'regular',
          experience_years: safeExperienceYears,
          avg_deliveries_per_day: safeAvgDeliveries,
          no_claim_weeks: 0,
        })
        setQuote(next)
      } catch (error) {
        setQuote(null)
      } finally {
        setLoadingQuote(false)
      }
    }, 500)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [step, pincode, safeWeeklyEarnings, platforms, deliveryType, coldChain, safeExperienceYears, safeAvgDeliveries])

  const togglePlatform = (platform: string) => {
    setPlatforms((prev) => {
      if (prev.includes(platform)) {
        if (prev.length === 1) {
          return prev
        }
        return prev.filter((value) => value !== platform)
      }
      return [...prev, platform]
    })
  }

  const sendOtp = () => {
    if (phone.length < 10) {
      toast.error('Enter valid phone number')
      return
    }
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
      if (!otpSent) {
        sendOtp()
        return
      }
      if (!otpVerified) {
        verifyOtp()
      }
    }

    setStep((prev) => Math.min(prev + 1, 3))
  }

  const prevStep = () => {
    setStep((prev) => Math.max(prev - 1, 1))
  }

  const activatePolicy = async () => {
    if (!upiId.includes('@')) {
      toast.error('Enter valid UPI ID')
      return
    }

    try {
      setSubmitting(true)
      const result = await registerRider({
        name,
        phone,
        upi_id: upiId,
        pincode,
        platforms,
        delivery_type: deliveryType,
        weekly_earnings: safeWeeklyEarnings,
        experience_years: safeExperienceYears,
        cold_chain: coldChain,
        medicine_type: coldChain ? 'regular_cold' : 'regular',
        avg_deliveries_per_day: safeAvgDeliveries,
      })

      setSession(result.rider_id, phone)
      toast.success('Policy activated successfully')
      navigate(`/dashboard/${result.rider_id}`)
    } catch (error) {
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

        <div ref={panelRef} key={step} className="card">
          {step === 1 && (
            <div className="step-panel space-y-4">
              <h2 className="font-display text-2xl text-text">Basic Info</h2>
              <div>
                <label className="text-sm text-muted">Full Name</label>
                <input value={name} onChange={(event) => setName(event.target.value)} className="input-base mt-1" />
              </div>

              <div>
                <label className="text-sm text-muted">Phone Number</label>
                <div className="mt-1 flex gap-2">
                  <span className="rounded-xl bg-primary px-3 py-3 text-sm text-white">+91</span>
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="input-base"
                    placeholder="9876543210"
                  />
                </div>
                {!otpSent ? (
                  <button type="button" onClick={sendOtp} className="mt-2 text-sm text-accent">
                    Send OTP
                  </button>
                ) : (
                  <button type="button" onClick={verifyOtp} className="mt-2 inline-flex items-center gap-1 text-sm text-accent2">
                    <CheckCircle2 className="h-4 w-4" /> OTP verified
                  </button>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-sm text-muted">City</label>
                  <select value={city} onChange={(event) => setCity(event.target.value)} className="input-base mt-1">
                    {cityOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted">Pincode</label>
                  <input
                    value={pincode}
                    onChange={(event) => setPincode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input-base mt-1"
                    placeholder="400063"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="step-panel space-y-5">
              <h2 className="font-display text-2xl text-text">Delivery Profile</h2>

              <div>
                <p className="text-sm text-muted">Platform</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {platformOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => togglePlatform(option)}
                      className={`rounded-full border px-4 py-2 text-sm ${
                        platforms.includes(option) ? 'border-primary bg-primary text-white' : 'border-border bg-white text-text'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm text-muted">Delivery Type</p>
                <div className="mt-2 grid gap-3 md:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('hyperlocal')}
                    className={`rounded-xl border p-3 text-left ${
                      deliveryType === 'hyperlocal' ? 'border-primary bg-[rgba(26,58,42,0.08)]' : 'border-border bg-white'
                    }`}
                  >
                    <Shield className="h-5 w-5 text-primary" />
                    <p className="mt-2 font-medium">Hyperlocal</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType('same_day')}
                    className={`rounded-xl border p-3 text-left ${
                      deliveryType === 'same_day' ? 'border-primary bg-[rgba(26,58,42,0.08)]' : 'border-border bg-white'
                    }`}
                  >
                    <CloudRain className="h-5 w-5 text-primary" />
                    <p className="mt-2 font-medium">Same-day</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliveryType('scheduled')}
                    className={`rounded-xl border p-3 text-left ${
                      deliveryType === 'scheduled' ? 'border-primary bg-[rgba(26,58,42,0.08)]' : 'border-border bg-white'
                    }`}
                  >
                    <CalendarClock className="h-5 w-5 text-primary" />
                    <p className="mt-2 font-medium">Scheduled</p>
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted">Weekly earnings: {formatINR(safeWeeklyEarnings)}</p>
                <input
                  type="range"
                  min={MIN_WEEKLY_EARNINGS}
                  max={MAX_WEEKLY_EARNINGS}
                  step={100}
                  value={safeWeeklyEarnings}
                  onChange={(event) => setWeeklyEarnings(Number(event.target.value) || MIN_WEEKLY_EARNINGS)}
                  className="mt-2 w-full accent-primary"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted">Experience (years)</p>
                  <input
                    type="number"
                    min={MIN_EXPERIENCE_YEARS}
                    max={MAX_EXPERIENCE_YEARS}
                    step={0.5}
                    value={safeExperienceYears}
                    onChange={(event) => {
                      const next = Number(event.target.value)
                      setExperienceYears(
                        Math.min(MAX_EXPERIENCE_YEARS, Math.max(MIN_EXPERIENCE_YEARS, Number.isFinite(next) ? next : 0)),
                      )
                    }}
                    className="input-base mt-1"
                  />
                </div>
                <div>
                  <p className="text-sm text-muted">Avg deliveries/day</p>
                  <input
                    type="number"
                    min={MIN_AVG_DELIVERIES}
                    max={MAX_AVG_DELIVERIES}
                    value={safeAvgDeliveries}
                    onChange={(event) => {
                      const next = Number(event.target.value)
                      setAvgDeliveries(
                        Math.min(MAX_AVG_DELIVERIES, Math.max(MIN_AVG_DELIVERIES, Number.isFinite(next) ? next : MIN_AVG_DELIVERIES)),
                      )
                    }}
                    className="input-base mt-1"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border bg-white p-3">
                <span className="text-sm text-text">Cold-chain deliveries</span>
                <input type="checkbox" checked={coldChain} onChange={(event) => setColdChain(event.target.checked)} className="h-4 w-4 accent-primary" />
              </label>

              <div className="rounded-xl bg-[rgba(232,115,42,0.09)] p-3 text-sm text-text">
                Your premium estimate: <strong>{quote ? formatINR(quote.weekly_premium) : loadingQuote ? 'calculating...' : 'N/A'}/week</strong>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="step-panel space-y-4">
              <h2 className="font-display text-2xl text-text">UPI & Review</h2>

              <div>
                <label className="text-sm text-muted">UPI ID</label>
                <input
                  value={upiId}
                  onChange={(event) => setUpiId(event.target.value)}
                  className="input-base mt-1"
                  placeholder="rahul@upi"
                />
              </div>

              {loadingQuote ? (
                <div className="space-y-2">
                  <SkeletonBlock className="h-16" />
                  <SkeletonBlock className="h-16" />
                </div>
              ) : (
                <div className="rounded-2xl border border-border bg-white p-4">
                  <h3 className="font-display text-lg text-primary">Summary</h3>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted">Name</dt>
                      <dd>{name}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">City Zone</dt>
                      <dd>{quote?.city || city}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">Weekly Premium</dt>
                      <dd className="font-mono">{quote ? formatINR(quote.weekly_premium) : 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">Coverage Amount</dt>
                      <dd className="font-mono">{quote ? formatINR(quote.coverage_amount) : 'N/A'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">Risk Tier</dt>
                      <dd>{quote?.risk_level ?? 'Medium'}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between gap-3">
            <button type="button" onClick={prevStep} disabled={step === 1} className="btn-ghost disabled:opacity-40">
              Back
            </button>
            {step < 3 ? (
              <button type="button" onClick={nextStep} className="btn-primary">
                Continue
              </button>
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
