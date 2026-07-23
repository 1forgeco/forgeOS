import { ArrowRight, Bot, Check, ChevronDown, Circle, GripVertical, Plus, Radio, Search } from 'lucide-react'
import { useMemo, useState, type DragEvent } from 'react'
import { NODE_GROUPS, NODE_REGISTRY } from '../data/nodeRegistry'
import type { AgentNodeKind } from '../types'

type NodePaletteProps = {
  onAdd: (kind: AgentNodeKind) => void
  onOpenTest: () => void
  onOpenInstall: () => void
  onOpenAdd: () => void
  onFocusKind: (kind: AgentNodeKind) => void
  existingKinds: AgentNodeKind[]
}

const QUICK_KINDS: AgentNodeKind[] = ['targetWebsite', 'taskGoal', 'requiredInputs', 'browserAgent', 'approvalGate', 'returnResult']

export function NodePalette({ onAdd, onOpenTest, onOpenInstall, onOpenAdd, onFocusKind, existingKinds }: NodePaletteProps) {
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
        <div className="active-agent-label"><span>Your draft</span><b>Custom</b></div>
        <button className="active-agent-card" type="button">
          <span className="active-agent-avatar"><Bot size={17} /></span>
          <span><strong>Browser agent</strong><small><Radio size={10} /> Ready to configure</small></span>
          <i />
        </button>
      </section>
      <section className="setup-guide">
        <div className="setup-guide-heading"><span>Build and deploy</span><b>2 of 4</b></div>
        <div className="setup-progress"><i /></div>
        <button type="button"><Check size={12} /><span><strong>Core workflow added</strong><small>Website, goal and safety are connected.</small></span></button>
        <button type="button"><Check size={12} /><span><strong>Browser tools added</strong><small>Search, click, type and extract are allowed.</small></span></button>
        <button type="button" onClick={onOpenTest}><Circle size={11} /><span><strong>Test the workflow</strong><small>Validate inputs and execution order.</small></span><ArrowRight size={11} /></button>
        <button type="button" onClick={onOpenInstall}><Circle size={11} /><span><strong>Deploy the agent</strong><small>Send it directly to the browser extension.</small></span><ArrowRight size={11} /></button>
      </section>
      <section className="palette-add-panel">
        <div><span>Change the workflow</span><p>Choose a step and ForgeOS will place and connect it for you.</p></div>
        <button className="palette-add-primary" type="button" onClick={onOpenAdd}><Plus size={15} /> Add a step <ChevronDown size={13} /></button>
        <div className="palette-quick-actions">
          {QUICK_KINDS.map((kind) => {
            const item = NODE_REGISTRY[kind]
            const Icon = item.icon
            const exists = existingKinds.includes(kind)
            return <button type="button" onClick={() => exists ? onFocusKind(kind) : onAdd(kind)} key={kind}><span style={{ color: item.color, background: item.softColor }}><Icon size={13} /></span><strong>{item.label}</strong><small>{exists ? 'Edit' : 'Add'}</small></button>
          })}
        </div>
      </section>
      <div className="palette-heading">
        <span>Advanced: drag a block</span>
        <b>{Object.keys(NODE_REGISTRY).length} blocks</b>
      </div>
      <label className="palette-search">
        <Search size={14} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a step to add" aria-label="Find a workflow step" />
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
                  title="Drag this step onto the canvas or double-click to add it"
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
      <p className="palette-tip"><span>Easiest option</span> Use Add a step or the quick buttons. Drag blocks only when you want exact placement.</p>
    </aside>
  )
}
