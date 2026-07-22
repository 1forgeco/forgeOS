import { Bot, GripVertical, Plus, Radio, Search } from 'lucide-react'
import { useMemo, useState, type DragEvent } from 'react'
import { NODE_GROUPS, NODE_REGISTRY } from '../data/nodeRegistry'
import type { AgentNodeKind } from '../types'

type NodePaletteProps = {
  onAdd: (kind: AgentNodeKind) => void
}

export function NodePalette({ onAdd }: NodePaletteProps) {
  const [query, setQuery] = useState('')
  const groups = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return NODE_GROUPS
    return NODE_GROUPS.map((group) => ({
      ...group,
      kinds: group.kinds.filter((kind) => {
        const item = NODE_REGISTRY[kind]
        return `${item.label} ${item.description} ${item.category}`.toLowerCase().includes(normalized)
      }),
    })).filter((group) => group.kinds.length > 0)
  }, [query])

  const startDrag = (event: DragEvent<HTMLButtonElement>, kind: AgentNodeKind) => {
    event.dataTransfer.setData('application/forge-node', kind)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <aside className="node-palette" aria-label="Workflow blocks">
      <section className="active-agent-section">
        <div className="active-agent-label"><span>Your agents</span><b>1 active</b></div>
        <button className="active-agent-card" type="button">
          <span className="active-agent-avatar"><Bot size={17} /></span>
          <span><strong>Booking concierge</strong><small><Radio size={10} /> Running now</small></span>
          <i />
        </button>
      </section>
      <div className="palette-heading">
        <span>Building blocks</span>
        <b>{Object.keys(NODE_REGISTRY).length}</b>
      </div>
      <label className="palette-search">
        <Search size={14} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search blocks" aria-label="Search workflow blocks" />
      </label>
      <div className="palette-scroll">
        {groups.map((group) => (
          <section className="palette-group" key={group.category}>
            <h2>{group.category}</h2>
            {group.kinds.map((kind) => {
              const item = NODE_REGISTRY[kind]
              const Icon = item.icon
              return (
                <button
                  className="palette-item"
                  draggable
                  onDragStart={(event) => startDrag(event, kind)}
                  onDoubleClick={() => onAdd(kind)}
                  key={kind}
                  title="Drag onto the canvas or double-click to add"
                >
                  <span className="palette-item-icon" style={{ color: item.color, background: item.softColor }}><Icon size={15} /></span>
                  <span><strong>{item.label}</strong><small>{item.description}</small></span>
                  <GripVertical className="palette-grip" size={14} />
                  <Plus className="palette-plus" size={13} />
                </button>
              )
            })}
          </section>
        ))}
        {groups.length === 0 && <p className="palette-empty">No matching blocks.</p>}
      </div>
      <p className="palette-tip"><span>Tip</span> Drag a block onto the canvas, then connect its handles.</p>
    </aside>
  )
}
