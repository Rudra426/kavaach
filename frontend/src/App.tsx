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

// ── Phase 3 Compliance Pages ────────────────────────────────────────────────
import { ConsentPage } from './pages/ConsentPage'
import { KeyFactsPage } from './pages/KeyFactsPage'
import { PrivacyDashboard } from './pages/PrivacyDashboard'
import { GrievancePage } from './pages/GrievancePage'
import { PrivacyNoticePage } from './pages/PrivacyNoticePage'

// ── Compliance Banner ───────────────────────────────────────────────────────
function ComplianceBanner() {
  return (
    <div
      style={{ zIndex: 9999 }}
      className="w-full bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center text-xs text-yellow-800 font-medium sticky top-0"
    >
      ⚠️ Kavaach is a regulatory-compliant prototype for deployment via a licensed insurer
      partnership. This demo does not constitute an insurance offer under the Insurance Act, 1938.{' '}
      <a href="/grievance" className="underline font-semibold hover:text-yellow-900">
        Grievance
      </a>{' '}
      |{' '}
      <a href="/privacy-notice" className="underline font-semibold hover:text-yellow-900">
        Privacy Notice
      </a>
    </div>
  )
}

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
    <div className="min-h-screen flex flex-col">

      {/* ── Compliance Banner — visible on every page ── */}
      <ComplianceBanner />

      <Routes>

        {/* ── Public routes ── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />

        {/* ── Phase 3: Compliance routes (public) ── */}
        <Route path="/consent" element={<ConsentPage />} />
        <Route path="/key-facts" element={<KeyFactsPage />} />
        <Route path="/grievance" element={<GrievancePage />} />
        <Route path="/privacy-notice" element={<PrivacyNoticePage />} />

        {/* Register — after consent */}
        <Route path="/register" element={<RegisterPage />} />

        {/* ── Protected routes ── */}
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

        {/* ── Phase 3: Privacy Dashboard (protected) ── */}
        <Route
          path="/privacy/:id"
          element={
            <ProtectedRoute>
              <PrivacyDashboard />
            </ProtectedRoute>
          }
        />

        {/* ── Admin routes ── */}
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/claims" element={<AdminClaimsPage />} />
        <Route path="/admin/riders" element={<AdminRidersPage />} />

        {/* ── Misc ── */}
        <Route path="/preview" element={<PreviewPage />} />
        <Route path="*" element={<NotFoundPage />} />

      </Routes>
    </div>
  )
}

export default App