import type { AccountSession, AgentRunRecord, ApprovalRecord, StoredAgent } from './types'

type ApiErrorBody = { error?: string; requestId?: string }

function responseError(response: Response, body: ApiErrorBody | null, rawBody: string) {
  if (body?.error) return body.error
  if (response.status === 401 || response.status === 403) return 'Your ForgeOS session has expired. Refresh the page and sign in again.'
  if (response.status === 404) return 'ForgeOS could not find that action. Refresh the page and try again.'
  if (response.status >= 500) return 'ForgeOS had a server problem while saving this agent. Your setup is still here—please try again.'
  if (!rawBody) return 'ForgeOS received an empty response while saving. Your setup is still here—please try again.'
  return 'ForgeOS received an unexpected response. Refresh the page and try again.'
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  const rawBody = await response.text()
  let body: (T & ApiErrorBody) | null = null

  if (rawBody) {
    try { body = JSON.parse(rawBody) as T & ApiErrorBody } catch { body = null }
  }

  if (response.status === 401 && !path.startsWith('/api/auth/')) {
    const next = `${window.location.pathname}${window.location.search}`
    window.location.assign(`/login?next=${encodeURIComponent(next)}`)
  }
  if (!response.ok || !body) throw new Error(responseError(response, body, rawBody))
  return body as T
}

export const productApi = {
  session: () => request<AccountSession>('/api/auth/session'),
  register: (payload: { name: string; email: string; password: string }) => request<AccountSession>('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) => request<AccountSession>('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
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
