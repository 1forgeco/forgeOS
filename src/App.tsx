import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { MarketingPage } from './pages/MarketingPage'

const AgentBuilderPage = lazy(() => import('./features/agent-builder/pages/AgentBuilderPage').then((module) => ({ default: module.AgentBuilderPage })))
const ProductShell = lazy(() => import('./features/product/components/ProductShell').then((module) => ({ default: module.ProductShell })))
const ApprovalsPage = lazy(() => import('./features/product/pages/ApprovalsPage').then((module) => ({ default: module.ApprovalsPage })))
const ConnectionsPage = lazy(() => import('./features/product/pages/ConnectionsPage').then((module) => ({ default: module.ConnectionsPage })))
const CreateAgentPage = lazy(() => import('./features/product/pages/CreateAgentPage').then((module) => ({ default: module.CreateAgentPage })))
const ProjectsPage = lazy(() => import('./features/product/pages/ProjectsPage').then((module) => ({ default: module.ProjectsPage })))
const RunsPage = lazy(() => import('./features/product/pages/RunsPage').then((module) => ({ default: module.RunsPage })))
const RunDetailPage = lazy(() => import('./features/product/pages/RunDetailPage').then((module) => ({ default: module.RunDetailPage })))
const SettingsPage = lazy(() => import('./features/product/pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const TemplateDetailPage = lazy(() => import('./features/product/pages/TemplateDetailPage').then((module) => ({ default: module.TemplateDetailPage })))
const TemplatesPage = lazy(() => import('./features/product/pages/TemplatesPage').then((module) => ({ default: module.TemplatesPage })))
const PublicInfoPage = lazy(() => import('./features/product/pages/PublicInfoPage').then((module) => ({ default: module.PublicInfoPage })))
const AuthPage = lazy(() => import('./features/product/pages/AuthPage').then((module) => ({ default: module.AuthPage })))
const RequireAccount = lazy(() => import('./features/product/components/RequireAccount').then((module) => ({ default: module.RequireAccount })))
const NotFoundPage = lazy(() => import('./features/product/pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))

export default function App() {
  return <BrowserRouter><RouteMetadata /><Suspense fallback={<div className="route-loading">Opening ForgeOS…</div>}><Routes>
    <Route path="/" element={<MarketingPage />} />
    <Route path="/playground" element={<AgentBuilderPage />} />
    <Route path="/agents/:slug" element={<TemplateDetailPage />} />
    <Route path="/pricing" element={<PublicInfoPage kind="pricing" />} />
    <Route path="/docs" element={<PublicInfoPage kind="docs" />} />
    <Route path="/privacy" element={<PublicInfoPage kind="privacy" />} />
    <Route path="/terms" element={<PublicInfoPage kind="terms" />} />
    <Route path="/login" element={<AuthPage />} />
    <Route element={<RequireAccount />}>
      <Route element={<ProductShell />}>
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/runs" element={<RunsPage />} />
        <Route path="/runs/:runId" element={<RunDetailPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/connections" element={<ConnectionsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/new/:templateId" element={<CreateAgentPage />} />
      <Route path="/app/:agentId" element={<AgentBuilderPage />} />
      <Route path="/app" element={<Navigate to="/projects" replace />} />
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense></BrowserRouter>
}

function RouteMetadata() {
  const { pathname } = useLocation()
  useEffect(() => {
    const appRoute = ['/login','/projects','/templates','/runs','/approvals','/connections','/settings','/new/','/app/','/playground'].some((route) => pathname.startsWith(route))
    const templateRoute = pathname.startsWith('/agents/')
    const routeTitle = pathname.startsWith('/runs/') ? 'Run details' : pathname === '/runs' ? 'Agent runs' : pathname === '/approvals' ? 'Approvals' : pathname === '/connections' ? 'Connections' : pathname === '/settings' ? 'Settings' : pathname === '/templates' ? 'Agent templates' : pathname === '/projects' ? 'Your agents' : ''
    document.title = appRoute ? `${routeTitle ? `${routeTitle} — ` : ''}ForgeOS` : templateRoute ? 'Agent Template — ForgeOS by 1forge' : 'ForgeOS by 1forge — Build Custom Browser Agents'
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (robots) robots.content = appRoute ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'
  }, [pathname])
  return null
}
