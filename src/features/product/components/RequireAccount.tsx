import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { productApi } from '../api'

export function RequireAccount() {
  const location = useLocation()
  const [state, setState] = useState<'checking' | 'signed-in' | 'signed-out'>('checking')

  useEffect(() => {
    let active = true
    productApi.session()
      .then((session) => { if (active) setState(session.authenticated ? 'signed-in' : 'signed-out') })
      .catch(() => { if (active) setState('signed-out') })
    return () => { active = false }
  }, [])

  if (state === 'checking') return <div className="route-loading">Checking your ForgeOS account…</div>
  if (state === 'signed-out') {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }
  return <Outlet />
}
