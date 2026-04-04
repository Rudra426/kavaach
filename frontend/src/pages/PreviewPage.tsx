import { useMemo, useState } from 'react'
import { getSessionRiderId } from '../lib/session'
import { RouteTransition } from '../components/layout/RouteTransition'
import { PhoneFrame } from '../components/layout/PhoneFrame'

export function PreviewPage() {
  const riderId = getSessionRiderId() ?? 'DEMO'

  const routeOptions = useMemo(
    () => [
      { label: 'Dashboard', value: `/dashboard/${riderId}` },
      { label: 'Policy', value: `/policy/${riderId}` },
      { label: 'Claims', value: '/claims' },
      { label: 'Payments', value: `/payments/${riderId}` },
      { label: 'Notifications', value: `/notifications/${riderId}` },
      { label: 'Weather', value: '/weather/400063' },
    ],
    [riderId],
  )

  const [route, setRoute] = useState(routeOptions[0]?.value ?? '/')

  return (
    <RouteTransition className="min-h-screen bg-bg px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="font-display text-3xl text-primary">Demo Preview Mode</h1>
        <p className="mt-2 text-sm text-muted">Phone frame showcase for judge walkthrough. Select app screen and present live.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {routeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRoute(option.value)}
              className={`rounded-full border px-4 py-2 text-sm ${
                route === option.value ? 'border-primary bg-primary text-white' : 'border-border bg-white text-text'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <PhoneFrame>
            <iframe title="Kavaach demo" src={route} className="h-[760px] w-full border-0" />
          </PhoneFrame>
        </div>
      </div>
    </RouteTransition>
  )
}
