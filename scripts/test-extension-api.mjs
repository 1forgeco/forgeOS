const apiBase = process.env.FORGEOS_TEST_API || 'http://127.0.0.1:8787'
const email = `extension-test-${Date.now()}@example.com`

async function request(path, { cookie, token, expected = 200, ...init } = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  })
  const body = await response.json()
  if (response.status !== expected) throw new Error(`${init.method || 'GET'} ${path}: expected ${expected}, received ${response.status} (${body.error || 'no error message'})`)
  return { response, body }
}

const registered = await request('/api/auth/register', {
  method: 'POST',
  expected: 201,
  body: JSON.stringify({ name: 'Extension Test', email, password: 'forgeos-test-password' }),
})
const cookie = registered.response.headers.get('set-cookie')?.split(';')[0]
if (!cookie) throw new Error('Registration did not return a session cookie.')

const accountUpdated = await request('/api/account', {
  method: 'PATCH', cookie,
  body: JSON.stringify({ name: 'Extension Test Owner', workspaceName: 'Protocol workspace' }),
})
if (accountUpdated.body.user.name !== 'Extension Test Owner' || accountUpdated.body.workspace.name !== 'Protocol workspace') throw new Error('Account details did not persist.')
await request('/api/settings', {
  method: 'PATCH', cookie,
  body: JSON.stringify({ settings: { safety: { askBeforeSubmit: true, stopForAuthentication: true, blockPaymentDetails: true, stopAfterRepeatedFailure: true }, notifications: { approvals: true, failedRuns: true, successfulRuns: true } } }),
})
const settings = await request('/api/settings', { cookie })
if (!settings.body.settings.notifications.successfulRuns) throw new Error('Workspace settings did not persist.')
const emptyDashboard = await request('/api/dashboard', { cookie })
if (emptyDashboard.body.agents !== 0) throw new Error('New workspace dashboard was not empty.')

const created = await request('/api/agents', {
  method: 'POST', cookie, expected: 201,
  body: JSON.stringify({ templateId: 'custom-browser', name: 'Extension protocol test', websiteUrl: 'https://example.com', goal: 'Find example results', nodes: [], edges: [] }),
})
const agentId = created.body.agent.id
const installationId = `test-${crypto.randomUUID()}`
const paired = await request('/api/extension/pair', {
  method: 'POST', cookie,
  body: JSON.stringify({ installationId, extensionVersion: '0.3.0', label: 'Integration test' }),
})
const pairingToken = paired.body.pairingToken
const runtime = {
  schemaVersion: 1,
  id: 'custom-browser-agent',
  name: 'Extension protocol test',
  version: 1,
  websiteUrl: 'https://example.com',
  allowedDomains: ['example.com'],
  goal: 'Find example results',
  completionCriteria: 'Visible results are collected',
  inputs: [],
  allowedActions: ['search', 'type', 'extract'],
  approvalActions: ['before submitting protected forms'],
  maximumSteps: 10,
  resultFormat: 'short summary',
  fallbackInstructions: 'Pause and ask the user.',
}
const deployed = await request(`/api/agents/${encodeURIComponent(agentId)}/deploy`, {
  method: 'POST', cookie,
  body: JSON.stringify({ definition: { runtime, name: runtime.name, nodes: [], edges: [] }, installationId, autoRun: false }),
})
const deploymentUrl = new URL(deployed.body.deploymentUrl)
const fetched = await request(`${deploymentUrl.pathname}${deploymentUrl.search}`, { token: pairingToken })
if (fetched.body.agent.agentId !== agentId || fetched.body.agent.definition.schemaVersion !== 1) throw new Error('Fetched deployment did not match the published agent.')
await request(`${deploymentUrl.pathname}${deploymentUrl.search}`, { token: pairingToken, expected: 410 })

const library = await request('/api/extension/agents', { token: pairingToken })
if (!library.body.agents.some((agent) => agent.agentId === agentId)) throw new Error('Published agent was missing from extension sync.')
const started = await request('/api/extension/runs', { method: 'POST', token: pairingToken, expected: 201, body: JSON.stringify({ agentId, status: 'running', goal: runtime.goal }) })
await request(`/api/extension/runs/${started.body.runId}/events`, { method: 'POST', token: pairingToken, expected: 201, body: JSON.stringify({ state: 'running', title: 'Test action', detail: 'Protocol event persisted.' }) })
const approval = await request('/api/extension/approvals', { method: 'POST', token: pairingToken, expected: 201, body: JSON.stringify({ runId: started.body.runId, agentId, action: 'Submit form', details: 'Integration approval' }) })
await request(`/api/extension/approvals/${approval.body.approvalId}`, { method: 'PATCH', token: pairingToken, body: JSON.stringify({ status: 'approved' }) })
await request(`/api/extension/runs/${started.body.runId}`, { method: 'PATCH', token: pairingToken, body: JSON.stringify({ status: 'completed', result: 'Protocol verified.' }) })
const runDetail = await request(`/api/runs/${started.body.runId}`, { cookie })
if (runDetail.body.run.events.length !== 1 || runDetail.body.run.approvals.length !== 1 || runDetail.body.run.status !== 'completed') throw new Error('Run detail did not include its persisted activity and approval.')
const dashboard = await request('/api/dashboard', { cookie })
if (dashboard.body.agents !== 1 || dashboard.body.runsThisMonth !== 1 || dashboard.body.connectedExtensions !== 1) throw new Error('Dashboard counts did not reflect persisted activity.')
const exported = await request('/api/account/export', { cookie })
if (exported.body.agents.length !== 1 || exported.body.runs.length !== 1 || !exported.body.preferences) throw new Error('Workspace export was incomplete.')
const passwordChanged = await request('/api/account/password', {
  method: 'POST', cookie,
  body: JSON.stringify({ currentPassword: 'forgeos-test-password', newPassword: 'forgeos-test-password-updated' }),
})
const refreshedCookie = passwordChanged.response.headers.get('set-cookie')?.split(';')[0]
if (!refreshedCookie) throw new Error('Password change did not rotate the session.')
await request('/api/extension/pair', { method: 'DELETE', cookie: refreshedCookie, body: JSON.stringify({ installationId }) })
await request('/api/extension/agents', { token: pairingToken, expected: 401 })

process.stdout.write(JSON.stringify({ ok: true, agentId, version: deployed.body.version, runId: started.body.runId, singleUseToken: 'verified', sync: 'verified', approvals: 'verified', runDetail: 'verified', settings: 'verified', export: 'verified', passwordRotation: 'verified', revocation: 'verified' }, null, 2))
