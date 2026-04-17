import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Zap, Clock, AlertTriangle, BadgeIndianRupee, PhoneCall, ChevronRight, XCircle, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'

const KFS_ROWS = [
  { label: 'Product Type', value: 'Parametric micro-insurance — temporary income loss cover' },
  { label: 'Coverage', value: 'Income loss due to verified AQI or weather disruption in your delivery zone' },
  { label: 'Trigger Source', value: 'CPCB AQI API (official) / IMD Weather Data (official)' },
  { label: 'Trigger Threshold', value: 'AQI > 300 in your zone OR active IMD red alert for your city' },
  { label: 'Payout Speed', value: 'Automatic UPI transfer within 2 hours of trigger verification' },
  { label: 'Payout Amount', value: 'Based on your weekly earnings × payout multiplier shown at quote time' },
  { label: 'Premium', value: 'Dynamic — changes by pincode risk, season, delivery type, and platform count' },
  { label: 'Enrollment Lockout', value: 'No new enrollment 48 hours before/during an active weather/AQI red alert' },
  { label: 'Free Look Period', value: '30 days from policy start — full refund of premiums paid' },
  { label: 'Policy Term', value: 'Weekly renewable — auto-renewed via UPI autopay unless cancelled' },
]

const EXCLUSIONS = [
  'Health or hospitalisation expenses',
  'Vehicle damage, theft, or maintenance',
  'Life insurance or accidental death benefit',
  'Disability or critical illness',
  'Income loss due to personal reasons, strikes, or platform disputes',
  'Losses where GPS zone does not match trigger zone',
]

const CONTACTS = [
  { label: 'Internal Grievance', value: 'grievance@kavaach.in', icon: PhoneCall },
  { label: 'IRDAI Bima Bharosa', value: 'bimabharosa.irdai.gov.in', icon: ShieldCheck },
  { label: 'IRDAI Toll Free', value: '155255 / 1800 4254 732', icon: PhoneCall },
  { label: 'IRDAI Email', value: 'complaints@irdai.gov.in', icon: PhoneCall },
]

export function KeyFactsPage() {
  const navigate = useNavigate()
  const [acknowledged, setAcknowledged] = useState(false)

  const handleConfirm = () => {
    sessionStorage.setItem('kavaach_kfs_ack', JSON.stringify({ acknowledged: true, timestamp: new Date().toISOString() }))
    navigate('/register')
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            IRDAI Required Disclosure
          </span>
          <h1 className="text-2xl font-display font-bold text-text mb-2">Key Facts Statement</h1>
          <p className="text-sm text-muted max-w-md">
            As required by IRDAI Master Circular on Protection of Policyholders' Interests (2024),
            please read this before purchasing your policy.
          </p>
        </div>

        {/* KFS Table */}
        <div className="card bg-surface border border-border rounded-2xl overflow-hidden mb-6">
          <div className="bg-primary/5 border-b border-border px-5 py-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-text">Policy Key Facts</span>
          </div>
          <div className="divide-y divide-border">
            {KFS_ROWS.map((row) => (
              <div key={row.label} className="flex flex-col sm:flex-row px-5 py-3 gap-1">
                <span className="text-xs font-semibold text-muted w-full sm:w-48 shrink-0">{row.label}</span>
                <span className="text-sm text-text">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What is NOT covered */}
        <div className="card bg-red-50 border border-red-200 rounded-2xl overflow-hidden mb-6">
          <div className="border-b border-red-200 px-5 py-3 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700">What is NOT Covered</span>
          </div>
          <ul className="px-5 py-4 flex flex-col gap-2">
            {EXCLUSIONS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-red-700">
                <XCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Free Look */}
        <div className="card bg-surface border border-border rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
          <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-text mb-1">30-Day Free Look Period</p>
            <p className="text-xs text-muted">
              If you are not satisfied with your policy for any reason, you may cancel it within 30 days
              of the policy start date and receive a full refund of all premiums paid. Contact
              grievance@kavaach.in to initiate cancellation.
            </p>
          </div>
        </div>

        {/* Adverse Selection Warning */}
        <div className="card bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-800 mb-1">Enrollment Lockout Notice</p>
            <p className="text-xs text-yellow-700">
              New policy enrollment is blocked 48 hours before and during an active AQI red alert
              (AQI &gt; 300) or IMD red weather alert in your delivery zone. This protects the
              sustainability of the insurance pool for existing policyholders.
            </p>
          </div>
        </div>

        {/* Contacts */}
        <div className="card bg-surface border border-border rounded-2xl overflow-hidden mb-6">
          <div className="border-b border-border px-5 py-3 flex items-center gap-2">
            <BadgeIndianRupee className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-text">Grievance & Escalation Contacts</span>
          </div>
          <div className="divide-y divide-border">
            {CONTACTS.map((c) => (
              <div key={c.label} className="flex flex-col sm:flex-row items-start sm:items-center px-5 py-3 gap-1">
                <span className="text-xs font-semibold text-muted w-full sm:w-48 shrink-0">{c.label}</span>
                <span className="text-sm text-primary font-medium">{c.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Regulatory Note */}
        <div className="text-xs text-muted bg-surface-offset border border-border rounded-xl px-4 py-3 mb-6 leading-relaxed">
          <span className="font-semibold text-text">Regulatory Note: </span>
          Kavaach is a prototype for deployment via a licensed insurer partnership under IRDAI regulations.
          It is not a licensed insurer or broker under the Insurance Act, 1938. Any live product requires
          IRDAI product filing and approval.
        </div>

        {/* Acknowledgement */}
        <div
          className={`card rounded-xl border p-4 mb-4 cursor-pointer transition-all ${
            acknowledged ? 'border-primary/50 bg-primary/5' : 'border-border bg-surface'
          }`}
          onClick={() => setAcknowledged((v) => !v)}
        >
          <div className="flex items-start gap-3">
            <button
              type="button"
              className={`mt-0.5 w-5 h-5 min-w-5 rounded border-2 flex items-center justify-center transition-all ${
                acknowledged ? 'bg-primary border-primary' : 'bg-white border-border'
              }`}
              aria-checked={acknowledged}
              role="checkbox"
              aria-label="KFS acknowledgement"
            >
              {acknowledged && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span className="text-sm text-text">
              I have read and understood this Key Facts Statement, including what is and is not covered,
              the 30-day free look period, and the enrollment lockout rules.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!acknowledged}
          className={`w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition-all ${
            acknowledged
              ? 'bg-primary text-white hover:bg-primary-hover active:scale-95'
              : 'bg-surface-offset text-muted cursor-not-allowed'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          I Understand — Continue
        </button>
      </div>
    </div>
  )
}
