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
  runtimeMode: string
  requiredConnections: string[]
  approvalDefaults: string
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
  runId?: string | null
  agentId: string
  agentName: string
  websiteUrl?: string
  action: string
  details: string
  status: string
  createdAt: string
  resolvedAt?: string | null
}

export type WorkspaceSettings = {
  safety: {
    askBeforeSubmit: boolean
    stopForAuthentication: boolean
    blockPaymentDetails: boolean
    stopAfterRepeatedFailure: boolean
  }
  notifications: {
    approvals: boolean
    failedRuns: boolean
    successfulRuns: boolean
  }
}

export type DashboardSummary = {
  agents: number
  liveAgents: number
  runsThisMonth: number
  pendingApprovals: number
  connectedExtensions: number
  reasoningReady: boolean
}

export type RunDetail = AgentRunRecord & {
  websiteUrl: string
  events: Array<{ id: string; state: string; title: string; detail: string; createdAt: string }>
  approvals: Array<{ id: string; action: string; details: string; status: string; createdAt: string; resolvedAt?: string | null }>
}
