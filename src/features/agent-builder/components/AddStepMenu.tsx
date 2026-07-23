import { Check, Plus, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { NODE_GROUPS, NODE_REGISTRY } from '../data/nodeRegistry'
import type { AgentNodeKind } from '../types'

type AddStepMenuProps = {
  open: boolean
  afterNodeLabel?: string
  existingKinds: AgentNodeKind[]
  onChoose: (kind: AgentNodeKind) => void
  onFocusExisting: (kind: AgentNodeKind) => void
  onClose: () => void
}

export function AddStepMenu({ open, afterNodeLabel, existingKinds, onChoose, onFocusExisting, onClose }: AddStepMenuProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const inputRef = useRef<HTMLInputElement>(null)
  const existing = useMemo(() => new Set(existingKinds), [existingKinds])
  const categories = ['All', ...NODE_GROUPS.map((group) => group.category)]
  const steps = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return Object.entries(NODE_REGISTRY).filter(([, item]) => {
      const matchesCategory = category === 'All' || item.category === category
      const matchesQuery = !normalized || `${item.label} ${item.description} ${item.category}`.toLowerCase().includes(normalized)
      return matchesCategory && matchesQuery
    }) as Array<[AgentNodeKind, (typeof NODE_REGISTRY)[AgentNodeKind]]>
  }, [category, query])

  useEffect(() => {
    if (!open) return
    setQuery('')
    window.setTimeout(() => inputRef.current?.focus(), 30)
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="add-step-backdrop" onMouseDown={onClose}>
      <section className="add-step-dialog" role="dialog" aria-modal="true" aria-labelledby="add-step-title" onMouseDown={(event) => event.stopPropagation()}>
        <header><div><span>Add to workflow</span><h2 id="add-step-title">{afterNodeLabel ? `What happens after “${afterNodeLabel}”?` : 'Choose the next step'}</h2><p>Search by what you want the agent to do. ForgeOS connects the new step automatically.</p></div><button onClick={onClose} aria-label="Close add step menu"><X size={16} /></button></header>
        <label className="add-step-search"><Search size={15} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “approval”, “website”, or “result”" /></label>
        <div className="add-step-categories">{categories.map((item) => <button className={category === item ? 'active' : ''} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div>
        <div className="add-step-results">
          {steps.map(([kind, item]) => {
            const Icon = item.icon
            const alreadyAdded = existing.has(kind)
            return <button className="add-step-option" onClick={() => alreadyAdded ? onFocusExisting(kind) : onChoose(kind)} key={kind}>
              <span className="add-step-option-icon" style={{ color: item.color, background: item.softColor }}><Icon size={17} /></span>
              <span><strong>{item.label}</strong><small>{item.description}</small><i>{item.category}</i></span>
              <b>{alreadyAdded ? <><Check size={12} /> Edit existing</> : <><Plus size={12} /> Add step</>}</b>
            </button>
          })}
          {steps.length === 0 && <div className="add-step-empty">No step matches that search. Try a shorter phrase.</div>}
        </div>
      </section>
    </div>
  )
}
