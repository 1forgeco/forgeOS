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

// Two-row layout keeps the horizontal span to ~870px so the initial
// fit-to-view stays at a readable zoom on common desktop viewports.
// Row 1 (y=0):   Trigger → Website → Goal → Inputs
// Row 2 (y=220): Agent → Approval → Result  (HumanTakeover below Agent)
export const DEFAULT_NODES: AgentNode[] = [
  createNode('start',    'manualTrigger',  0,   0),
  createNode('website',  'targetWebsite',  290, 0),
  createNode('goal',     'taskGoal',       580, 0),
  createNode('inputs',   'requiredInputs', 870, 0),
  createNode('agent',    'browserAgent',   290, 220),
  createNode('approval', 'approvalGate',   580, 220),
  createNode('result',   'returnResult',   870, 220),
  createNode('takeover', 'humanTakeover',  290, 440),
]

export const DEFAULT_EDGES: AgentEdge[] = [
  createEdge('start',    'website'),
  createEdge('website',  'goal'),
  createEdge('goal',     'inputs'),
  createEdge('inputs',   'agent'),
  createEdge('agent',    'approval'),
  createEdge('approval', 'result'),
  createEdge('agent',    'takeover', 'fallback'),
]

export function createPaletteNode(kind: AgentNodeKind, x: number, y: number): AgentNode {
  return createNode(`${kind}-${Date.now()}`, kind, x, y)
}
