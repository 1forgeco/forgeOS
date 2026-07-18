import { useState } from 'react'
import { ArrowUpRight } from './Icons'

const links = [
  ['Solutions', '#solutions'],
  ['Workflows', '#workflows'],
  ['Approach', '#process'],
]

export function Header() {
  const [open, setOpen] = useState(false)
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="1forge Studio home"><span>1</span>forge <small>studio</small></a>
      <nav className={open ? 'nav-open' : ''}>{links.map(([label, href]) => <a href={href} key={label} onClick={() => setOpen(false)}>{label}</a>)}</nav>
      <a className="header-cta" href="#contact">Talk to us <ArrowUpRight /></a>
      <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation"><i /><i /></button>
    </header>
  )
}
