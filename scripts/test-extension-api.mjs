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
await request('/api/extension/pair', { method: 'DELETE', cookie, body: JSON.stringify({ installationId }) })
await request('/api/extension/agents', { token: pairingToken, expected: 401 })

process.stdout.write(JSON.stringify({ ok: true, agentId, version: deployed.body.version, runId: started.body.runId, singleUseToken: 'verified', sync: 'verified', approvals: 'verified', revocation: 'verified' }, null, 2))
