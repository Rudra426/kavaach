import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { getNotifications } from '../lib/api'
import type { NotificationResponse } from '../types/api'
import { formatDate } from '../lib/format'
import { RouteTransition } from '../components/layout/RouteTransition'
import { SkeletonBlock } from '../components/ui/SkeletonBlock'
import { EmptyState } from '../components/ui/EmptyState'
import { BottomNav } from '../components/navigation/BottomNav'

export function NotificationsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<NotificationResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) {
      navigate('/login')
      return
    }

    const load = async () => {
      setLoading(true)
      try {
        const result = await getNotifications(id)
        setData(result)
      } catch (error) {
        toast.error('Could not fetch notifications')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id, navigate])

  const toneClass = (type: string): string => {
    if (type === 'success') {
      return 'border-accent2 bg-[rgba(46,125,94,0.08)]'
    }
    if (type === 'alert') {
      return 'border-warning bg-[rgba(212,160,23,0.16)]'
    }
    if (type === 'warning') {
      return 'border-accent bg-[rgba(232,115,42,0.12)]'
    }
    return 'border-border bg-white'
  }

  return (
    <RouteTransition className="min-h-screen bg-bg px-4 pb-24 pt-6 md:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl text-primary">Notifications</h1>

        {loading ? (
          <div className="mt-4 space-y-3">
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
            <SkeletonBlock className="h-16" />
          </div>
        ) : data && data.notifications.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {data.notifications.map((notification, index) => (
              <li key={`${notification.title}-${index}`} className={`rounded-xl border p-4 ${toneClass(notification.type)}`}>
                <p className="font-medium text-text">{notification.title}</p>
                <p className="mt-1 text-sm text-muted">{notification.message}</p>
                <p className="mt-2 text-xs text-muted">{formatDate(notification.time)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5">
            <EmptyState title="All caught up" description="No pending alerts. We will notify you when anything needs attention." />
          </div>
        )}
      </div>
      <BottomNav />
    </RouteTransition>
  )
}
