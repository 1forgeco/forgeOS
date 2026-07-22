let agents = []
let activeAgentId = null
let activeRunId = null
let pendingApprovalRunId = null

const empty = document.querySelector('#empty')
const library = document.querySelector('#library')
const agentSection = document.querySelector('#agent')
const activity = document.querySelector('#activity')
const events = document.querySelector('#events')
const approvalCard = document.querySelector('#approval-card')

function activeAgent() {
  return agents.find((item) => item.agentId === activeAgentId) || agents[0] || null
}

function text(element, value) {
  element.textContent = value == null || value === '' ? 'None' : String(value)
}

function renderLibrary() {
  empty.hidden = agents.length > 0
  library.hidden = agents.length === 0
  agentSection.hidden = agents.length === 0
  text(document.querySelector('#agent-count'), `${agents.length} installed`)
  const list = document.querySelector('#agent-list')
  list.replaceChildren(...agents.map((item) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = item.agentId === activeAgentId ? 'active' : ''
    button.addEventListener('click', () => selectAgent(item.agentId))
    const mark = document.createElement('i')
    mark.textContent = item.name.slice(0, 1).toUpperCase()
    const copy = document.createElement('span')
    const name = document.createElement('strong')
    name.textContent = item.name
    const meta = document.createElement('small')
    meta.textContent = `v${item.version} · ${new URL(item.websiteUrl).hostname}`
    copy.append(name, meta)
    const state = document.createElement('b')
    state.textContent = item.lastRunAt ? 'RUN' : 'READY'
    button.append(mark, copy, state)
    return button
  }))
  renderAgent()
}

function renderAgent() {
  const item = activeAgent()
  if (!item) return
  activeAgentId = item.agentId
  const workflow = item.definition
  text(document.querySelector('#name'), item.name)
  text(document.querySelector('#goal'), workflow.goal)
  text(document.querySelector('#website'), workflow.websiteUrl)
  text(document.querySelector('#actions'), (workflow.allowedActions || []).join(', '))
  text(document.querySelector('#approval'), (workflow.approvalActions || []).join(', ') || 'No protected actions configured')
  text(document.querySelector('#version'), `VERSION ${item.version}`)
  const inputArea = document.querySelector('#inputs')
  inputArea.replaceChildren(...(workflow.inputs || []).map((field) => {
    const label = document.createElement('label')
    label.textContent = field
    const input = document.createElement('input')
    input.dataset.field = field
    input.placeholder = `Enter ${field}`
    label.append(input)
    return label
  }))
  document.querySelectorAll('#agent-list button').forEach((button, index) => button.classList.toggle('active', agents[index]?.agentId === item.agentId))
}

async function selectAgent(agentId) {
  activeAgentId = agentId
  await chrome.storage.local.set({ forgeosActiveAgentId: agentId })
  renderLibrary()
}

function appendEvent(message) {
  const item = document.createElement('li')
  item.className = message.state
  const title = document.createElement('b')
  title.textContent = message.title
  const detail = document.createElement('p')
  detail.textContent = message.detail
  item.append(title, detail)
  events.append(item)
  item.scrollIntoView({ block: 'nearest' })
}

function setRunState(state) {
  text(document.querySelector('#run-state'), state)
  const active = ['Running', 'Paused', 'Stopping'].includes(state)
  document.querySelector('#run-controls').hidden = !active
  document.querySelector('#run').disabled = active
}

document.querySelector('#sync').addEventListener('click', async () => {
  const button = document.querySelector('#sync')
  button.classList.add('spinning')
  const response = await chrome.runtime.sendMessage({ type: 'FORGEOS_SYNC_AGENTS' })
  button.classList.remove('spinning')
  if (response?.ok) { agents = response.agents; renderLibrary() }
  else window.alert(response?.error || 'Connect the extension from ForgeOS before syncing.')
})

document.querySelector('#run').addEventListener('click', () => {
  const item = activeAgent()
  if (!item) return
  const inputs = Object.fromEntries([...document.querySelectorAll('[data-field]')].map((input) => [input.dataset.field, input.value]))
  const missing = item.definition.inputs.filter((field) => !String(inputs[field] || '').trim())
  if (missing.length) { window.alert(`Enter ${missing.join(', ')} before running.`); return }
  events.replaceChildren()
  activity.hidden = false
  setRunState('Running')
  chrome.action.setBadgeText({ text: '' }).catch(() => {})
  chrome.runtime.sendMessage({ type: 'FORGEOS_RUN', agentId: item.agentId, inputs, options: { openInNewTab: !document.querySelector('#current-tab').checked } })
    .then((response) => { if (!response?.ok) { appendEvent({ state: 'error', title: 'Run stopped', detail: response?.error || 'Unexpected extension error' }); setRunState('Stopped') } })
})

