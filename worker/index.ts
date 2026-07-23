import { runBookingTurn, type BookingAgentResponse, type BookingSession } from '../src/features/agent-builder/runtime/bookingAgent'
import { executeReasoningAgent } from './agentRuntime'

type D1Result<T = Record<string, unknown>> = { results?: T[] }
type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement
  run: () => Promise<unknown>
  first: <T = Record<string, unknown>>() => Promise<T | null>
  all: <T = Record<string, unknown>>() => Promise<D1Result<T>>
}
type D1Database = { prepare: (query: string) => D1PreparedStatement; batch: (statements: D1PreparedStatement[]) => Promise<unknown> }
type WorkerEnv = {
  ASSETS: { fetch: (request: Request) => Promise<Response>
  }
  DB?: D1Database
  OPENAI_API_KEY?: string
  OPENAI_MODEL?: string
}

type ChatPayload = { message?: string; session?: BookingSession; sessionId?: string }
type Identity = { id: string; email: string; name: string; workspaceId: string; workspaceName: string }

const SESSION_COOKIE = 'forgeos_session'
const SESSION_DAYS = 30
const PASSWORD_ITERATIONS = 120_000
const EXTENSION_DEPLOYMENT_MINUTES = 5

const corsHeaders = (request: Request) => ({
  'Access-Control-Allow-Origin': request.headers.get('Origin') ?? '*',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Vary': 'Origin',
})

function json(request: Request, body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...corsHeaders(request), 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8', ...(init?.headers || {}) },
  })
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=')
  const binary = atob(base64)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return bytesToBase64Url(new Uint8Array(digest))
}

function randomToken(bytes = 32) {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(bytes)))
}

function bearerToken(request: Request) {
  const authorization = request.headers.get('Authorization') || ''
  return authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : ''
}

async function hashPassword(password: string, salt: Uint8Array, iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256)
  return bytesToBase64Url(new Uint8Array(bits))
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return difference === 0
}

function cookieValue(request: Request, name: string) {
  const pair = request.headers.get('Cookie')?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`))
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : ''
}

function sessionCookie(request: Request, token: string, maxAge: number) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAge}`
}

async function createSession(db: D1Database, userId: string) {
  const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)))
  const sessionId = await sha256(token)
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString()
  await db.prepare('INSERT INTO user_sessions (id, user_id, expires_at) VALUES (?, ?, ?)').bind(sessionId, userId, expiresAt).run()
  return token
}

async function getSessionIdentity(request: Request, db: D1Database): Promise<Identity | null> {
  const token = cookieValue(request, SESSION_COOKIE)
  if (!token) return null
  const sessionId = await sha256(token)
  const row = await db.prepare("SELECT u.id, u.email, u.name, w.id AS workspace_id, w.name AS workspace_name FROM user_sessions s JOIN users u ON u.id = s.user_id JOIN workspaces w ON w.owner_user_id = u.id WHERE s.id = ? AND datetime(s.expires_at) > CURRENT_TIMESTAMP")
    .bind(sessionId).first<{ id: string; email: string; name: string; workspace_id: string; workspace_name: string }>()
  if (!row) return null
  return { id: row.id, email: row.email, name: row.name, workspaceId: row.workspace_id, workspaceName: row.workspace_name }
}

async function ensureAccount(db: D1Database, identity: Identity) {
  await db.batch([
    db.prepare('INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)').bind(identity.id, identity.email, identity.name),
    db.prepare('INSERT OR IGNORE INTO workspaces (id, name, owner_user_id) VALUES (?, ?, ?)').bind(identity.workspaceId, identity.workspaceName, identity.id),
    db.prepare('INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)').bind(identity.workspaceId, identity.id, 'owner'),
  ])
}

function accountBody(identity: Identity) {
  return {
    authenticated: true,
    user: { id: identity.id, email: identity.email, name: identity.name },
    workspace: { id: identity.workspaceId, name: identity.workspaceName, role: 'owner' },
  }
}

async function handleAuthSession(request: Request, env: WorkerEnv) {
  if (!env.DB) return json(request, { authenticated: false, user: null, workspace: null })
  const identity = await getSessionIdentity(request, env.DB)
  return json(request, identity ? accountBody(identity) : { authenticated: false, user: null, workspace: null })
}

