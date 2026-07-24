import { Activity, BadgeCheck, Boxes, Cable, ChevronDown, CircleHelp, LayoutGrid, LogOut, Menu, Plus, Settings, Sparkles, UserRound, X } from 'lucide-react'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pendingApprovals, setPendingApprovals] = useState(0)
  useEffect(() => { productApi.session().then(setSession).catch(() => setSession({ authenticated: false, user: null, workspace: null })) }, [])
  useEffect(() => { productApi.dashboard().then((summary) => setPendingApprovals(summary.pendingApprovals)).catch(() => undefined) }, [])
  const signOut = async () => { await productApi.logout(); window.location.assign('/login') }

  return (
    <div className="product-app-shell">
      {/* ── Desktop sidebar ── */}
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

      {/* ── Main content column ── */}
      <div className="product-main-column">
        {/* Desktop topbar */}
        <header className="product-topbar">
          <div><span className="live-dot" /> Protected workspace</div>
          <nav><a href="/docs"><CircleHelp size={13} /> Help</a><a href="/playground">Playground</a><a href="/">ForgeOS home</a></nav>
        </header>

        {/* Mobile topbar */}
        <header className="product-mobile-topbar">
          <a className="product-mobile-brand" href="/">
            <span>F</span>
            <strong>ForgeOS</strong>
          </a>
          <div className="product-mobile-topbar-actions">
            <a className="mobile-new-agent-btn" href="/templates"><Plus size={15} /> New agent</a>
            <button
              className="mobile-menu-btn"
              aria-label="Open account menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </header>

        {/* Mobile account menu drawer */}
        {mobileMenuOpen && (
          <div className="mobile-account-drawer" onClick={() => setMobileMenuOpen(false)}>
            <div className="mobile-account-drawer-inner" onClick={(e) => e.stopPropagation()}>
              <div className="mobile-drawer-account-info">
                <span>{session?.user?.name?.slice(0, 1).toUpperCase() || 'F'}</span>
                <div>
                  <strong>{session?.user?.name || 'Loading account'}</strong>
                  <small>{session?.workspace?.name || 'Personal workspace'}</small>
                </div>
              </div>
              <nav className="mobile-drawer-nav">
                <NavLink to="/settings" onClick={() => setMobileMenuOpen(false)}><UserRound size={14} /> Account settings</NavLink>
                <a href="/docs" onClick={() => setMobileMenuOpen(false)}><CircleHelp size={14} /> Help and docs</a>
                <a href="/playground" onClick={() => setMobileMenuOpen(false)}><Sparkles size={14} /> Playground</a>
                <button onClick={() => void signOut()}><LogOut size={14} /> Sign out</button>
              </nav>
            </div>
          </div>
        )}

        <Outlet context={{ session }} />
      </div>

      {/* ── Mobile bottom tab bar ── */}
      <nav className="mobile-bottom-nav" aria-label="Main navigation">
        {links.map(([label, path, Icon]) => (
          <NavLink
            to={path}
            key={path}
            className={({ isActive }) => `mobile-tab${isActive ? ' active' : ''}`}
          >
            <span className="mobile-tab-icon">
              <Icon size={20} />
              {path === '/approvals' && pendingApprovals > 0 && (
                <b className="mobile-tab-badge">{pendingApprovals}</b>
              )}
            </span>
            <span className="mobile-tab-label">{label}</span>
          </NavLink>
        ))}
        <NavLink
          to="/settings"
          className={({ isActive }) => `mobile-tab${isActive ? ' active' : ''}`}
        >
          <span className="mobile-tab-icon"><Settings size={20} /></span>
          <span className="mobile-tab-label">Settings</span>
        </NavLink>
      </nav>
    </div>
  )
}
