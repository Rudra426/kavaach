import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { getAdminRiders } from '../lib/api'
import type { AdminRider } from '../types/api'
import { formatDate, formatINR } from '../lib/format'
import { RouteTransition } from '../components/layout/RouteTransition'
import { AdminSidebar } from '../components/navigation/AdminSidebar'
import { SkeletonBlock } from '../components/ui/SkeletonBlock'

export function AdminRidersPage() {
  const [riders, setRiders] = useState<AdminRider[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const result = await getAdminRiders()
        setRiders(result)
      } catch (error) {
        toast.error('Unable to fetch riders list')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim()
    if (!query) {
      return riders
    }
    return riders.filter((rider) => {
      return (
        rider.name.toLowerCase().includes(query) ||
        rider.phone.includes(query) ||
        rider.city.toLowerCase().includes(query) ||
        rider.pincode.includes(query)
      )
    })
  }, [riders, search])

  return (
    <RouteTransition className="min-h-screen bg-bg px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-7xl gap-4">
        <AdminSidebar />

        <div className="w-full">
          <h1 className="font-display text-3xl text-primary">Admin Rider List</h1>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input-base mt-4 max-w-sm"
            placeholder="Search by name, city, phone"
          />

          {loading ? (
            <div className="mt-4 space-y-3">
              <SkeletonBlock className="h-14" />
              <SkeletonBlock className="h-14" />
              <SkeletonBlock className="h-14" />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface p-4">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="py-2 pr-3">Rider</th>
                    <th className="py-2 pr-3">Phone</th>
                    <th className="py-2 pr-3">City</th>
                    <th className="py-2 pr-3">Pincode</th>
                    <th className="py-2 pr-3">Platform</th>
                    <th className="py-2 pr-3">Weekly earnings</th>
                    <th className="py-2">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((rider) => (
                    <tr key={rider.id} className="border-b border-border/70">
                      <td className="py-3 pr-3 font-medium">{rider.name}</td>
                      <td className="py-3 pr-3 font-mono">{rider.phone}</td>
                      <td className="py-3 pr-3">{rider.city}</td>
                      <td className="py-3 pr-3 font-mono">{rider.pincode}</td>
                      <td className="py-3 pr-3">{rider.platform}</td>
                      <td className="py-3 pr-3">{formatINR(rider.weekly_earnings)}</td>
                      <td className="py-3">{formatDate(rider.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </RouteTransition>
  )
}
