import { ShieldCheck, Database, Globe, Clock, Mail, PhoneCall } from 'lucide-react'

const SECTIONS = [
  {
    icon: Database,
    title: 'Data We Collect',
    rows: [
      { field: 'Name, Phone', purpose: 'Policy issuance and identity verification', basis: 'Contract performance' },
      { field: 'UPI ID', purpose: 'Premium collection and claim payout', basis: 'Contract performance' },
      { field: 'Pincode, Delivery Zone', purpose: 'Risk scoring and trigger zone matching', basis: 'Consent + Legitimate interest' },
      { field: 'Platform, Weekly Earnings', purpose: 'Dynamic premium calculation', basis: 'Contract performance' },
      { field: 'GPS-verified Zone', purpose: 'Claim eligibility verification', basis: 'Consent' },
      { field: 'Claim & Payout History', purpose: 'Fraud scoring, no-claim discount', basis: 'Consent + Legitimate interest' },
    ],
  },
]

export function PrivacyNoticePage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-2xl">

        {/* Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <span className="text-xs font-semibold text-primary uppercase tracking-widest mb-2">
            DPDP Act 2023 — Section 5 Notice
          </span>
          <h1 className="text-2xl font-display font-bold text-text mb-2">Privacy Notice</h1>
          <p className="text-xs text-muted">Last updated: April 2026</p>
        </div>

        {/* Data Controller */}
        <div className="card bg-surface border border-border rounded-2xl px-5 py-4 mb-6">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">Data Controller</p>
          <p className="text-sm text-text">
            <span className="font-semibold">Kavaach</span> (prototype — a licensed insurer partner will be the registered Data Fiduciary on live deployment).
            For all data-related queries: <span className="text-primary font-medium">dpo@kavaach.in</span>
          </p>
        </div>

        {/* Data Table */}
        <div className="card bg-surface border border-border rounded-2xl overflow-hidden mb-6">
          <div className="border-b border-border px-5 py-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-text">Data Collected & Why</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-offset text-xs text-muted font-semibold uppercase tracking-wide">
                  <th className="px-4 py-2 text-left">Data</th>
                  <th className="px-4 py-2 text-left">Purpose</th>
                  <th className="px-4 py-2 text-left">Legal Basis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {SECTIONS[0].rows.map((row) => (
                  <tr key={row.field} className="text-text">
                    <td className="px-4 py-3 font-medium text-xs">{row.field}</td>
                    <td className="px-4 py-3 text-xs text-muted">{row.purpose}</td>
                    <td className="px-4 py-3 text-xs text-primary font-medium">{row.basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Data Sharing */}
        <div className="card bg-surface border border-border rounded-2xl px-5 py-4 mb-6">
          <p className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Data Sharing
          </p>
          <ul className="text-sm text-muted flex flex-col gap-2">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">—</span>
              <span><span className="font-semibold text-text">Razorpay</span>: Premium collection and payout transfer only. No marketing data shared.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">—</span>
              <span><span className="font-semibold text-text">ServiceNow</span>: Claim workflow ticketing only.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">—</span>
              <span><span className="font-semibold text-text">CPCB / IMD APIs</span>: We read public AQI/weather data. No personal data is sent to these services.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold mt-0.5">—</span>
              <span>No personal data is sold, rented, or shared with advertisers or third-party marketers.</span>
            </li>
          </ul>
        </div>

        {/* Data Localisation */}
        <div className="card bg-surface border border-border rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
          <Globe className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-text mb-1">Data Localisation</p>
            <p className="text-xs text-muted">
              All personal data is stored on India-based servers, compliant with DPDP Act 2023.
              No cross-border data transfer occurs.
            </p>
          </div>
        </div>

        {/* Retention */}
        <div className="card bg-surface border border-border rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
          <Clock className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-text mb-2">Data Retention Policy</p>
            <ul className="text-xs text-muted flex flex-col gap-1.5">
              <li><span className="font-semibold text-text">Active policy holders:</span> Data retained for policy term + 3 years as required by IRDAI records obligations.</li>
              <li><span className="font-semibold text-text">Inactive / demo users:</span> Personal data anonymised after 90 days of inactivity.</li>
              <li><span className="font-semibold text-text">Deleted accounts:</span> Processed within 30 days of deletion request unless legally required to retain.</li>
            </ul>
          </div>
        </div>

        {/* Your Rights */}
        <div className="card bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4 mb-6">
          <p className="text-sm font-semibold text-text mb-3">Your Rights Under DPDP Act 2023</p>
          <ul className="text-xs text-muted flex flex-col gap-2">
            {[
              ['Access', 'View all personal data held about you from Profile → Privacy Settings'],
              ['Correction', 'Correct inaccurate data such as name, UPI ID, or pincode'],
              ['Erasure', 'Request deletion of your data (subject to legal retention obligations)'],
              ['Withdrawal of Consent', 'Withdraw per-purpose consent at any time; withdrawal does not affect prior lawful processing'],
              ['Grievance', 'Raise a complaint with our DPO or escalate to IRDAI Bima Bharosa'],
            ].map(([right, desc]) => (
              <li key={right} className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0">✓</span>
                <span><span className="font-semibold text-text">{right}:</span> {desc}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted mt-4">
            Exercise your rights from{' '}
            <span className="font-semibold text-text">Profile → Privacy Settings</span>{' '}
            or email <span className="text-primary font-medium">dpo@kavaach.in</span>
          </p>
        </div>

        {/* Contact */}
        <div className="card bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="border-b border-border px-5 py-3">
            <p className="text-sm font-semibold text-text">Data Protection Contacts</p>
          </div>
          {[
            { icon: Mail, label: 'DPO / Privacy', value: 'dpo@kavaach.in' },
            { icon: Mail, label: 'Grievance', value: 'grievance@kavaach.in' },
            { icon: Mail, label: 'IRDAI Complaints', value: 'complaints@irdai.gov.in' },
            { icon: PhoneCall, label: 'IRDAI Toll Free', value: '155255' },
          ].map((c) => (
            <div key={c.label} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-none">
              <c.icon className="w-4 h-4 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted">{c.label}</p>
                <p className="text-sm font-medium text-text">{c.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
