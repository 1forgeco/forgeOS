import type { Edge, Node } from '@xyflow/react'

export type NodeCategory = 'Start' | 'Understand' | 'Look up' | 'Decide' | 'Confirm or hand off' | 'Take action'

export type AgentNodeKind =
  | 'websiteChat'
  | 'collectRequirements'
  | 'searchCatalog'
  | 'filterRank'
  | 'checkAvailability'
  | 'requestConfirmation'
  | 'createBooking'
  | 'sendConfirmation'
  | 'humanHandoff'

export type NodeStatus = 'idle' | 'queued' | 'running' | 'success' | 'error'

export type NodeConfig = Record<string, string | number | boolean>

export type AgentNodeData = {
  kind: AgentNodeKind
  label: string
  description: string
  status: NodeStatus
  config: NodeConfig
}

export type AgentNode = Node<AgentNodeData, 'agentNode'>
export type AgentEdge = Edge<{ path?: 'primary' | 'fallback' }>

export type RunLog = {
  id: string
  nodeId: string
  label: string
  detail: string
  status: 'running' | 'success'
  timestamp: string
}
