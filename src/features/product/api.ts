import type { AccountSession, AgentRunRecord, ApprovalRecord, StoredAgent } from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  const body = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(body.error || 'ForgeOS could not complete that request.')
  return body
}

export const productApi = {
  session: () => request<AccountSession>('/api/account'),
  agents: () => request<{ agents: StoredAgent[] }>('/api/agents'),
  agent: (id: string) => request<{ agent: StoredAgent }>(`/api/agents/${encodeURIComponent(id)}`),
  createAgent: (payload: { templateId: string; name: string; websiteUrl: string; goal: string; nodes: unknown[]; edges: unknown[] }) => request<{ agent: StoredAgent }>('/api/agents', { method: 'POST', body: JSON.stringify(payload) }),
  updateAgent: (id: string, payload: Partial<StoredAgent>) => request<{ agent: StoredAgent }>(`/api/agents/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteAgent: (id: string) => request<{ ok: boolean }>(`/api/agents/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  deployAgent: (id: string, snapshot: unknown) => request<{ version: number; status: string }>(`/api/agents/${encodeURIComponent(id)}/deploy`, { method: 'POST', body: JSON.stringify({ definition: snapshot }) }),
  versions: (id: string) => request<{ versions: Array<{ id: string; version: number; createdAt: string }> }>(`/api/agents/${encodeURIComponent(id)}/versions`),
  restoreVersion: (id: string, version: number) => request<{ ok: boolean }>(`/api/agents/${encodeURIComponent(id)}/versions/${version}/restore`, { method: 'POST' }),
  recordRun: (id: string, payload: { status: string; goal: string; result?: string }) => request<{ runId: string }>(`/api/agents/${encodeURIComponent(id)}/runs`, { method: 'POST', body: JSON.stringify(payload) }),
  runs: () => request<{ runs: AgentRunRecord[] }>('/api/runs'),
  approvals: () => request<{ approvals: ApprovalRecord[] }>('/api/approvals'),
  resolveApproval: (id: string, status: 'approved' | 'rejected') => request<{ ok: boolean }>(`/api/approvals/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  connections: () => request<{ connections: Array<{ id: string; provider: string; status: string }> }>('/api/connections'),
}
