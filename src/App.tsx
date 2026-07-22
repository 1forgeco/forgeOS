import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AgentBuilderPage } from './features/agent-builder/pages/AgentBuilderPage'
import { MarketingPage } from './pages/MarketingPage'

export default function App() {
  return (
    <BrowserRouter>
      <RouteMetadata />
      <Routes>
        <Route path="/" element={<MarketingPage />} />
        <Route path="/app" element={<AgentBuilderPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

function RouteMetadata() {
  const { pathname } = useLocation()

  useEffect(() => {
    const productRoute = pathname.startsWith('/app')
    document.title = productRoute
      ? 'Agent Studio — ForgeOS by 1forge'
      : '1forge Studio — AI Agents & Business Automation'
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (robots) robots.content = productRoute ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'
  }, [pathname])

  return null
}
