import { useEffect, useRef, useState } from 'react'
import { Bot, Boxes, ChevronUp, Layers3, ServerCog } from 'lucide-react'

const products = [
  { name: 'Studio', label: 'Software, apps & AI', href: 'https://studio.1forge.in/', tone: 'purple', icon: Layers3, current: false },
  { name: 'Designs', label: 'Premium UI/UX templates', href: 'https://1forgedesign.vercel.app/', tone: 'orange', icon: Boxes, current: false },
  { name: 'ForgeOS', label: 'Custom browser agents', href: '/', tone: 'blue', icon: Bot, current: true },
  { name: 'Hostin', label: 'Property operations', href: 'https://host-in-beta.vercel.app/', tone: 'green', icon: ServerCog, current: false },
] as const

export function EcosystemTopBar() {
  return (
    <nav className="forgeos-product-bar" aria-label="1Forge products">
      <span className="forgeos-product-bar__label"><i /><i /><i /><i />1Forge products</span>
      <div>
        {products.map(({ icon: Icon, ...product }) => (
          <a
            href={product.href}
            key={product.name}
            className={`is-${product.tone} ${product.current ? 'is-current' : ''}`}
            aria-current={product.current ? 'page' : undefined}
          >
            <Icon size={14} strokeWidth={1.8} aria-hidden="true" />
            <span>{product.name}<em>{product.label}</em></span>
            {product.current ? <small>YOU ARE HERE</small> : <b aria-hidden="true">↗</b>}
          </a>
        ))}
      </div>
      <span className="forgeos-product-bar__promise">One forge / four products</span>
    </nav>
  )
}

export function EcosystemSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    window.addEventListener('pointerdown', closeOutside)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('pointerdown', closeOutside)
    }
  }, [])

  return (
    <div ref={rootRef} className={`forgeos-ecosystem ${isOpen ? 'is-open' : ''}`}>
      <div className="forgeos-ecosystem__panel" aria-hidden={!isOpen} inert={!isOpen}>
        <header><span>1FORGE ECOSYSTEM</span><small>One forge. Four products.</small></header>
        {products.map(({ icon: Icon, ...product }) => (
          <a
            key={product.name}
            href={product.href}
            className={`is-${product.tone} ${product.current ? 'is-current' : ''}`}
            aria-current={product.current ? 'page' : undefined}
            onClick={() => setIsOpen(false)}
          >
            <i aria-hidden="true"><Icon size={17} strokeWidth={1.8} /></i>
            <span><strong>{product.name}</strong><small>{product.label}</small></span>
            <b aria-hidden="true">{product.current ? 'CURRENT' : '↗'}</b>
          </a>
        ))}
      </div>
      <button
        className="forgeos-ecosystem__trigger"
        type="button"
        aria-expanded={isOpen}
        aria-label="Open 1Forge product ecosystem"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="forgeos-ecosystem__rings" aria-hidden="true"><i /><i /><i /><i /></span>
        <span>1Forge</span>
        <ChevronUp size={15} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  )
}
