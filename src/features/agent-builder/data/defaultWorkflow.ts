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
  createNode('start', 'manualTrigger', 0, 125),
  createNode('website', 'targetWebsite', 290, 125),
  createNode('goal', 'taskGoal', 580, 125),
  createNode('inputs', 'requiredInputs', 870, 125),
  createNode('agent', 'browserAgent', 1160, 125),
  createNode('approval', 'approvalGate', 1450, 20),
  createNode('result', 'returnResult', 1740, 20),
  createNode('takeover', 'humanTakeover', 1450, 285),
]

export const DEFAULT_EDGES: AgentEdge[] = [
  createEdge('start', 'website'),
  createEdge('website', 'goal'),
  createEdge('goal', 'inputs'),
  createEdge('inputs', 'agent'),
  createEdge('agent', 'approval'),
  createEdge('approval', 'result'),
  createEdge('agent', 'takeover', 'fallback'),
]

export function createPaletteNode(kind: AgentNodeKind, x: number, y: number): AgentNode {
  return createNode(`${kind}-${Date.now()}`, kind, x, y)
}
