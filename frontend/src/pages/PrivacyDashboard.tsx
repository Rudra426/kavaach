import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  ShieldCheck, Download, Trash2, Eye, Edit2, ToggleLeft, ToggleRight,
  AlertCircle, CheckCircle2, Lock
} from 'lucide-react'

const MOCK_RIDER = {
  id: 'RDR-001234',
  name: 'Arjun Sharma',
  phone: '*****43210',
  upi: '*****@okaxis',
  pincode: '400063',
  platform: 'Swiggy + Zepto',
  earnings: '₹6,200/week',
  policyStatus: 'Active',
  joinedOn: '12 Jan 2026',
}

const CONSENT_ITEMS = [
  { id: 'policy_issuance', label: 'Policy Issuance & Premium Collection', required: true },
  { id: 'location_use', label: 'Zone-Level Location for Claim Verification', required: true },
  { id: 'fraud_scoring', label: 'Fraud Detection via Platform Activity', required: true },
  { id: 'notifications', label: 'Policy & Claim Notifications', required: false },
]

export function PrivacyDashboard() {
  const { id } = useParams()
  const [activeTab, setActiveTab] = useState<'data' | 'consents' | 'actions'>('data')
  const [consents, setConsents] = useState<Record<string, boolean>>({
    policy_issuance: true, location_use: true, fraud_scoring: true, notifications: true,
  })
  const [deletionRequested, setDeletionRequested] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editField, setEditField] = useState<string | null>(null)

  const toggleConsent = (id: string, required: boolean) => {
    if (required) return
    setConsents((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleDeleteRequest = () => {
    setDeletionRequested(true)
    setShowDeleteConfirm(false)
  }

  const handleExport = () => {
    const data = {
      rider: MOCK_RIDER,
      consents,
      exportedAt: new Date().toISOString(),
      note: 'This is your personal data held by Kavaach as per DPDP Act 2023, Section 11.',
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `kavaach_my_data_${id ?? 'rider'}.json`
    a.click()
  }

  const TABS = [
    { id: 'data', label: 'My Data' },
    { id: 'consents', label: 'Consent Settings' },
    { id: 'actions', label: 'Data Actions' },
  ] as const

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-xl">

        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-text mb-1">Privacy Dashboard</h1>
          <p className="text-sm text-muted">Your rights under DPDP Act 2023 — all in one place</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-offset border border-border rounded-xl p-1 mb-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-text shadow-sm'
                  : 'text-muted hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: My Data */}
        {activeTab === 'data' && (
          <div className="card bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="border-b border-border px-5 py-3 flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-text">Personal Data We Hold</span>
            </div>
            <div className="divide-y divide-border">
              {[
                { label: 'Rider ID', value: MOCK_RIDER.id, editable: false },
                { label: 'Name', value: MOCK_RIDER.name, editable: true, field: 'name' },
                { label: 'Phone', value: MOCK_RIDER.phone, editable: false },
                { label: 'UPI ID', value: MOCK_RIDER.upi, editable: true, field: 'upi' },
                { label: 'Pincode', value: MOCK_RIDER.pincode, editable: true, field: 'pincode' },
                { label: 'Platform', value: MOCK_RIDER.platform, editable: false },
                { label: 'Weekly Earnings', value: MOCK_RIDER.earnings, editable: false },
                { label: 'Policy Status', value: MOCK_RIDER.policyStatus, editable: false },
                { label: 'Joined On', value: MOCK_RIDER.joinedOn, editable: false },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-5 py-3 gap-4">
                  <span className="text-xs text-muted w-32 shrink-0">{row.label}</span>
                  <span className="text-sm text-text font-medium flex-1">{row.value}</span>
                  {row.editable && (
                    <button
                      type="button"
                      onClick={() => setEditField(editField === row.field ? null : (row.field ?? null))}
                      className="text-muted hover:text-primary transition-colors"
                      aria-label={`Edit ${row.label}`}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {!row.editable && <Lock className="w-4 h-4 text-muted/40 shrink-0" />}
                </div>
              ))}
            </div>
            {editField && (
              <div className="border-t border-border px-5 py-4 bg-primary/5 flex items-center gap-3">
                <input
                  autoFocus
                  className="input-base flex-1 text-sm"
                  placeholder={`Enter new ${editField}`}
                />
                <button
                  type="button"
                  onClick={() => setEditField(null)}
                  className="bg-primary text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-primary-hover transition-all"
                >
                  Save
                </button>
                <button type="button" onClick={() => setEditField(null)} className="text-xs text-muted underline">Cancel</button>
              </div>
            )}
            <div className="border-t border-border px-5 py-3 bg-surface-offset">
              <p className="text-xs text-muted">
                Phone number is masked and cannot be edited directly. Contact{' '}
                <span className="font-semibold text-text">grievance@kavaach.in</span> for phone updates.
              </p>
            </div>
          </div>
        )}

        {/* Tab: Consent Settings */}
        {activeTab === 'consents' && (
          <div className="card bg-surface border border-border rounded-2xl overflow-hidden">
            <div className="border-b border-border px-5 py-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-text">Your Consent Preferences</span>
            </div>
            <div className="divide-y divide-border">
              {CONSENT_ITEMS.map((item) => (
                <div key={item.id} className="flex items-start justify-between px-5 py-4 gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-text">{item.label}</p>
                    {item.required && (
                      <p className="text-xs text-muted mt-0.5">
                        Required for policy to function — cannot be withdrawn while policy is active.
                      </p>
                    )}
                    {!item.required && (
                      <p className="text-xs text-muted mt-0.5">Optional — toggle off to stop notifications.</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleConsent(item.id, item.required)}
                    className={`shrink-0 transition-colors ${item.required ? 'opacity-40 cursor-not-allowed' : ''}`}
                    disabled={item.required}
                    aria-label={`Toggle ${item.label}`}
                  >
                    {consents[item.id]
                      ? <ToggleRight className="w-8 h-8 text-primary" />
                      : <ToggleLeft className="w-8 h-8 text-muted" />}
                  </button>
                </div>
              ))}
            </div>
            <div className="border-t border-border px-5 py-3 bg-surface-offset">
              <p className="text-xs text-muted">
                Withdrawal of consent does not affect lawfulness of prior processing. Required consents
                may only be withdrawn by cancelling your policy.
              </p>
            </div>
          </div>
        )}

        {/* Tab: Data Actions */}
        {activeTab === 'actions' && (
          <div className="flex flex-col gap-4">

            {/* Download */}
            <div className="card bg-surface border border-border rounded-2xl px-5 py-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text mb-1">Download My Data</p>
                <p className="text-xs text-muted mb-3">
                  Export all personal data Kavaach holds about you as a JSON file.
                  Right under DPDP Act 2023, Section 11.
                </p>
                <button
                  type="button"
                  onClick={handleExport}
                  className="text-xs font-semibold text-primary border border-primary/40 px-3 py-2 rounded-lg hover:bg-primary/5 transition-all"
                >
                  Download JSON
                </button>
              </div>
            </div>

            {/* Deletion */}
            <div className={`card border rounded-2xl px-5 py-5 flex items-start gap-4 ${deletionRequested ? 'bg-green-50 border-green-200' : 'bg-surface border-border'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${deletionRequested ? 'bg-green-100' : 'bg-red-50'}`}>
                {deletionRequested
                  ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                  : <Trash2 className="w-5 h-5 text-red-500" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text mb-1">
                  {deletionRequested ? 'Deletion Request Submitted' : 'Request Data Deletion'}
                </p>
                {deletionRequested ? (
                  <p className="text-xs text-green-700">
                    Your request has been recorded. Personal data will be anonymised within 30 days.
                    Data required by IRDAI/Insurance Act obligations will be retained as per legal mandate.
                    Reference: DEL-{Date.now().toString().slice(-6)}
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-muted mb-3">
                      Request erasure of all your personal data. Processed within 30 days. Data legally
                      required by IRDAI records obligations (policy term + 3 years) will be retained.
                      Active policies must be cancelled first.
                    </p>
                    {!showDeleteConfirm ? (
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-xs font-semibold text-red-600 border border-red-300 px-3 py-2 rounded-lg hover:bg-red-50 transition-all"
                      >
                        Request Deletion
                      </button>
                    ) : (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex items-start gap-2 mb-3">
                          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <p className="text-xs text-red-700 font-medium">
                            This will delete your account and personal data. Your active policy will be cancelled.
                            This action cannot be undone.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleDeleteRequest}
                            className="text-xs font-semibold bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-all"
                          >
                            Confirm Deletion
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDeleteConfirm(false)}
                            className="text-xs text-muted underline px-2"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Rights reminder */}
            <div className="text-xs text-muted bg-surface border border-border rounded-xl px-4 py-3 leading-relaxed">
              <span className="font-semibold text-text">Need more help? </span>
              Contact <span className="text-primary font-medium">dpo@kavaach.in</span> for data-related
              queries or raise a grievance at{' '}
              <a href="/grievance" className="text-primary underline font-medium">grievance@kavaach.in</a>.
              IRDAI escalation: <span className="font-semibold text-text">155255</span>.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
