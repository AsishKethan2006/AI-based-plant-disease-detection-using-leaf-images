import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { useAuth } from './context/AuthContext'
import Dashboard from './pages/Dashboard'
import Diagnose from './pages/Diagnose'
import History from './pages/History'
import Login from './pages/Login'
import Register from './pages/Register'

function Protected() {
  const { token } = useAuth()
  const location = useLocation()
  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}

function PublicOnly() {
  const { token } = useAuth()
  return token ? <Navigate to="/" replace /> : <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route element={<Protected />}>
        <Route index element={<Dashboard />} />
        <Route path="/diagnose" element={<Diagnose />} />
        <Route path="/history" element={<History />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
