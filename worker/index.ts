import { runBookingTurn, type BookingAgentResponse, type BookingSession } from '../src/features/agent-builder/runtime/bookingAgent'

type D1Result<T = Record<string, unknown>> = { results?: T[] }
type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement
  run: () => Promise<unknown>
  first: <T = Record<string, unknown>>() => Promise<T | null>
  all: <T = Record<string, unknown>>() => Promise<D1Result<T>>
}
type D1Database = { prepare: (query: string) => D1PreparedStatement; batch: (statements: D1PreparedStatement[]) => Promise<unknown> }
type WorkerEnv = { ASSETS: { fetch: (request: Request) => Promise<Response> }; DB?: D1Database }

type ChatPayload = { message?: string; session?: BookingSession; sessionId?: string }
type Identity = { id: string; email: string; name: string; workspaceId: string; workspaceName: string }

const corsHeaders = (request: Request) => ({
  'Access-Control-Allow-Origin': request.headers.get('Origin') ?? '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Vary': 'Origin',
})

function json(request: Request, body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...corsHeaders(request), 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8', ...(init?.headers || {}) },
  })
}

function decodeName(request: Request) {
  const value = request.headers.get('oai-authenticated-user-full-name')
  const encoding = request.headers.get('oai-authenticated-user-full-name-encoding')
  if (!value || encoding !== 'percent-encoded-utf-8') return ''
  try { return decodeURIComponent(value) } catch { return '' }
}

function getIdentity(request: Request): Identity | null {
  const url = new URL(request.url)
  const forwardedEmail = request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase()
  const email = forwardedEmail || (['localhost', '127.0.0.1'].includes(url.hostname) ? 'local-preview@forgeos.dev' : '')
  if (!email) return null
  const name = decodeName(request) || (email === 'local-preview@forgeos.dev' ? 'Local Preview' : email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (value) => value.toUpperCase()))
  return { id: `user:${email}`, email, name, workspaceId: `workspace:${email}`, workspaceName: `${name}'s workspace` }
}

async function ensureAccount(db: D1Database, identity: Identity) {
  await db.batch([
    db.prepare('INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)').bind(identity.id, identity.email, identity.name),
    db.prepare('INSERT OR IGNORE INTO workspaces (id, name, owner_user_id) VALUES (?, ?, ?)').bind(identity.workspaceId, identity.workspaceName, identity.id),
    db.prepare('INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)').bind(identity.workspaceId, identity.id, 'owner'),
  ])
}

function requireProductContext(request: Request, env: WorkerEnv) {
  const identity = getIdentity(request)
  if (!identity) return { error: json(request, { error: 'Sign in to access this ForgeOS workspace.' }, { status: 401 }) }
  if (!env.DB) return { error: json(request, { error: 'Workspace storage is not available in this preview.' }, { status: 503 }) }
  return { identity, db: env.DB }
}

type AgentRow = {
  id: string; workspace_id: string; template_id: string; name: string; status: string; website_url: string; goal: string;
  nodes_json: string; edges_json: string; last_run_at: string | null; created_at: string; updated_at: string
}

function parseJson<T>(value: string, fallback: T): T { try { return JSON.parse(value) as T } catch { return fallback } }
function mapAgent(row: AgentRow) {
  return {
    id: row.id, workspaceId: row.workspace_id, templateId: row.template_id, name: row.name, status: row.status,
    websiteUrl: row.website_url, goal: row.goal, nodes: parseJson(row.nodes_json, []), edges: parseJson(row.edges_json, []),
    lastRunAt: row.last_run_at, createdAt: row.created_at, updatedAt: row.updated_at,
  }
}

async function getOwnedAgent(db: D1Database, workspaceId: string, agentId: string) {
  return db.prepare('SELECT * FROM agents WHERE id = ? AND workspace_id = ?').bind(agentId, workspaceId).first<AgentRow>()
}

async function handleAccount(request: Request, env: WorkerEnv) {
  const context = requireProductContext(request, env)
  if ('error' in context) return context.error
  await ensureAccount(context.db, context.identity)
  return json(request, { authenticated: true, user: { id: context.identity.id, email: context.identity.email, name: context.identity.name }, workspace: { id: context.identity.workspaceId, name: context.identity.workspaceName, role: 'owner' } })
}

