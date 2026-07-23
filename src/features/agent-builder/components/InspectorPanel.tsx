import { Check, Info, Plus, Settings2, Trash2, X } from 'lucide-react'
import { useState, type KeyboardEvent } from 'react'
import { NODE_REGISTRY } from '../data/nodeRegistry'
import type { ConfigField } from '../data/nodeRegistry'
import type { AgentNode, AgentNodeData, NodeConfig } from '../types'

type InspectorPanelProps = {
  node: AgentNode | null
  onChange: (data: AgentNodeData) => void
  onDelete: () => void
  onClose: () => void
}

function items(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

function TagEditor({ field, value, onChange }: { field: ConfigField; value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState('')
  const current = items(value)
  const add = () => {
    const next = draft.trim()
    if (!next || current.some((item) => item.toLowerCase() === next.toLowerCase())) return
    onChange([...current, next].join(', '))
    setDraft('')
  }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      add()
    }
  }
  return <div className="tag-editor">
    <div className="tag-editor-items">{current.map((item) => <button type="button" key={item} onClick={() => onChange(current.filter((value) => value !== item).join(', '))} title={`Remove ${item}`}><span>{item}</span><X size={10} /></button>)}</div>
    <div className="tag-editor-add"><input value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown} placeholder={field.placeholder || 'Add another'} /><button type="button" onClick={add} disabled={!draft.trim()}><Plus size={12} /> Add</button></div>
  </div>
}

function MultiSelect({ field, value, onChange }: { field: ConfigField; value: string; onChange: (value: string) => void }) {
  const current = items(value)
  const toggle = (option: string) => onChange(current.includes(option) ? current.filter((item) => item !== option).join(', ') : [...current, option].join(', '))
  return <div className="choice-grid">{field.options?.map((option) => {
    const selected = current.includes(option.value)
    return <button type="button" className={selected ? 'selected' : ''} aria-pressed={selected} onClick={() => toggle(option.value)} key={option.value}>{selected ? <Check size={11} /> : <Plus size={11} />}<span>{option.label}</span></button>
  })}</div>
}

export function InspectorPanel({ node, onChange, onDelete, onClose }: InspectorPanelProps) {
  if (!node) {
    return (
      <aside className="inspector-panel inspector-empty">
        <div className="inspector-empty-icon"><Settings2 size={21} /></div>
        <h2>Choose a step to edit it</h2>
        <p>Click any card in the workflow. We’ll show exactly what you can change and an example of what to enter.</p>
        <div className="inspector-empty-note"><Info size={14} /><span>Your draft saves automatically on this device.</span></div>
      </aside>
    )
  }

  const definition = NODE_REGISTRY[node.data.kind]
  const Icon = definition.icon

  const updateConfig = (key: string, value: string) => {
    const config: NodeConfig = { ...node.data.config, [key]: value }
    onChange({ ...node.data, config })
  }

  return (
    <aside className="inspector-panel">
      <div className="inspector-header">
        <span>What should this step do?</span>
        <button onClick={onClose} aria-label="Close settings"><X size={16} /></button>
      </div>
      <div className="inspector-title">
        <span style={{ color: definition.color, background: definition.softColor }}><Icon size={18} /></span>
        <div><small>{definition.category}</small><h2>{node.data.label}</h2></div>
      </div>
      <div className="inspector-form">
        <label>
          <span>Step name shown on the canvas</span>
          <input value={node.data.label} onChange={(event) => onChange({ ...node.data, label: event.target.value })} />
        </label>
        <label>
          <span>Explain this step in one sentence</span>
          <textarea rows={3} value={node.data.description} onChange={(event) => onChange({ ...node.data, description: event.target.value })} />
        </label>
        <div className="inspector-rule" />
        {definition.fields.map((field) => (
          <label key={field.key}>
            <span>{field.label}</span>
            {field.type === 'taglist' ? <TagEditor field={field} value={String(node.data.config[field.key] ?? '')} onChange={(value) => updateConfig(field.key, value)} /> : field.type === 'multiselect' ? <MultiSelect field={field} value={String(node.data.config[field.key] ?? '')} onChange={(value) => updateConfig(field.key, value)} /> : field.type === 'select' ? (
              <select value={String(node.data.config[field.key] ?? '')} onChange={(event) => updateConfig(field.key, event.target.value)}>
                {field.options?.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
              </select>
            ) : field.type === 'textarea' ? (
              <textarea rows={4} value={String(node.data.config[field.key] ?? '')} onChange={(event) => updateConfig(field.key, event.target.value)} />
            ) : (
              <input value={String(node.data.config[field.key] ?? '')} onChange={(event) => updateConfig(field.key, event.target.value)} />
            )}
            {field.hint && <small className="field-hint">{field.hint}</small>}
          </label>
        ))}
      </div>
      <div className="inspector-footer">
        <button className="delete-node" onClick={onDelete}><Trash2 size={14} /> Remove this step</button>
      </div>
    </aside>
  )
}
