import { Activity, BadgeCheck, Boxes, Cable, ChevronDown, CircleHelp, LayoutGrid, LogOut, Plus, Settings, Sparkles, UserRound } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { productApi } from '../api'
import type { AccountSession } from '../types'
import '../styles/product.css'

const links = [
  ['Agents', '/projects', LayoutGrid],
  ['Templates', '/templates', Boxes],
  ['Runs', '/runs', Activity],
  ['Approvals', '/approvals', BadgeCheck],
  ['Connections', '/connections', Cable],
] as const

export function ProductShell() {
  const [session, setSession] = useState<AccountSession | null>(null)
  const [accountOpen, setAccountOpen] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState(0)
  useEffect(() => { productApi.session().then(setSession).catch(() => setSession({ authenticated: false, user: null, workspace: null })) }, [])
  useEffect(() => { productApi.dashboard().then((summary) => setPendingApprovals(summary.pendingApprovals)).catch(() => undefined) }, [])
  const signOut = async () => { await productApi.logout(); window.location.assign('/login') }

  return (
    <div className="product-app-shell">
      <aside className="product-sidebar">
        <a className="product-brand" href="/"><span>F</span><div><strong>ForgeOS</strong><small>by 1forge</small></div></a>
        <a className="new-agent-button" href="/templates"><Plus size={14} /> New agent</a>
        <nav>
          {links.map(([label, path, Icon]) => <NavLink to={path} title={label} className={({ isActive }) => isActive ? 'active' : ''} key={path}><Icon size={15} /><span>{label}</span>{path === '/approvals' && pendingApprovals > 0 && <b className="sidebar-count">{pendingApprovals}</b>}</NavLink>)}
        </nav>
        <div className="sidebar-spacer" />
        <div className="product-beta-note"><Sparkles size={14} /><div><strong>Research runtime v0.4</strong><p>Multi-page product comparison is ready. More agent types are coming next.</p></div></div>
        <NavLink className={({ isActive }) => `settings-link${isActive ? ' active' : ''}`} to="/settings"><Settings size={15} /> Settings</NavLink>
        <button className="account-switcher" aria-expanded={accountOpen} onClick={() => setAccountOpen((current) => !current)}>
          <span>{session?.user?.name?.slice(0, 1).toUpperCase() || 'F'}</span>
          <div><strong>{session?.user?.name || 'Loading account'}</strong><small>{session?.workspace?.name || 'Personal workspace'}</small></div>
          <ChevronDown size={13} />
        </button>
        {accountOpen && <div className="account-menu"><NavLink to="/settings" onClick={() => setAccountOpen(false)}><UserRound size={13} /> Account settings</NavLink><a href="/docs"><CircleHelp size={13} /> Help and docs</a><button onClick={() => void signOut()}><LogOut size={13} /> Sign out</button></div>}
      </aside>
      <div className="product-main-column">
        <header className="product-topbar">
          <div><span className="live-dot" /> Protected workspace</div>
          <nav><a href="/docs"><CircleHelp size={13} /> Help</a><a href="/playground">Playground</a><a href="/">ForgeOS home</a></nav>
        </header>
        <Outlet context={{ session }} />
      </div>
    </div>
  )
}
