import { Activity, BadgeCheck, Boxes, Cable, ChevronDown, LayoutGrid, LogOut, Plus, Settings, Sparkles } from 'lucide-react'
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
  useEffect(() => { productApi.session().then(setSession).catch(() => setSession({ authenticated: false, user: null, workspace: null })) }, [])
  const signOut = async () => { await productApi.logout(); window.location.assign('/login') }

  return (
    <div className="product-app-shell">
      <aside className="product-sidebar">
        <a className="product-brand" href="/"><span>F</span><div><strong>ForgeOS</strong><small>by 1forge</small></div></a>
        <a className="new-agent-button" href="/templates"><Plus size={14} /> New agent</a>
        <nav>
          {links.map(([label, path, Icon]) => <NavLink to={path} className={({ isActive }) => isActive ? 'active' : ''} key={path}><Icon size={15} /><span>{label}</span></NavLink>)}
        </nav>
        <div className="sidebar-spacer" />
        <div className="product-beta-note"><Sparkles size={14} /><div><strong>Browser runtime beta</strong><p>Search works now. Multi-step page planning is expanding.</p></div></div>
        <NavLink className={({ isActive }) => `settings-link${isActive ? ' active' : ''}`} to="/settings"><Settings size={15} /> Settings</NavLink>
        <div className="account-switcher">
          <span>{session?.user?.name?.slice(0, 1).toUpperCase() || 'F'}</span>
          <div><strong>{session?.user?.name || 'Loading account'}</strong><small>{session?.workspace?.name || 'Personal workspace'}</small></div>
          <ChevronDown size={13} />
        </div>
      </aside>
      <div className="product-main-column">
        <header className="product-topbar">
          <div><span className="live-dot" /> Protected workspace</div>
          <nav><a href="https://studio.1forge.in/" target="_blank" rel="noreferrer">1forge Studio</a><a href="/">ForgeOS home</a><button onClick={() => void signOut()}><LogOut size={13} /> Sign out</button></nav>
        </header>
        <Outlet context={{ session }} />
      </div>
    </div>
  )
}
