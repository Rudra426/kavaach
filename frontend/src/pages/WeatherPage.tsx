import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CloudLightning, Wind, Droplets, Thermometer } from 'lucide-react'
import { getWeather } from '../lib/api'
import type { WeatherResponse } from '../types/api'
import { formatDate } from '../lib/format'
import { RouteTransition } from '../components/layout/RouteTransition'
import { SkeletonBlock } from '../components/ui/SkeletonBlock'

export function WeatherPage() {
  const { pincode } = useParams()
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!pincode) {
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const result = await getWeather(pincode)
        setWeather(result)
      } catch (error) {
        toast.error('Unable to fetch weather data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [pincode])

  return (
    <RouteTransition className="min-h-screen bg-bg px-4 py-6 md:px-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <h1 className="font-display text-3xl text-primary">Weather & Risk View</h1>

        {loading ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-36" />
          </div>
        ) : weather ? (
          <>
            <section className="card bg-primary text-white">
              <p className="text-sm text-white/75">Live for pincode {weather.pincode}</p>
              <p className="mt-1 font-display text-4xl">{weather.city}</p>
              <p className="text-sm text-white/80">{weather.area}</p>
              <p className="mt-2 text-xs text-white/70">Last updated {formatDate(weather.last_updated)}</p>
            </section>

            <section className="grid gap-3 md:grid-cols-4">
              <article className="card">
                <Thermometer className="h-5 w-5 text-accent" />
                <p className="mt-2 text-sm text-muted">Temperature</p>
                <p className="font-display text-2xl text-text">{weather.temperature ?? '-'}°C</p>
              </article>
              <article className="card">
                <Droplets className="h-5 w-5 text-accent" />
                <p className="mt-2 text-sm text-muted">Rainfall risk</p>
                <p className="font-display text-2xl text-text">{weather.rainfall_probability ?? '-'}%</p>
              </article>
              <article className="card">
                <Wind className="h-5 w-5 text-accent" />
                <p className="mt-2 text-sm text-muted">Wind speed</p>
                <p className="font-display text-2xl text-text">{weather.wind_speed ?? '-'} km/h</p>
              </article>
              <article className="card">
                <CloudLightning className="h-5 w-5 text-accent" />
                <p className="mt-2 text-sm text-muted">AQI</p>
                <p className="font-display text-2xl text-text">{Math.round(weather.aqi)}</p>
              </article>
            </section>

            <section className="card">
              <h2 className="font-display text-2xl text-text">Risk Alerts</h2>
              {weather.alerts.length === 0 ? (
                <p className="mt-2 text-sm text-muted">No active alerts. Coverage is standing by.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {weather.alerts.map((alert) => (
                    <li key={`${alert.type}-${alert.severity}`} className="rounded-xl border border-warning bg-[rgba(212,160,23,0.14)] p-3 text-sm">
                      <p className="font-semibold text-text">{alert.type.toUpperCase()}</p>
                      <p className="text-muted">{alert.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : (
          <section className="card text-muted">Weather unavailable for this pincode.</section>
        )}
      </div>
    </RouteTransition>
  )
}