async function handleRegister(request: Request, env: WorkerEnv) {
  if (!env.DB) return json(request, { error: 'Account storage is not available.' }, { status: 503 })
  let body: { name?: string; email?: string; password?: string }
  try { body = await request.json() as typeof body } catch { return json(request, { error: 'Enter your name, email, and password.' }, { status: 400 }) }
  const name = String(body.name || '').trim().slice(0, 100)
  const email = String(body.email || '').trim().toLowerCase().slice(0, 320)
  const password = String(body.password || '')
  if (name.length < 2) return json(request, { error: 'Enter your full name.' }, { status: 400 })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(request, { error: 'Enter a valid email address.' }, { status: 400 })
  if (password.length < 8 || password.length > 128) return json(request, { error: 'Use a password between 8 and 128 characters.' }, { status: 400 })

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>()
  if (existing) {
    const credential = await env.DB.prepare('SELECT user_id FROM auth_credentials WHERE user_id = ?').bind(existing.id).first<{ user_id: string }>()
    if (credential) return json(request, { error: 'An account already exists for this email. Sign in instead.' }, { status: 409 })
  }

  const userId = existing?.id || crypto.randomUUID()
  const ownedWorkspace = existing ? await env.DB.prepare('SELECT id, name FROM workspaces WHERE owner_user_id = ?').bind(userId).first<{ id: string; name: string }>() : null
  const workspaceId = ownedWorkspace?.id || `workspace:${userId}`
  const workspaceName = ownedWorkspace?.name || `${name}'s workspace`
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const passwordHash = await hashPassword(password, salt)
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO users (id, email, name) VALUES (?, ?, ?)').bind(userId, email, name),
    env.DB.prepare('UPDATE users SET name = ? WHERE id = ?').bind(name, userId),
    env.DB.prepare('INSERT OR IGNORE INTO workspaces (id, name, owner_user_id) VALUES (?, ?, ?)').bind(workspaceId, workspaceName, userId),
    env.DB.prepare('INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)').bind(workspaceId, userId, 'owner'),
    env.DB.prepare('INSERT INTO auth_credentials (user_id, password_hash, password_salt, password_iterations) VALUES (?, ?, ?, ?)').bind(userId, passwordHash, bytesToBase64Url(salt), PASSWORD_ITERATIONS),
  ])
  const token = await createSession(env.DB, userId)
  const identity = { id: userId, email, name, workspaceId, workspaceName }
  return json(request, accountBody(identity), { status: 201, headers: { 'Set-Cookie': sessionCookie(request, token, SESSION_DAYS * 86_400) } })
}

async function handleLogin(request: Request, env: WorkerEnv) {
  if (!env.DB) return json(request, { error: 'Account storage is not available.' }, { status: 503 })
  let body: { email?: string; password?: string }
  try { body = await request.json() as typeof body } catch { return json(request, { error: 'Enter your email and password.' }, { status: 400 }) }
  const email = String(body.email || '').trim().toLowerCase().slice(0, 320)
  const password = String(body.password || '')
  const row = await env.DB.prepare('SELECT u.id, u.email, u.name, c.password_hash, c.password_salt, c.password_iterations, w.id AS workspace_id, w.name AS workspace_name FROM auth_credentials c JOIN users u ON u.id = c.user_id JOIN workspaces w ON w.owner_user_id = u.id WHERE u.email = ?')
    .bind(email).first<{ id: string; email: string; name: string; password_hash: string; password_salt: string; password_iterations: number; workspace_id: string; workspace_name: string }>()
  if (!row) return json(request, { error: 'The email or password is incorrect.' }, { status: 401 })
  const candidateHash = await hashPassword(password, base64UrlToBytes(row.password_salt), row.password_iterations)
  if (!safeEqual(candidateHash, row.password_hash)) return json(request, { error: 'The email or password is incorrect.' }, { status: 401 })
  const token = await createSession(env.DB, row.id)
  const identity = { id: row.id, email: row.email, name: row.name, workspaceId: row.workspace_id, workspaceName: row.workspace_name }
  return json(request, accountBody(identity), { headers: { 'Set-Cookie': sessionCookie(request, token, SESSION_DAYS * 86_400) } })
}

