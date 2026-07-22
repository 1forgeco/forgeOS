import { MarkerType } from '@xyflow/react'
import { NODE_REGISTRY } from './nodeRegistry'
import type { AgentEdge, AgentNode, AgentNodeKind } from '../types'

function createNode(id: string, kind: AgentNodeKind, x: number, y: number): AgentNode {
  const definition = NODE_REGISTRY[kind]
  return {
    id,
    type: 'agentNode',
    position: { x, y },
    data: {
      kind,
      label: definition.label,
      description: definition.description,
      status: 'idle',
      config: { ...definition.config },
    },
  }
}

function createEdge(source: string, target: string, path: 'primary' | 'fallback' = 'primary'): AgentEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    type: 'smoothstep',
    animated: true,
    data: { path },
    markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
  }
}

export const DEFAULT_NODES: AgentNode[] = [
  createNode('chat', 'websiteChat', 0, 145),
  createNode('requirements', 'collectRequirements', 290, 145),
  createNode('catalog', 'searchCatalog', 580, 30),
  createNode('rank', 'filterRank', 870, 30),
  createNode('availability', 'checkAvailability', 1160, 30),
  createNode('confirm', 'requestConfirmation', 1450, 30),
  createNode('booking', 'createBooking', 1740, 30),
  createNode('email', 'sendConfirmation', 2030, 30),
  createNode('handoff', 'humanHandoff', 1160, 300),
]

export const DEFAULT_EDGES: AgentEdge[] = [
  createEdge('chat', 'requirements'),
  createEdge('requirements', 'catalog'),
  createEdge('catalog', 'rank'),
  createEdge('rank', 'availability'),
  createEdge('availability', 'confirm'),
  createEdge('confirm', 'booking'),
  createEdge('booking', 'email'),
  createEdge('rank', 'handoff', 'fallback'),
]

export function createPaletteNode(kind: AgentNodeKind, x: number, y: number): AgentNode {
  return createNode(`${kind}-${Date.now()}`, kind, x, y)
}