document.querySelector('#pause').addEventListener('click', () => activeRunId && chrome.runtime.sendMessage({ type: 'FORGEOS_CONTROL', runId: activeRunId, action: 'pause' }))
document.querySelector('#resume').addEventListener('click', () => activeRunId && chrome.runtime.sendMessage({ type: 'FORGEOS_CONTROL', runId: activeRunId, action: 'resume' }))
document.querySelector('#stop').addEventListener('click', () => activeRunId && chrome.runtime.sendMessage({ type: 'FORGEOS_CONTROL', runId: activeRunId, action: 'stop' }))

document.querySelector('#approve').addEventListener('click', () => {
  if (!pendingApprovalRunId) return
  chrome.runtime.sendMessage({ type: 'FORGEOS_APPROVAL_DECISION', runId: pendingApprovalRunId, approved: true })
  approvalCard.hidden = true
  pendingApprovalRunId = null
})

document.querySelector('#reject').addEventListener('click', () => {
  if (!pendingApprovalRunId) return
  chrome.runtime.sendMessage({ type: 'FORGEOS_APPROVAL_DECISION', runId: pendingApprovalRunId, approved: false })
  approvalCard.hidden = true
  pendingApprovalRunId = null
})

document.querySelector('#edit').addEventListener('click', async () => {
  const item = activeAgent()
  const stored = await chrome.storage.local.get('forgeosApiBase')
  if (item && stored.forgeosApiBase) chrome.tabs.create({ url: `${stored.forgeosApiBase}/app/${encodeURIComponent(item.agentId)}` })
})

document.querySelector('#remove').addEventListener('click', async () => {
  const item = activeAgent()
  if (!item || !window.confirm(`Remove ${item.name} from this browser?`)) return
  const response = await chrome.runtime.sendMessage({ type: 'FORGEOS_REMOVE_AGENT', agentId: item.agentId })
  if (response?.ok) { agents = response.agents; activeAgentId = agents[0]?.agentId || null; renderLibrary() }
})

document.querySelector('#file').addEventListener('change', async (event) => {
  const selected = event.target.files?.[0]
  if (!selected) return
  try {
    const definition = JSON.parse(await selected.text())
    if (definition.schemaVersion !== 1 || !definition.websiteUrl || !definition.goal || !Array.isArray(definition.allowedDomains)) throw new Error('Invalid workflow')
    const manualAgent = {
      agentId: `manual:${crypto.randomUUID()}`,
      versionId: `manual:${crypto.randomUUID()}`,
      version: Number(definition.version || 1),
      name: definition.name || 'Imported agent',
      websiteUrl: definition.websiteUrl,
      definition,
      publishedAt: new Date().toISOString(),
      installedAt: new Date().toISOString(),
      lastRunAt: null,
    }
    agents = [manualAgent, ...agents]
    activeAgentId = manualAgent.agentId
    await chrome.storage.local.set({ forgeosAgents: agents, forgeosActiveAgentId: activeAgentId })
    renderLibrary()
  } catch {
    window.alert('This is not a supported ForgeOS agent file.')
  } finally {
    event.target.value = ''
  }
})

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'FORGEOS_LIBRARY_UPDATED') {
    agents = message.agents || []
    activeAgentId = message.activeAgentId || activeAgentId || agents[0]?.agentId
    renderLibrary()
    return
  }
  if (message?.type !== 'FORGEOS_STATUS') return
  if (message.runId && message.runId !== 'deploy') activeRunId = message.runId
  activity.hidden = false
  appendEvent(message)
  if (message.state === 'approval') {
    pendingApprovalRunId = message.runId
    text(document.querySelector('#approval-title'), message.action || 'Approval required')
    text(document.querySelector('#approval-detail'), message.detail)
    approvalCard.hidden = false
    setRunState('Needs approval')
  } else if (message.state === 'error' || message.state === 'stopped') setRunState('Stopped')
  else if (message.state === 'takeover') setRunState('Needs you')
  else if (message.state === 'completed') setRunState('Completed')
  else if (message.state === 'paused') setRunState('Paused')
  else if (message.state === 'running' || message.state === 'done') setRunState('Running')
})

chrome.storage.local.get(['forgeosAgents', 'forgeosActiveAgentId', 'forgeosWorkspace', 'forgeosApiBase']).then((stored) => {
  agents = Array.isArray(stored.forgeosAgents) ? stored.forgeosAgents : []
  activeAgentId = stored.forgeosActiveAgentId || agents[0]?.agentId || null
  text(document.querySelector('#connection'), stored.forgeosWorkspace ? `Connected · ${stored.forgeosWorkspace.name}` : 'Browser agent')
  if (stored.forgeosApiBase) document.querySelector('#open-forgeos').href = `${stored.forgeosApiBase}/projects`
  renderLibrary()
})
