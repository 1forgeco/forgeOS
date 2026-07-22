import type { AgentEdge, AgentNode } from '../agent-builder/types'

export type TemplateAvailability = 'available' | 'beta' | 'coming-soon'

export type AgentTemplate = {
  id: string
  slug: string
  name: string
  shortName: string
  description: string
  outcome: string
  category: string
  availability: TemplateAvailability
  accent: string
  softAccent: string
  exampleSites: string[]
  capabilities: string[]
  risk: 'Low' | 'Moderate' | 'Protected'
  defaultUrl: string
  defaultGoal: string
  defaultInputs: string
}

export type StoredAgent = {
  id: string
  workspaceId: string
  templateId: string
  name: string
  status: 'draft' | 'testing' | 'live' | 'paused' | 'error'
  websiteUrl: string
  goal: string
  nodes: AgentNode[]
  edges: AgentEdge[]
  lastRunAt?: string | null
  createdAt: string
  updatedAt: string
}

export type AccountSession = {
  authenticated: boolean
  user: { id: string; email: string; name: string } | null
  workspace: { id: string; name: string; role: string } | null
}

export type AgentRunRecord = {
  id: string
  agentId: string
  agentName: string
  status: string
  goal: string
  result?: string | null
  startedAt: string
  completedAt?: string | null
}

export type ApprovalRecord = {
  id: string
  agentId: string
  agentName: string
  action: string
  details: string
  status: string
  createdAt: string
}
