import { Info, Settings2, Trash2, X } from 'lucide-react'
import { NODE_REGISTRY } from '../data/nodeRegistry'
import type { AgentNode, AgentNodeData, NodeConfig } from '../types'

type InspectorPanelProps = {
  node: AgentNode | null
  onChange: (data: AgentNodeData) => void
  onDelete: () => void
  onClose: () => void
}

export function InspectorPanel({ node, onChange, onDelete, onClose }: InspectorPanelProps) {
  if (!node) {
    return (
      <aside className="inspector-panel inspector-empty">
        <div className="inspector-empty-icon"><Settings2 size={21} /></div>
        <h2>Configure a block</h2>
        <p>Select any block to edit its instructions, connection, and behavior.</p>
        <div className="inspector-empty-note"><Info size={14} /><span>Changes are saved automatically in this browser.</span></div>
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
        <span>Block settings</span>
        <button onClick={onClose} aria-label="Close settings"><X size={16} /></button>
      </div>
      <div className="inspector-title">
        <span style={{ color: definition.color, background: definition.softColor }}><Icon size={18} /></span>
        <div><small>{definition.category}</small><h2>{node.data.label}</h2></div>
      </div>
      <div className="inspector-form">
        <label>
          <span>Block name</span>
          <input value={node.data.label} onChange={(event) => onChange({ ...node.data, label: event.target.value })} />
        </label>
        <label>
          <span>Description</span>
          <textarea rows={3} value={node.data.description} onChange={(event) => onChange({ ...node.data, description: event.target.value })} />
        </label>
        <div className="inspector-rule" />
        {definition.fields.map((field) => (
          <label key={field.key}>
            <span>{field.label}</span>
            {field.type === 'textarea' ? (
              <textarea rows={4} value={String(node.data.config[field.key] ?? '')} onChange={(event) => updateConfig(field.key, event.target.value)} />
            ) : (
              <input value={String(node.data.config[field.key] ?? '')} onChange={(event) => updateConfig(field.key, event.target.value)} />
            )}
            {field.hint && <small className="field-hint">{field.hint}</small>}
          </label>
        ))}
      </div>
      <div className="inspector-footer">
        <button className="delete-node" onClick={onDelete}><Trash2 size={14} /> Delete block</button>
      </div>
    </aside>
  )
}
