import type { Edge, Node } from '@xyflow/react'

export type NodeCategory = 'Start' | 'Define' | 'Agent' | 'Safety' | 'Finish'

export type AgentNodeKind =
  | 'manualTrigger'
  | 'targetWebsite'
  | 'taskGoal'
  | 'requiredInputs'
  | 'browserAgent'
  | 'approvalGate'
  | 'returnResult'
  | 'humanTakeover'

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

export type BrowserWorkflowDefinition = {
  id: string
  name: string
  version: number
  websiteUrl: string
  allowedDomains: string[]
  goal: string
  completionCriteria: string
  inputs: string[]
  allowedActions: string[]
  approvalActions: string[]
  maximumSteps: number
  resultFormat: string
  fallbackInstructions: string
}
