import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Info, ChevronRight, AlertCircle } from 'lucide-react'

const CONSENTS = [
  {
    id: 'policy_issuance',
    title: 'Policy Issuance & Premium Collection',
    description:
      'Processing of your name, phone, UPI ID, earnings, and platform details to issue your income protection policy and collect weekly premiums via UPI.',
    required: true,
  },
  {
    id: 'location_use',
    title: 'Zone-Level Location for Claim Verification',
    description:
      'Use of your pincode and delivery zone (not continuous GPS) to verify that an active weather or AQI trigger event occurred in your exact operating area before processing a claim payout.',
    required: true,
  },
  {
    id: 'fraud_scoring',
    title: 'Fraud Detection via Platform Activity',
    description:
      'Cross-checking your platform login activity, order history, and GPS zone against trigger events to assign a claim tier (GREEN / YELLOW / RED) and prevent fraudulent claims that would raise premiums for all riders.',
    required: true,
  },
  {
    id: 'notifications',
    title: 'Policy & Claim Notifications',
    description:
      'Receiving in-app and SMS notifications about your premium due date, active weather/AQI alerts in your zone, payout status, and no-claim discount milestones.',
    required: false,
  },
]

export function ConsentPage() {
  const navigate = useNavigate()
  const [checked, setChecked] = useState<Record<string, boolean>>({
    policy_issuance: false,
    location_use: false,
    fraud_scoring: false,
    notifications: false,
  })
  const [expanded, setExpanded] = useState<string | null>(null)
  const [error, setError] = useState(false)

  const requiredAll = CONSENTS.filter((c) => c.required).every((c) => checked[c.id])

  const toggle = (id: string) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }))
    setError(false)
  }

  const handleContinue = () => {
    if (!requiredAll) {
      setError(true)
      return
    }
    // Pass consent as navigation state — no sessionStorage needed
    navigate('/register', {
      state: {
        consent: {
          ...checked,
          timestamp: new Date().toISOString(),
        },
      },
    })
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">

        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-text mb-2">
            Your Data, Your Control
          </h1>
          <p className="text-sm text-muted max-w-sm">
            Before you continue, Kavaach needs your consent to process your personal data.
            As required by the{' '}
            <span className="font-semibold text-text">Digital Personal Data Protection Act, 2023</span>,
            each purpose is listed separately. You may withdraw consent anytime from your Privacy Settings.
          </p>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          {CONSENTS.map((consent) => (
            <div
              key={consent.id}
              className={`card rounded-xl border p-4 transition-all cursor-pointer ${
                checked[consent.id]
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border bg-surface'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => toggle(consent.id)}
                  className={`mt-0.5 w-5 h-5 min-w-5 rounded border-2 flex items-center justify-center transition-all ${
                    checked[consent.id]
                      ? 'bg-primary border-primary'
                      : 'bg-white border-border'
                  }`}
                  aria-checked={checked[consent.id]}
                  role="checkbox"
                  aria-label={consent.title}
                >
                  {checked[consent.id] && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-text">
                      {consent.title}
                      {consent.required && (
                        <span className="ml-2 text-xs text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded-full">
                          Required
                        </span>
                      )}
                      {!consent.required && (
                        <span className="ml-2 text-xs text-muted font-medium bg-surface-offset px-1.5 py-0.5 rounded-full">
                          Optional
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => setExpanded(expanded === consent.id ? null : consent.id)}
                      className="text-muted hover:text-text"
                      aria-label="More info"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </div>

                  {expanded === consent.id && (
                    <p className="mt-2 text-xs text-muted leading-relaxed">
                      {consent.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
            <AlertCircle className="w-4 h-4 min-w-4" />
            Please accept all required consents to continue. Notifications consent is optional.
          </div>
        )}

        <div className="text-xs text-muted bg-surface-offset border border-border rounded-lg px-4 py-3 mb-6 leading-relaxed">
          <span className="font-semibold text-text">Your rights under DPDP Act 2023: </span>
          You may withdraw any consent at any time from{' '}
          <span className="font-semibold text-text">Profile → Privacy Settings</span>.
          Withdrawal does not affect the lawfulness of prior processing.
          Withdrawing required consents may suspend your active policy.
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!requiredAll}
          className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all ${
            requiredAll
              ? 'bg-primary text-white hover:bg-primary-hover active:scale-95'
              : 'bg-surface-offset text-muted cursor-not-allowed'
          }`}
        >
          Continue to Registration
          <ChevronRight className="w-4 h-4" />
        </button>

        <p className="text-center text-xs text-muted mt-4">
          By continuing, you confirm you have read and understood Kavaach's{' '}
          <a href="/privacy-notice" className="underline text-primary hover:text-primary-hover">
            Privacy Notice
          </a>{' '}
          and{' '}
          <a href="/grievance" className="underline text-primary hover:text-primary-hover">
            Grievance Policy
          </a>.
          This is a regulatory-compliant prototype; not a live insurance offer under the Insurance Act, 1938.
        </p>
      </div>
    </div>
  )
}