async function handleAgents(request: Request, env: WorkerEnv) {
  const context = requireProductContext(request, env)
  if ('error' in context) return context.error
  await ensureAccount(context.db, context.identity)
  if (request.method === 'GET') {
    const result = await context.db.prepare('SELECT * FROM agents WHERE workspace_id = ? ORDER BY updated_at DESC').bind(context.identity.workspaceId).all<AgentRow>()
    return json(request, { agents: (result.results || []).map(mapAgent) })
  }
  let body: Record<string, unknown>
  try { body = await request.json() as Record<string, unknown> } catch { return json(request, { error: 'The agent setup was not valid JSON. Please review it and try again.' }, { status: 400 }) }
  const name = String(body.name || '').trim().slice(0, 120)
  const websiteUrl = String(body.websiteUrl || '').trim().slice(0, 1_500)
  const goal = String(body.goal || '').trim().slice(0, 5_000)
  if (!name || !/^https:\/\//i.test(websiteUrl) || !goal) return json(request, { error: 'Provide an agent name, HTTPS website, and goal.' }, { status: 400 })
  const id = crypto.randomUUID()
  await context.db.prepare('INSERT INTO agents (id, workspace_id, template_id, name, status, website_url, goal, nodes_json, edges_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(id, context.identity.workspaceId, String(body.templateId || 'custom-browser'), name, 'draft', websiteUrl, goal, JSON.stringify(body.nodes || []), JSON.stringify(body.edges || [])).run()
  const row = await getOwnedAgent(context.db, context.identity.workspaceId, id)
  return json(request, { agent: row ? mapAgent(row) : null }, { status: 201 })
}

async function handleSingleAgent(request: Request, env: WorkerEnv, agentId: string) {
  const context = requireProductContext(request, env)
  if ('error' in context) return context.error
  await ensureAccount(context.db, context.identity)
  const existing = await getOwnedAgent(context.db, context.identity.workspaceId, agentId)
  if (!existing) return json(request, { error: 'Agent not found in this workspace.' }, { status: 404 })
  if (request.method === 'GET') return json(request, { agent: mapAgent(existing) })
  if (request.method === 'DELETE') {
    await context.db.batch([
      context.db.prepare('DELETE FROM approval_requests WHERE agent_id = ? AND workspace_id = ?').bind(agentId, context.identity.workspaceId),
      context.db.prepare('DELETE FROM agent_runs WHERE agent_id = ? AND workspace_id = ?').bind(agentId, context.identity.workspaceId),
      context.db.prepare('DELETE FROM agent_versions WHERE agent_id = ? AND workspace_id = ?').bind(agentId, context.identity.workspaceId),
      context.db.prepare('DELETE FROM agents WHERE id = ? AND workspace_id = ?').bind(agentId, context.identity.workspaceId),
    ])
    return json(request, { ok: true })
  }
  const body = await request.json() as Record<string, unknown>
  const name = String(body.name ?? existing.name).trim().slice(0, 120)
  const status = String(body.status ?? existing.status).slice(0, 30)
  const websiteUrl = String(body.websiteUrl ?? existing.website_url).trim().slice(0, 1_500)
  const goal = String(body.goal ?? existing.goal).trim().slice(0, 5_000)
  const nodes = body.nodes ?? parseJson(existing.nodes_json, [])
  const edges = body.edges ?? parseJson(existing.edges_json, [])
  await context.db.prepare('UPDATE agents SET name = ?, status = ?, website_url = ?, goal = ?, nodes_json = ?, edges_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?')
    .bind(name, status, websiteUrl, goal, JSON.stringify(nodes), JSON.stringify(edges), agentId, context.identity.workspaceId).run()
  const updated = await getOwnedAgent(context.db, context.identity.workspaceId, agentId)
  return json(request, { agent: updated ? mapAgent(updated) : null })
}

async function handleDeployAgent(request: Request, env: WorkerEnv, agentId: string) {
  const context = requireProductContext(request, env)
  if ('error' in context) return context.error
  const agent = await getOwnedAgent(context.db, context.identity.workspaceId, agentId)
  if (!agent) return json(request, { error: 'Agent not found in this workspace.' }, { status: 404 })
  const body = await request.json() as { definition?: unknown }
  if (!body.definition) return json(request, { error: 'Validate the workflow before deploying it.' }, { status: 400 })
  const row = await context.db.prepare('SELECT COALESCE(MAX(version), 0) AS version FROM agent_versions WHERE agent_id = ? AND workspace_id = ?').bind(agentId, context.identity.workspaceId).first<{ version: number }>()
  const version = Number(row?.version || 0) + 1
  await context.db.batch([
    context.db.prepare('INSERT INTO agent_versions (id, agent_id, workspace_id, version, definition_json) VALUES (?, ?, ?, ?, ?)').bind(crypto.randomUUID(), agentId, context.identity.workspaceId, version, JSON.stringify(body.definition)),
    context.db.prepare("UPDATE agents SET status = 'live', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?").bind(agentId, context.identity.workspaceId),
  ])
  return json(request, { version, status: 'live' })
}

async function handleVersions(request: Request, env: WorkerEnv, agentId: string, restoreVersion?: number) {
  const context = requireProductContext(request, env)
  if ('error' in context) return context.error
  const agent = await getOwnedAgent(context.db, context.identity.workspaceId, agentId)
  if (!agent) return json(request, { error: 'Agent not found in this workspace.' }, { status: 404 })
  if (restoreVersion && request.method === 'POST') {
    const row = await context.db.prepare('SELECT definition_json FROM agent_versions WHERE agent_id = ? AND workspace_id = ? AND version = ?').bind(agentId, context.identity.workspaceId, restoreVersion).first<{ definition_json: string }>()
    if (!row) return json(request, { error: 'That agent version no longer exists.' }, { status: 404 })
    const snapshot = parseJson<Record<string, unknown>>(row.definition_json, {})
    if (!Array.isArray(snapshot.nodes) || !Array.isArray(snapshot.edges)) return json(request, { error: 'This older version does not contain an editable graph snapshot.' }, { status: 409 })
    await context.db.prepare("UPDATE agents SET name = ?, nodes_json = ?, edges_json = ?, status = 'draft', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?")
      .bind(String(snapshot.name || agent.name), JSON.stringify(snapshot.nodes), JSON.stringify(snapshot.edges), agentId, context.identity.workspaceId).run()
    return json(request, { ok: true })
  }
  const result = await context.db.prepare('SELECT id, version, created_at FROM agent_versions WHERE agent_id = ? AND workspace_id = ? ORDER BY version DESC').bind(agentId, context.identity.workspaceId).all<{ id: string; version: number; created_at: string }>()
  return json(request, { versions: (result.results || []).map((row) => ({ id: row.id, version: row.version, createdAt: row.created_at })) })
}

async function handleRecordRun(request: Request, env: WorkerEnv, agentId: string) {
  const context = requireProductContext(request, env)
  if ('error' in context) return context.error
  const agent = await getOwnedAgent(context.db, context.identity.workspaceId, agentId)
  if (!agent) return json(request, { error: 'Agent not found in this workspace.' }, { status: 404 })
  const body = await request.json() as { status?: string; goal?: string; result?: string }
  const id = crypto.randomUUID()
  const status = String(body.status || 'completed').slice(0, 30)
  await context.db.batch([
    context.db.prepare('INSERT INTO agent_runs (id, agent_id, workspace_id, status, goal, result, completed_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)').bind(id, agentId, context.identity.workspaceId, status, String(body.goal || agent.goal).slice(0, 5_000), String(body.result || '').slice(0, 10_000)),
    context.db.prepare('UPDATE agents SET last_run_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?').bind(agentId, context.identity.workspaceId),
  ])
  return json(request, { runId: id }, { status: 201 })
}

async function handleRuns(request: Request, env: WorkerEnv) {
  const context = requireProductContext(request, env)
  if ('error' in context) return context.error
  const result = await context.db.prepare('SELECT r.id, r.agent_id, a.name AS agent_name, r.status, r.goal, r.result, r.started_at, r.completed_at FROM agent_runs r JOIN agents a ON a.id = r.agent_id WHERE r.workspace_id = ? ORDER BY r.started_at DESC LIMIT 100').bind(context.identity.workspaceId).all<Record<string, string | null>>()
  return json(request, { runs: (result.results || []).map((row) => ({ id: row.id, agentId: row.agent_id, agentName: row.agent_name, status: row.status, goal: row.goal, result: row.result, startedAt: row.started_at, completedAt: row.completed_at })) })
}

async function handleApprovals(request: Request, env: WorkerEnv, approvalId?: string) {
  const context = requireProductContext(request, env)
  if ('error' in context) return context.error
  if (approvalId && request.method === 'PATCH') {
    const body = await request.json() as { status?: string }
    const status = body.status === 'approved' ? 'approved' : body.status === 'rejected' ? 'rejected' : ''
    if (!status) return json(request, { error: 'Choose approved or rejected.' }, { status: 400 })
    await context.db.prepare('UPDATE approval_requests SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?').bind(status, approvalId, context.identity.workspaceId).run()
    return json(request, { ok: true })
  }
  const result = await context.db.prepare('SELECT p.id, p.agent_id, a.name AS agent_name, p.action, p.details, p.status, p.created_at FROM approval_requests p JOIN agents a ON a.id = p.agent_id WHERE p.workspace_id = ? ORDER BY p.created_at DESC LIMIT 100').bind(context.identity.workspaceId).all<Record<string, string>>()
  return json(request, { approvals: (result.results || []).map((row) => ({ id: row.id, agentId: row.agent_id, agentName: row.agent_name, action: row.action, details: row.details, status: row.status, createdAt: row.created_at })) })
}

async function handleConnections(request: Request, env: WorkerEnv) {
  const context = requireProductContext(request, env)
  if ('error' in context) return context.error
  const result = await context.db.prepare('SELECT id, provider, status FROM workspace_connections WHERE workspace_id = ? ORDER BY provider').bind(context.identity.workspaceId).all<{ id: string; provider: string; status: string }>()
  return json(request, { connections: result.results || [] })
}

async function saveBookingTurn(env: WorkerEnv, sessionId: string, message: string, result: BookingAgentResponse) {
  if (!env.DB) return
  const statements = [
    env.DB.prepare('INSERT INTO agent_messages (session_id, role, message) VALUES (?, ?, ?)').bind(sessionId, 'visitor', message),
    env.DB.prepare('INSERT INTO agent_messages (session_id, role, message) VALUES (?, ?, ?)').bind(sessionId, 'agent', result.reply),
  ]
  if (result.booking) statements.push(env.DB.prepare('INSERT OR IGNORE INTO booking_requests (reference, session_id, service_id, service_name, preferred_date, preferred_time, customer_name, customer_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(result.booking.reference, sessionId, result.booking.serviceId, result.booking.serviceName, result.booking.preferredDate, result.booking.preferredTime, result.booking.customerName, result.booking.customerEmail))
  await env.DB.batch(statements)
}

async function handleAgentChat(request: Request, env: WorkerEnv) {
  let payload: ChatPayload
  try { payload = await request.json() as ChatPayload } catch { return json(request, { error: 'Send a valid JSON request.' }, { status: 400 }) }
  const message = payload.message?.trim() ?? ''
  if (message.length > 1_000) return json(request, { error: 'Keep each message below 1,000 characters.' }, { status: 400 })
  const sessionId = payload.sessionId?.slice(0, 100) || crypto.randomUUID()
  const result = runBookingTurn(message, payload.session)
  await saveBookingTurn(env, sessionId, message || '[conversation opened]', result)
  return json(request, { ...result, sessionId })
}

export default {
  async fetch(request: Request, env: WorkerEnv) {
    const url = new URL(request.url)
    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) return new Response(null, { status: 204, headers: corsHeaders(request) })
    try {
      if (url.pathname === '/api/health') return json(request, { ok: true, product: 'forgeos', storage: env.DB ? 'connected' : 'preview' })
      if (url.pathname === '/api/account' && request.method === 'GET') return await handleAccount(request, env)
      if (url.pathname === '/api/agents' && ['GET', 'POST'].includes(request.method)) return await handleAgents(request, env)
      const agentMatch = url.pathname.match(/^\/api\/agents\/([^/]+)$/)
      if (agentMatch && ['GET', 'PATCH', 'DELETE'].includes(request.method)) return await handleSingleAgent(request, env, decodeURIComponent(agentMatch[1]))
      const deployMatch = url.pathname.match(/^\/api\/agents\/([^/]+)\/deploy$/)
      if (deployMatch && request.method === 'POST') return await handleDeployAgent(request, env, decodeURIComponent(deployMatch[1]))
      const versionsMatch = url.pathname.match(/^\/api\/agents\/([^/]+)\/versions$/)
      if (versionsMatch && request.method === 'GET') return await handleVersions(request, env, decodeURIComponent(versionsMatch[1]))
      const restoreMatch = url.pathname.match(/^\/api\/agents\/([^/]+)\/versions\/(\d+)\/restore$/)
      if (restoreMatch && request.method === 'POST') return await handleVersions(request, env, decodeURIComponent(restoreMatch[1]), Number(restoreMatch[2]))
      const runMatch = url.pathname.match(/^\/api\/agents\/([^/]+)\/runs$/)
      if (runMatch && request.method === 'POST') return await handleRecordRun(request, env, decodeURIComponent(runMatch[1]))
      if (url.pathname === '/api/runs' && request.method === 'GET') return await handleRuns(request, env)
      if (url.pathname === '/api/approvals' && request.method === 'GET') return await handleApprovals(request, env)
      const approvalMatch = url.pathname.match(/^\/api\/approvals\/([^/]+)$/)
      if (approvalMatch && request.method === 'PATCH') return await handleApprovals(request, env, decodeURIComponent(approvalMatch[1]))
      if (url.pathname === '/api/connections' && request.method === 'GET') return await handleConnections(request, env)
      if (url.pathname === '/api/agents/demo-booking/chat' && request.method === 'POST') return await handleAgentChat(request, env)
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unexpected ForgeOS error'
      return json(request, { error: detail }, { status: 500 })
    }
    if (url.pathname.startsWith('/api/')) return json(request, { error: 'ForgeOS API route not found.' }, { status: 404 })
    const response = await env.ASSETS.fetch(request)
    if (response.status !== 404 || request.method !== 'GET') return response
    url.pathname = '/index.html'
    return env.ASSETS.fetch(new Request(url, request))
  },
}
