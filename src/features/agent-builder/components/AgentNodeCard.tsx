import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Check, LoaderCircle } from 'lucide-react'
import type { CSSProperties } from 'react'
import { NODE_REGISTRY } from '../data/nodeRegistry'
import type { AgentNode } from '../types'

export function AgentNodeCard({ data, selected }: NodeProps<AgentNode>) {
  const definition = NODE_REGISTRY[data.kind]
  const Icon = definition.icon
  const isTrigger = data.kind === 'manualTrigger'
  const isTerminal = data.kind === 'returnResult' || data.kind === 'humanTakeover'

  return (
    <article
      className={`agent-node-card status-${data.status}${selected ? ' selected' : ''}`}
      style={{ '--node-color': definition.color, '--node-soft': definition.softColor } as CSSProperties}
    >
      {!isTrigger && <Handle className="agent-handle agent-handle-target" type="target" position={Position.Left} />}
      <div className="agent-node-topline">
        <span className="agent-node-icon"><Icon size={17} strokeWidth={1.9} /></span>
        <span className="agent-node-category">{definition.category}</span>
        <span className="agent-node-state" aria-label={data.status}>
          {data.status === 'running' ? <LoaderCircle size={12} /> : data.status === 'success' ? <Check size={12} /> : null}
        </span>
      </div>
      <strong>{data.label}</strong>
      <p>{data.description}</p>
      <div className="agent-node-footer">
        <span>{data.status === 'idle' ? 'Ready' : data.status === 'running' ? 'Working…' : data.status === 'success' ? 'Complete' : data.status}</span>
        <i />
      </div>
      {!isTerminal && <Handle className="agent-handle agent-handle-source" type="source" position={Position.Right} />}
    </article>
  )
}