async function handleLogout(request: Request, env: WorkerEnv) {
  const token = cookieValue(request, SESSION_COOKIE)
  if (token && env.DB) await env.DB.prepare('DELETE FROM user_sessions WHERE id = ?').bind(await sha256(token)).run()
  return json(request, { ok: true }, { headers: { 'Set-Cookie': sessionCookie(request, '', 0) } })
}

async function requireProductContext(request: Request, env: WorkerEnv) {
  if (!env.DB) return { error: json(request, { error: 'Workspace storage is not available in this preview.' }, { status: 503 }) }
  const identity = await getSessionIdentity(request, env.DB)
  if (!identity) return { error: json(request, { error: 'Sign in to access this ForgeOS workspace.' }, { status: 401 }) }
  return { identity, db: env.DB }
}

type ExtensionIdentity = {
  installationId: string
  workspaceId: string
  userId: string
  extensionVersion: string
  label: string
}

async function requireExtensionContext(request: Request, env: WorkerEnv) {
  if (!env.DB) return { error: json(request, { error: 'Workspace storage is not available.' }, { status: 503 }) }
  const token = bearerToken(request)
  if (!token) return { error: json(request, { error: 'Connect the ForgeOS extension again.' }, { status: 401 }) }
  const tokenHash = await sha256(token)
  const installation = await env.DB.prepare('SELECT installation_id, workspace_id, user_id, extension_version, label FROM extension_installations WHERE token_hash = ? AND revoked_at IS NULL')
    .bind(tokenHash).first<{ installation_id: string; workspace_id: string; user_id: string; extension_version: string; label: string }>()
  if (!installation) return { error: json(request, { error: 'This extension connection is no longer valid.' }, { status: 401 }) }
  await env.DB.prepare('UPDATE extension_installations SET last_seen_at = CURRENT_TIMESTAMP WHERE installation_id = ?').bind(installation.installation_id).run()
  const identity: ExtensionIdentity = {
    installationId: installation.installation_id,
    workspaceId: installation.workspace_id,
    userId: installation.user_id,
    extensionVersion: installation.extension_version,
    label: installation.label,
  }
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
  const context = await requireProductContext(request, env)
  if ('error' in context) return context.error
  await ensureAccount(context.db, context.identity)
  return json(request, accountBody(context.identity))
}

