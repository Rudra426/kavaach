import { useState } from 'react'
import { PhoneCall, Mail, Globe, ChevronDown, ChevronUp, CheckCircle2, Send, AlertCircle } from 'lucide-react'
import { submitGrievance } from '../lib/complianceApi'
import { getSessionRiderId } from '../lib/session'

const ISSUE_TYPES = [
  'Claim rejected without reason',
  'Payout not received after trigger',
  'Premium deducted but policy not active',
  'Enrollment blocked incorrectly',
  'Privacy / data deletion request',
  'Incorrect premium charged',
  'Other',
]

export function GrievancePage() {
  const riderId = getSessionRiderId() ?? ''
  const [step, setStep] = useState<'form' | 'submitted'>('form')
  const [form, setForm] = useState({ riderId, policyId: '', issueType: '', description: '', contact: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [refId, setRefId] = useState('')
  const [faqOpen, setFaqOpen] = useState<number | null>(null)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.riderId.trim()) e.riderId = 'Rider ID is required'
    if (!form.issueType) e.issueType = 'Please select an issue type'
    if (!form.description.trim() || form.description.length < 20)
      e.description = 'Please describe the issue in at least 20 characters'
    if (!form.contact.trim()) e.contact = 'Contact number or email is required'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    try {
      const res = await submitGrievance({
        rider_id: form.riderId,
        policy_id: form.policyId || undefined,
        issue_type: form.issueType,
        description: form.description,
        contact: form.contact,
      })
      setRefId(res.data?.reference_id ?? 'GRV-' + Date.now().toString().slice(-6))
      setStep('submitted')
    } catch {
      setErrors({ api: 'Failed to submit. Please try again or email grievance@kavaach.in' })
    } finally {
      setLoading(false)
    }
  }

  const FAQS = [
    {
      q: 'How long will it take to resolve my grievance?',
      a: 'Kavaach aims to resolve all grievances within 14 days as per IRDAI Master Circular 2024. You will receive a status update within 48 hours of submission.',
    },
    {
      q: 'What if my grievance is not resolved in 14 days?',
      a: "You may escalate to IRDAI's Bima Bharosa portal (bimabharosa.irdai.gov.in) or call 155255. For disputes, approach the Insurance Ombudsman for your region.",
    },
    {
      q: 'Can I request deletion of my personal data?',
      a: 'Yes. Select "Privacy / data deletion request" as the issue type. Data is deleted within 30 days unless legally required to be retained under IRDAI or Insurance Act obligations.',
    },
    {
      q: 'My claim was rejected. What are my options?',
      a: 'Submit this form with issue type "Claim rejected without reason" and your claim ID. We will review within 14 days and provide the reason code. You may also escalate to IRDAI Bima Bharosa.',
    },
  ]

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-display font-bold text-text mb-2">Grievance Redressal</h1>
          <p className="text-sm text-muted max-w-sm mx-auto">
            As per IRDAI Master Circular on Protection of Policyholders' Interests 2024, all
            grievances are resolved within 14 days.
          </p>
        </div>

        {step === 'submitted' ? (
          <div className="card bg-surface border border-border rounded-2xl px-6 py-10 flex flex-col items-center text-center gap-4">
            <CheckCircle2 className="w-12 h-12 text-primary" />
            <h2 className="text-lg font-semibold text-text">Grievance Submitted</h2>
            <p className="text-sm text-muted max-w-sm">
              Your grievance has been recorded. You will receive a response within{' '}
              <span className="font-semibold text-text">14 days</span>. Reference: {refId}
            </p>
            <div className="text-xs text-muted bg-surface-offset border border-border rounded-xl px-4 py-3 w-full text-left mt-2">
              If not resolved in 14 days, escalate to:{' '}
              <a href="https://bimabharosa.irdai.gov.in" target="_blank" rel="noopener noreferrer" className="text-primary underline font-semibold">
                bimabharosa.irdai.gov.in
              </a>{' '}
              or call <span className="font-semibold text-text">155255</span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card bg-surface border border-border rounded-2xl px-6 py-6 flex flex-col gap-4 mb-6">

            {errors.api && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 min-w-4" />{errors.api}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-text mb-1">Rider ID <span className="text-red-500">*</span></label>
              <input className="input-base w-full" placeholder="e.g. RDR-001234" value={form.riderId}
                onChange={(e) => setForm((p) => ({ ...p, riderId: e.target.value }))} />
              {errors.riderId && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.riderId}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">Policy ID <span className="text-muted text-xs font-normal">(optional)</span></label>
              <input className="input-base w-full" placeholder="e.g. POL-987654" value={form.policyId}
                onChange={(e) => setForm((p) => ({ ...p, policyId: e.target.value }))} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">Issue Type <span className="text-red-500">*</span></label>
              <select className="input-base w-full" value={form.issueType}
                onChange={(e) => setForm((p) => ({ ...p, issueType: e.target.value }))}>
                <option value="">Select an issue type</option>
                {ISSUE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.issueType && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.issueType}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">Description <span className="text-red-500">*</span></label>
              <textarea className="input-base w-full min-h-24 resize-y" placeholder="Describe your issue in detail..."
                value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              {errors.description && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.description}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-text mb-1">Your Contact <span className="text-red-500">*</span></label>
              <input className="input-base w-full" placeholder="e.g. 9876543210 or name@email.com"
                value={form.contact} onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))} />
              {errors.contact && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.contact}</p>}
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              <Send className="w-4 h-4" />
              {loading ? 'Submitting...' : 'Submit Grievance'}
            </button>
          </form>
        )}

        <div className="card bg-surface border border-border rounded-2xl overflow-hidden mb-6">
          <div className="border-b border-border px-5 py-3">
            <p className="text-sm font-semibold text-text">Escalation Contacts</p>
          </div>
          <div className="divide-y divide-border">
            {[
              { icon: Mail, label: 'Internal', value: 'grievance@kavaach.in' },
              { icon: Globe, label: 'IRDAI Bima Bharosa', value: 'bimabharosa.irdai.gov.in' },
              { icon: PhoneCall, label: 'IRDAI Toll Free', value: '155255 / 1800 4254 732' },
              { icon: Mail, label: 'IRDAI Email', value: 'complaints@irdai.gov.in' },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-3 px-5 py-3">
                <c.icon className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted">{c.label}</p>
                  <p className="text-sm font-medium text-text">{c.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <p className="text-sm font-semibold text-text">Frequently Asked Questions</p>
          </div>
          {FAQS.map((faq, i) => (
            <div key={i} className="border-b border-border last:border-none">
              <button type="button" onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left">
                <span className="text-sm font-medium text-text pr-4">{faq.q}</span>
                {faqOpen === i ? <ChevronUp className="w-4 h-4 text-muted shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted shrink-0" />}
              </button>
              {faqOpen === i && <p className="px-5 pb-4 text-sm text-muted">{faq.a}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
