import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { Login } from '@/pages/Login'
import { IntakeForm } from '@/pages/IntakeForm'
import { DispatcherQueue } from '@/pages/DispatcherQueue'
import { TripDetail } from '@/pages/TripDetail'
import { Dashboard } from '@/pages/Dashboard'
import { Facilities } from '@/pages/Facilities'
import { Requestors } from '@/pages/Requestors'
import { Clients } from '@/pages/Clients'
import { AuditLog } from '@/pages/AuditLog'
import { NotificationLog } from '@/pages/NotificationLog'
import type { Role } from '@/lib/types'

function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/queue" replace />

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/queue" replace />} />

          <Route path="intake" element={<RequireAuth><IntakeForm /></RequireAuth>} />
          <Route path="queue" element={<RequireAuth><DispatcherQueue /></RequireAuth>} />
          <Route path="trips/:id" element={<RequireAuth><TripDetail /></RequireAuth>} />
          <Route
            path="dashboard"
            element={<RequireAuth roles={['senior_dispatcher', 'admin']}><Dashboard /></RequireAuth>}
          />
          <Route
            path="facilities"
            element={<RequireAuth><Facilities /></RequireAuth>}
          />
          <Route
            path="requestors"
            element={<RequireAuth><Requestors /></RequireAuth>}
          />
          <Route
            path="clients"
            element={<RequireAuth><Clients /></RequireAuth>}
          />
          <Route
            path="notifications"
            element={<RequireAuth roles={['senior_dispatcher', 'admin']}><NotificationLog /></RequireAuth>}
          />
          <Route
            path="audit"
            element={<RequireAuth roles={['admin']}><AuditLog /></RequireAuth>}
          />
        </Route>

        <Route path="*" element={<Navigate to="/queue" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