async function handleAgents(request: Request, env: WorkerEnv) {
  const context = await requireProductContext(request, env)
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
  const context = await requireProductContext(request, env)
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

async function handleExecuteAgent(request: Request, env: WorkerEnv, agentId: string) {
  const context = await requireProductContext(request, env)
  if ('error' in context) return context.error
  const agent = await getOwnedAgent(context.db, context.identity.workspaceId, agentId)
  if (!agent) return json(request, { error: 'Agent not found in this workspace.' }, { status: 404 })
  let body: { inputs?: Record<string, string> }
  try { body = await request.json() as typeof body } catch { return json(request, { error: 'Send the agent inputs as valid JSON.' }, { status: 400 }) }
  const inputs = Object.fromEntries(Object.entries(body.inputs || {}).slice(0, 40).map(([key, value]) => [key.slice(0, 120), String(value || '').slice(0, 20_000)]))
  const runId = crypto.randomUUID()
  await context.db.prepare('INSERT INTO agent_runs (id, agent_id, workspace_id, status, goal) VALUES (?, ?, ?, ?, ?)')
    .bind(runId, agent.id, context.identity.workspaceId, 'running', agent.goal).run()
  try {
    const result = await executeReasoningAgent(
      { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL },
      { templateId: agent.template_id, name: agent.name, goal: agent.goal, websiteUrl: agent.website_url, inputs },
    )
    await context.db.batch([
      context.db.prepare("UPDATE agent_runs SET status = 'completed', result = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?").bind(result.text, runId, context.identity.workspaceId),
      context.db.prepare('UPDATE agents SET last_run_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?').bind(agent.id, context.identity.workspaceId),
    ])
    return json(request, { runId, result })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'The agent reasoning run failed.'
    await context.db.prepare("UPDATE agent_runs SET status = 'failed', result = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?").bind(detail, runId, context.identity.workspaceId).run()
    return json(request, { error: detail, runId }, { status: env.OPENAI_API_KEY ? 502 : 503 })
  }
}

async function handleDeployAgent(request: Request, env: WorkerEnv, agentId: string) {
  const context = await requireProductContext(request, env)
  if ('error' in context) return context.error
  const agent = await getOwnedAgent(context.db, context.identity.workspaceId, agentId)
  if (!agent) return json(request, { error: 'Agent not found in this workspace.' }, { status: 404 })
  const body = await request.json() as { definition?: unknown; installationId?: string; autoRun?: boolean }
  if (!body.definition) return json(request, { error: 'Validate the workflow before deploying it.' }, { status: 400 })
  const installationId = String(body.installationId || '').trim().slice(0, 100)
  if (!installationId) return json(request, { error: 'Connect the ForgeOS extension before deploying.' }, { status: 409 })
  const installation = await context.db.prepare('SELECT installation_id FROM extension_installations WHERE installation_id = ? AND workspace_id = ? AND revoked_at IS NULL')
    .bind(installationId, context.identity.workspaceId).first<{ installation_id: string }>()
  if (!installation) return json(request, { error: 'Reconnect the ForgeOS extension before deploying.' }, { status: 409 })
  const row = await context.db.prepare('SELECT COALESCE(MAX(version), 0) AS version FROM agent_versions WHERE agent_id = ? AND workspace_id = ?').bind(agentId, context.identity.workspaceId).first<{ version: number }>()
  const version = Number(row?.version || 0) + 1
  const versionId = crypto.randomUUID()
  const deploymentToken = randomToken()
  const deploymentTokenHash = await sha256(deploymentToken)
  const deploymentId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + EXTENSION_DEPLOYMENT_MINUTES * 60_000).toISOString()
  await context.db.batch([
    context.db.prepare('INSERT INTO agent_versions (id, agent_id, workspace_id, version, definition_json) VALUES (?, ?, ?, ?, ?)').bind(versionId, agentId, context.identity.workspaceId, version, JSON.stringify(body.definition)),
    context.db.prepare('INSERT INTO extension_deployments (id, token_hash, installation_id, workspace_id, agent_id, version_id, auto_run, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(deploymentId, deploymentTokenHash, installationId, context.identity.workspaceId, agentId, versionId, body.autoRun ? 1 : 0, expiresAt),
    context.db.prepare("UPDATE agents SET status = 'live', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?").bind(agentId, context.identity.workspaceId),
  ])
  return json(request, {
    version,
    status: 'live',
    deploymentUrl: new URL(`/api/extension/deployments/${encodeURIComponent(deploymentToken)}`, request.url).toString(),
    expiresAt,
  })
}

async function handlePairExtension(request: Request, env: WorkerEnv) {
  const context = await requireProductContext(request, env)
  if ('error' in context) return context.error
  const body = await request.json() as { installationId?: string; extensionVersion?: string; label?: string }
  const installationId = String(body.installationId || '').trim().slice(0, 100)
  if (!/^[a-zA-Z0-9:_-]{8,100}$/.test(installationId)) return json(request, { error: 'The extension installation ID is invalid.' }, { status: 400 })
  const extensionVersion = String(body.extensionVersion || 'unknown').trim().slice(0, 30)
  const label = String(body.label || 'Chrome extension').trim().slice(0, 80)
  const pairingToken = randomToken()
  const tokenHash = await sha256(pairingToken)
  const id = crypto.randomUUID()
  await context.db.prepare(`INSERT INTO extension_installations (id, installation_id, workspace_id, user_id, token_hash, extension_version, label)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(installation_id) DO UPDATE SET workspace_id = excluded.workspace_id, user_id = excluded.user_id, token_hash = excluded.token_hash, extension_version = excluded.extension_version, label = excluded.label, last_seen_at = CURRENT_TIMESTAMP, revoked_at = NULL`)
    .bind(id, installationId, context.identity.workspaceId, context.identity.id, tokenHash, extensionVersion, label).run()
  return json(request, {
    pairingToken,
    workspace: { id: context.identity.workspaceId, name: context.identity.workspaceName },
    connectedAt: new Date().toISOString(),
  })
}

async function handleDisconnectExtension(request: Request, env: WorkerEnv) {
  const context = await requireProductContext(request, env)
  if ('error' in context) return context.error
  const body = await request.json() as { installationId?: string }
  const installationId = String(body.installationId || '').trim().slice(0, 100)
  await context.db.prepare('UPDATE extension_installations SET revoked_at = CURRENT_TIMESTAMP, token_hash = ? WHERE installation_id = ? AND workspace_id = ?')
    .bind(`revoked:${crypto.randomUUID()}`, installationId, context.identity.workspaceId).run()
  return json(request, { ok: true })
}

async function handleExtensionDeployment(request: Request, env: WorkerEnv, token: string) {
  const context = await requireExtensionContext(request, env)
  if ('error' in context) return context.error
  const tokenHash = await sha256(token)
  const row = await context.db.prepare(`SELECT d.id, d.installation_id, d.workspace_id, d.agent_id, d.version_id, d.auto_run, d.expires_at, d.consumed_at,
    v.version, v.definition_json, v.created_at, a.name, a.website_url, w.name AS workspace_name
    FROM extension_deployments d
    JOIN agent_versions v ON v.id = d.version_id
    JOIN agents a ON a.id = d.agent_id
    JOIN workspaces w ON w.id = d.workspace_id
    WHERE d.token_hash = ?`)
    .bind(tokenHash).first<Record<string, string | number | null>>()
  if (!row || row.installation_id !== context.identity.installationId || row.workspace_id !== context.identity.workspaceId) {
    return json(request, { error: 'This deployment does not belong to the connected extension.' }, { status: 403 })
  }
  if (row.consumed_at) return json(request, { error: 'This deployment link has already been used.' }, { status: 410 })
  if (Date.parse(String(row.expires_at)) <= Date.now()) return json(request, { error: 'This deployment link expired. Deploy the agent again.' }, { status: 410 })
  const snapshot = parseJson<Record<string, unknown>>(String(row.definition_json), {})
  const definition = (snapshot.runtime && typeof snapshot.runtime === 'object' ? snapshot.runtime : snapshot) as Record<string, unknown>
  const serializedDefinition = JSON.stringify(definition)
  await context.db.batch([
    context.db.prepare('UPDATE extension_deployments SET consumed_at = CURRENT_TIMESTAMP WHERE id = ?').bind(String(row.id)),
    context.db.prepare('UPDATE extension_installations SET last_seen_at = CURRENT_TIMESTAMP WHERE installation_id = ?').bind(context.identity.installationId),
  ])
  return json(request, {
    agent: {
      agentId: String(row.agent_id),
      versionId: String(row.version_id),
      version: Number(row.version),
      name: String(row.name),
      websiteUrl: String(row.website_url),
      definition,
      integrity: await sha256(serializedDefinition),
      publishedAt: String(row.created_at),
      workspace: { id: String(row.workspace_id), name: String(row.workspace_name) },
    },
    autoRun: Boolean(row.auto_run),
  })
}

async function handleExtensionAgents(request: Request, env: WorkerEnv) {
  const context = await requireExtensionContext(request, env)
  if ('error' in context) return context.error
  const result = await context.db.prepare(`SELECT a.id AS agent_id, a.name, a.website_url, v.id AS version_id, v.version, v.definition_json, v.created_at
    FROM agents a JOIN agent_versions v ON v.agent_id = a.id AND v.workspace_id = a.workspace_id
    WHERE a.workspace_id = ? AND v.version = (SELECT MAX(v2.version) FROM agent_versions v2 WHERE v2.agent_id = a.id AND v2.workspace_id = a.workspace_id)
    ORDER BY v.created_at DESC`)
    .bind(context.identity.workspaceId).all<Record<string, string | number>>()
  const agents = await Promise.all((result.results || []).map(async (row) => {
    const snapshot = parseJson<Record<string, unknown>>(String(row.definition_json), {})
    const definition = (snapshot.runtime && typeof snapshot.runtime === 'object' ? snapshot.runtime : snapshot) as Record<string, unknown>
    return {
      agentId: String(row.agent_id), versionId: String(row.version_id), version: Number(row.version), name: String(row.name), websiteUrl: String(row.website_url),
      definition, integrity: await sha256(JSON.stringify(definition)), publishedAt: String(row.created_at),
    }
  }))
  return json(request, { agents })
}

async function handleExtensionRuns(request: Request, env: WorkerEnv, runId?: string) {
  const context = await requireExtensionContext(request, env)
  if ('error' in context) return context.error
  const body = await request.json() as { agentId?: string; status?: string; goal?: string; result?: string }
  if (!runId && request.method === 'POST') {
    const agentId = String(body.agentId || '').slice(0, 100)
    const agent = await getOwnedAgent(context.db, context.identity.workspaceId, agentId)
    if (!agent) return json(request, { error: 'Agent not found in the paired workspace.' }, { status: 404 })
    const id = crypto.randomUUID()
    await context.db.prepare('INSERT INTO agent_runs (id, agent_id, workspace_id, status, goal, result) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, agentId, context.identity.workspaceId, String(body.status || 'running').slice(0, 30), String(body.goal || agent.goal).slice(0, 5_000), '').run()
    return json(request, { runId: id }, { status: 201 })
  }
  const status = String(body.status || 'completed').slice(0, 30)
  const completed = ['completed', 'failed', 'stopped'].includes(status)
  await context.db.prepare(`UPDATE agent_runs SET status = ?, result = ?, completed_at = ${completed ? 'CURRENT_TIMESTAMP' : 'completed_at'} WHERE id = ? AND workspace_id = ?`)
    .bind(status, String(body.result || '').slice(0, 20_000), String(runId), context.identity.workspaceId).run()
  return json(request, { ok: true })
}

async function handleExtensionReason(request: Request, env: WorkerEnv) {
  const context = await requireExtensionContext(request, env)
  if ('error' in context) return context.error
  let body: { agentId?: string; inputs?: Record<string, string>; pageEvidence?: string }
  try { body = await request.json() as typeof body } catch { return json(request, { error: 'Send valid reasoning input.' }, { status: 400 }) }
  const agentId = String(body.agentId || '').slice(0, 100)
  const agent = await getOwnedAgent(context.db, context.identity.workspaceId, agentId)
  if (!agent) return json(request, { error: 'The installed agent is no longer available in this workspace.' }, { status: 404 })
  const inputs = Object.fromEntries(Object.entries(body.inputs || {}).slice(0, 40).map(([key, value]) => [key.slice(0, 120), String(value || '').slice(0, 20_000)]))
  if (body.pageEvidence) inputs['visible browser evidence'] = String(body.pageEvidence).slice(0, 40_000)
  try {
    const result = await executeReasoningAgent(
      { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL },
      { templateId: agent.template_id, name: agent.name, goal: agent.goal, websiteUrl: agent.website_url, inputs },
    )
    return json(request, { result })
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'The specialist reasoning step failed.'
    return json(request, { error: detail }, { status: env.OPENAI_API_KEY ? 502 : 503 })
  }
}

async function handleExtensionRunEvent(request: Request, env: WorkerEnv, runId: string) {
  const context = await requireExtensionContext(request, env)
  if ('error' in context) return context.error
  const run = await context.db.prepare('SELECT agent_id FROM agent_runs WHERE id = ? AND workspace_id = ?').bind(runId, context.identity.workspaceId).first<{ agent_id: string }>()
  if (!run) return json(request, { error: 'Run not found.' }, { status: 404 })
  const body = await request.json() as { state?: string; title?: string; detail?: string }
  await context.db.prepare('INSERT INTO agent_run_events (id, run_id, agent_id, workspace_id, state, title, detail) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), runId, run.agent_id, context.identity.workspaceId, String(body.state || 'running').slice(0, 30), String(body.title || 'Agent activity').slice(0, 160), String(body.detail || '').slice(0, 5_000)).run()
  return json(request, { ok: true }, { status: 201 })
}

async function handleExtensionApproval(request: Request, env: WorkerEnv, approvalId?: string) {
  const context = await requireExtensionContext(request, env)
  if ('error' in context) return context.error
  const body = await request.json() as { runId?: string; agentId?: string; action?: string; details?: string; status?: string }
  if (!approvalId && request.method === 'POST') {
    const agent = await getOwnedAgent(context.db, context.identity.workspaceId, String(body.agentId || ''))
    if (!agent) return json(request, { error: 'Agent not found.' }, { status: 404 })
    const id = crypto.randomUUID()
    await context.db.prepare('INSERT INTO approval_requests (id, run_id, agent_id, workspace_id, action, details) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, String(body.runId || ''), agent.id, context.identity.workspaceId, String(body.action || 'Protected action').slice(0, 160), String(body.details || '').slice(0, 3_000)).run()
    return json(request, { approvalId: id }, { status: 201 })
  }
  const status = body.status === 'approved' ? 'approved' : 'rejected'
  await context.db.prepare('UPDATE approval_requests SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ? AND workspace_id = ?')
    .bind(status, String(approvalId), context.identity.workspaceId).run()
  return json(request, { ok: true })
}

async function handleVersions(request: Request, env: WorkerEnv, agentId: string, restoreVersion?: number) {
  const context = await requireProductContext(request, env)
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
  const context = await requireProductContext(request, env)
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
  const context = await requireProductContext(request, env)
  if ('error' in context) return context.error
  const result = await context.db.prepare('SELECT r.id, r.agent_id, a.name AS agent_name, r.status, r.goal, r.result, r.started_at, r.completed_at FROM agent_runs r JOIN agents a ON a.id = r.agent_id WHERE r.workspace_id = ? ORDER BY r.started_at DESC LIMIT 100').bind(context.identity.workspaceId).all<Record<string, string | null>>()
  return json(request, { runs: (result.results || []).map((row) => ({ id: row.id, agentId: row.agent_id, agentName: row.agent_name, status: row.status, goal: row.goal, result: row.result, startedAt: row.started_at, completedAt: row.completed_at })) })
}

async function handleApprovals(request: Request, env: WorkerEnv, approvalId?: string) {
  const context = await requireProductContext(request, env)
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
  const context = await requireProductContext(request, env)
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
      if (url.pathname === '/api/auth/session' && request.method === 'GET') return await handleAuthSession(request, env)
      if (url.pathname === '/api/auth/register' && request.method === 'POST') return await handleRegister(request, env)
      if (url.pathname === '/api/auth/login' && request.method === 'POST') return await handleLogin(request, env)
      if (url.pathname === '/api/auth/logout' && request.method === 'POST') return await handleLogout(request, env)
      if (url.pathname === '/api/account' && request.method === 'GET') return await handleAccount(request, env)
      if (url.pathname === '/api/extension/pair' && request.method === 'POST') return await handlePairExtension(request, env)
      if (url.pathname === '/api/extension/pair' && request.method === 'DELETE') return await handleDisconnectExtension(request, env)
      if (url.pathname === '/api/extension/agents' && request.method === 'GET') return await handleExtensionAgents(request, env)
      const extensionDeploymentMatch = url.pathname.match(/^\/api\/extension\/deployments\/([^/]+)$/)
      if (extensionDeploymentMatch && request.method === 'GET') return await handleExtensionDeployment(request, env, decodeURIComponent(extensionDeploymentMatch[1]))
      if (url.pathname === '/api/extension/runs' && request.method === 'POST') return await handleExtensionRuns(request, env)
      if (url.pathname === '/api/extension/reason' && request.method === 'POST') return await handleExtensionReason(request, env)
      const extensionRunMatch = url.pathname.match(/^\/api\/extension\/runs\/([^/]+)$/)
      if (extensionRunMatch && request.method === 'PATCH') return await handleExtensionRuns(request, env, decodeURIComponent(extensionRunMatch[1]))
      const extensionRunEventMatch = url.pathname.match(/^\/api\/extension\/runs\/([^/]+)\/events$/)
      if (extensionRunEventMatch && request.method === 'POST') return await handleExtensionRunEvent(request, env, decodeURIComponent(extensionRunEventMatch[1]))
      if (url.pathname === '/api/extension/approvals' && request.method === 'POST') return await handleExtensionApproval(request, env)
      const extensionApprovalMatch = url.pathname.match(/^\/api\/extension\/approvals\/([^/]+)$/)
      if (extensionApprovalMatch && request.method === 'PATCH') return await handleExtensionApproval(request, env, decodeURIComponent(extensionApprovalMatch[1]))
      if (url.pathname === '/api/agents' && ['GET', 'POST'].includes(request.method)) return await handleAgents(request, env)
      const agentMatch = url.pathname.match(/^\/api\/agents\/([^/]+)$/)
      if (agentMatch && ['GET', 'PATCH', 'DELETE'].includes(request.method)) return await handleSingleAgent(request, env, decodeURIComponent(agentMatch[1]))
      const executeAgentMatch = url.pathname.match(/^\/api\/agents\/([^/]+)\/execute$/)
      if (executeAgentMatch && request.method === 'POST') return await handleExecuteAgent(request, env, decodeURIComponent(executeAgentMatch[1]))
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
