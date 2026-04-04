import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { AuthPage } from './pages/AuthPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { PolicyPage } from './pages/PolicyPage'
import { ClaimsPage } from './pages/ClaimsPage'
import { ClaimDetailPage } from './pages/ClaimDetailPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { WeatherPage } from './pages/WeatherPage'
import { AdminPage } from './pages/AdminPage'
import { AdminClaimsPage } from './pages/AdminClaimsPage'
import { AdminRidersPage } from './pages/AdminRidersPage'
import { PreviewPage } from './pages/PreviewPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProtectedRoute } from './routes/ProtectedRoute'
import gsap from 'gsap'

function App() {
  const location = useLocation()

  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>('.card'))
    const cleanups: Array<() => void> = []

    cards.forEach((card) => {
      const onEnter = () => {
        gsap.to(card, {
          y: -3,
          boxShadow: '0 10px 28px rgba(26,58,42,0.14), 0 4px 8px rgba(26,58,42,0.09)',
          duration: 0.22,
          ease: 'power2.out',
        })
      }
      const onLeave = () => {
        gsap.to(card, {
          y: 0,
          boxShadow: '0 6px 20px rgba(26,58,42,0.08), 0 1px 3px rgba(26,58,42,0.12)',
          duration: 0.22,
          ease: 'power2.out',
        })
      }

      card.addEventListener('mouseenter', onEnter)
      card.addEventListener('mouseleave', onLeave)

      cleanups.push(() => {
        card.removeEventListener('mouseenter', onEnter)
        card.removeEventListener('mouseleave', onLeave)
      })
    })

    return () => {
      cleanups.forEach((cleanup) => cleanup())
    }
  }, [location.pathname])

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<AuthPage />} />
      <Route path="/signup" element={<AuthPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/dashboard/:id"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/policy/:id"
        element={
          <ProtectedRoute>
            <PolicyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/claims"
        element={
          <ProtectedRoute>
            <ClaimsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/claim/:claim_id"
        element={
          <ProtectedRoute>
            <ClaimDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications/:id"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payments/:id"
        element={
          <ProtectedRoute>
            <PaymentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/weather/:pincode"
        element={
          <ProtectedRoute>
            <WeatherPage />
          </ProtectedRoute>
        }
      />

      <Route path="/admin" element={<AdminPage />} />
      <Route path="/admin/claims" element={<AdminClaimsPage />} />
      <Route path="/admin/riders" element={<AdminRidersPage />} />
      <Route path="/preview" element={<PreviewPage />} />

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default App
