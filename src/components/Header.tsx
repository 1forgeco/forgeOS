import { useState } from 'react'
import { ArrowUpRight } from './Icons'
import { EcosystemSwitcher, EcosystemTopBar } from './EcosystemNavigation'

const links = [
  ['Product', '#product'],
  ['Agent templates', '#agents'],
  ['How it works', '#workflows'],
  ['Safety', '#safety'],
  ['Pricing', '/pricing'],
]

export function Header() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <EcosystemTopBar />
      <header className="site-header">
        <a className="brand" href="#top" aria-label="ForgeOS home"><span>F</span>orgeOS <small>by 1forge</small></a>
        <nav className={open ? 'nav-open' : ''}>{links.map(([label, href]) => <a href={href} key={label} onClick={() => setOpen(false)}>{label}</a>)}</nav>
        <div className="header-account-actions"><a href="/login?next=/projects">Log in</a><a className="header-cta" href="/login?mode=register&next=/templates">Start building <ArrowUpRight /></a></div>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation"><i /><i /></button>
      </header>
      <EcosystemSwitcher />
    </>
  )
}
