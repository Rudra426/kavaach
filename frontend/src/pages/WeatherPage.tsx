import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { getWeather } from '../lib/api'
import type { WeatherResponse, WeatherAlert } from '../types/api'

const FALLBACK_THRESHOLDS: Record<string, { value: number; unit: string }> = {
  flood:   { value: 75,  unit: '%'     },
  heat:    { value: 43,  unit: '°C'    },
  aqi:     { value: 200, unit: ' AQI'  },
  cyclone: { value: 60,  unit: ' km/h' },
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function WeatherPage() {
  const { pincode = '' } = useParams<{ pincode: string }>()
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const fetchWeather = useCallback(async () => {
    if (!pincode) return
    setLoading(true)
    setError(null)
    try {
      const data = await getWeather(pincode)
      setWeather(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load weather')
    } finally {
      setLoading(false)
    }
  }, [pincode])

  useEffect(() => {
    fetchWeather()
    const t = setInterval(fetchWeather, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [fetchWeather])

  const getThreshold = (type: string) => {
    const apiVal = weather?.thresholds?.[type]
    return {
      value: apiVal !== undefined ? apiVal : (FALLBACK_THRESHOLDS[type]?.value ?? 0),
      unit:  FALLBACK_THRESHOLDS[type]?.unit ?? '',
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <p>Loading weather for {pincode}…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-red-500">
        <p>⚠️ {error}</p>
        <button
          onClick={fetchWeather}
          className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!weather) return null

  const tFlood = getThreshold('flood')
  const tHeat  = getThreshold('heat')
  const tAqi   = getThreshold('aqi')
  const tCyc   = getThreshold('cyclone')

  const isHeatActive  = weather.temperature          !== null && weather.temperature          >= tHeat.value
  const isFloodActive = weather.rainfall_probability !== null && weather.rainfall_probability >= tFlood.value
  const isCycActive   = weather.wind_speed           !== null && weather.wind_speed           >= tCyc.value
  const isAqiActive   = weather.aqi                  !== null && weather.aqi                  >= tAqi.value

  return (
    <div className="space-y-6 p-4 max-w-2xl mx-auto">

      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Live Weather</h2>
        <p className="text-sm text-gray-500 mt-1">
          {weather.city} · {weather.area} · Pincode {weather.pincode}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">
          Last updated {formatDate(weather.last_updated)}
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">

        <div className={`card rounded-xl p-4 border ${isHeatActive ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'}`}>
          <p className="text-xs text-gray-500 mb-1">Temperature</p>
          <p className="text-2xl font-bold text-gray-800">{weather.temperature ?? '—'}°C</p>
          <p className="text-xs text-gray-400 mt-1">Trigger ≥ {tHeat.value}{tHeat.unit}</p>
          {isHeatActive && <span className="mt-2 inline-block text-xs font-medium text-red-600">🔴 Active</span>}
        </div>

        <div className={`card rounded-xl p-4 border ${isFloodActive ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}>
          <p className="text-xs text-gray-500 mb-1">Rainfall risk</p>
          <p className="text-2xl font-bold text-gray-800">{weather.rainfall_probability ?? '—'}%</p>
          <p className="text-xs text-gray-400 mt-1">Trigger ≥ {tFlood.value}{tFlood.unit}</p>
          {isFloodActive && <span className="mt-2 inline-block text-xs font-medium text-blue-600">🔵 Active</span>}
        </div>

        <div className={`card rounded-xl p-4 border ${isCycActive ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'}`}>
          <p className="text-xs text-gray-500 mb-1">Wind speed</p>
          <p className="text-2xl font-bold text-gray-800">
            {weather.wind_speed ?? '—'} <span className="text-sm font-normal">km/h</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">Trigger ≥ {tCyc.value}{tCyc.unit}</p>
          {isCycActive && <span className="mt-2 inline-block text-xs font-medium text-orange-600">🟠 Active</span>}
        </div>

        <div className={`card rounded-xl p-4 border ${isAqiActive ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'}`}>
          <p className="text-xs text-gray-500 mb-1">AQI</p>
          <p className="text-2xl font-bold text-gray-800">
            {weather.aqi !== null ? Math.round(weather.aqi) : '—'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Trigger ≥ {tAqi.value}{tAqi.unit}</p>
          {isAqiActive && <span className="mt-2 inline-block text-xs font-medium text-purple-600">🟣 Active</span>}
        </div>

      </div>

      {/* Alerts */}
      <div className="space-y-2">
        {weather.alerts.length === 0 ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            ✅ No active alerts. Coverage is standing by.
          </div>
        ) : (
          weather.alerts.map((alert: WeatherAlert, i: number) => (
            <div
              key={i}
              className={`rounded-xl border p-4 ${
                alert.severity === 'high'
                  ? 'border-red-300 bg-red-50'
                  : alert.severity === 'medium'
                  ? 'border-yellow-300 bg-yellow-50'
                  : 'border-blue-200 bg-blue-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  {alert.type}
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  alert.severity === 'high'
                    ? 'bg-red-200 text-red-700'
                    : alert.severity === 'medium'
                    ? 'bg-yellow-200 text-yellow-700'
                    : 'bg-blue-200 text-blue-700'
                }`}>
                  {alert.severity}
                </span>
              </div>
              <p className="text-sm text-gray-700">{alert.message}</p>
              {alert.threshold !== undefined && alert.actual_value !== undefined && (
                <p className="text-xs text-gray-400 mt-1">
                  Reading: {alert.actual_value}{alert.unit} · Threshold: {alert.threshold}{alert.unit}
                </p>
              )}
            </div>
          ))
        )}
      </div>

    </div>
  )
}
