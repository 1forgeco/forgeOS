const controls = new Map()
const approvals = new Map()

const STATUS = {
  emit(runId, state, title, detail, extra = {}) {
    chrome.runtime.sendMessage({ type: 'FORGEOS_STATUS', runId, state, title, detail, ...extra }).catch(() => {})
  },
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureInstallationId()
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})
})

chrome.runtime.onStartup.addListener(() => ensureInstallationId())

async function ensureInstallationId() {
  const stored = await chrome.storage.local.get('forgeosInstallationId')
  if (stored.forgeosInstallationId) return stored.forgeosInstallationId
  const installationId = crypto.randomUUID()
  await chrome.storage.local.set({ forgeosInstallationId: installationId })
  return installationId
}

function allowedHost(url, domains) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    return domains.some((domain) => {
      const clean = String(domain).trim().toLowerCase().replace(/^www\./, '')
      return hostname === clean || hostname.endsWith(`.${clean}`)
    })
  } catch {
    return false
  }
}

function validWorkflow(workflow) {
  return workflow
    && workflow.schemaVersion === 1
    && typeof workflow.name === 'string'
    && /^https:\/\//i.test(workflow.websiteUrl || '')
    && Array.isArray(workflow.allowedDomains)
    && workflow.allowedDomains.length > 0
    && Array.isArray(workflow.allowedActions)
    && Array.isArray(workflow.approvalActions)
    && Array.isArray(workflow.inputs)
    && Number(workflow.maximumSteps) > 0
}

async function integrity(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(value)))
  const bytes = new Uint8Array(digest)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function connection() {
  const stored = await chrome.storage.local.get(['forgeosPairingToken', 'forgeosApiBase', 'forgeosWorkspace'])
  return { token: stored.forgeosPairingToken || '', apiBase: stored.forgeosApiBase || '', workspace: stored.forgeosWorkspace || null }
}

async function apiRequest(path, init = {}) {
  const linked = await connection()
  if (!linked.token || !linked.apiBase) throw new Error('Connect the extension to ForgeOS again.')
  const response = await fetch(path.startsWith('http') ? path : `${linked.apiBase}${path}`, {
    ...init,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${linked.token}`, ...(init.headers || {}) },
  })
  const raw = await response.text()
  let body = null
  try { body = raw ? JSON.parse(raw) : null } catch { body = null }
  if (!response.ok || !body) throw new Error(body?.error || 'ForgeOS returned an unexpected extension response.')
  return body
}

function validForgeOSOrigin(value) {
  try {
    const url = new URL(value)
    const local = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)
    const hosted = url.protocol === 'https:' && ['forgeos.1forge.in', 'forgeos-agent-studio.kamalkatal512.chatgpt.site'].includes(url.hostname)
    return local || hosted
  } catch {
    return false
  }
}

async function extensionInfo(pageOrigin = '') {
  if (validForgeOSOrigin(pageOrigin)) await chrome.storage.local.set({ forgeosAppBase: pageOrigin })
  const stored = await chrome.storage.local.get(['forgeosAgents', 'forgeosPairingToken', 'forgeosWorkspace'])
  return {
    installed: true,
    installationId: await ensureInstallationId(),
    extensionVersion: chrome.runtime.getManifest().version,
    paired: Boolean(stored.forgeosPairingToken),
    workspaceName: stored.forgeosWorkspace?.name,
    agentCount: Array.isArray(stored.forgeosAgents) ? stored.forgeosAgents.length : 0,
  }
}

async function storeAgent(agent) {
  const stored = await chrome.storage.local.get(['forgeosAgents'])
  const agents = Array.isArray(stored.forgeosAgents) ? stored.forgeosAgents : []
  const next = [agent, ...agents.filter((item) => item.agentId !== agent.agentId)]
  await chrome.storage.local.set({ forgeosAgents: next, forgeosActiveAgentId: agent.agentId })
  chrome.runtime.sendMessage({ type: 'FORGEOS_LIBRARY_UPDATED', agents: next, activeAgentId: agent.agentId }).catch(() => {})
  return next
}

async function installDeployment(payload) {
  if (!payload?.pairingToken || !payload?.deploymentUrl || !payload?.apiBase) throw new Error('The deployment handoff is incomplete.')
  if (!validForgeOSOrigin(payload.apiBase)) throw new Error('ForgeOS sent an invalid local or hosted app address.')
  await chrome.storage.local.set({ forgeosPairingToken: payload.pairingToken, forgeosApiBase: payload.apiBase, forgeosAppBase: payload.apiBase })
  const response = await apiRequest(payload.deploymentUrl)
  const agent = response.agent
  if (!agent || !validWorkflow(agent.definition)) throw new Error('ForgeOS sent an unsupported workflow definition.')
  if (await integrity(agent.definition) !== agent.integrity) throw new Error('The published agent failed its integrity check.')
  if (!allowedHost(agent.definition.websiteUrl, agent.definition.allowedDomains)) throw new Error('The published website is outside the agent domain policy.')
  await chrome.storage.local.set({ forgeosWorkspace: agent.workspace })
  await storeAgent({ ...agent, installedAt: new Date().toISOString(), lastRunAt: null })
  STATUS.emit('deploy', 'done', 'Agent installed', `${agent.name} version ${agent.version} is ready in the ForgeOS extension.`)
  if (response.autoRun && agent.definition.inputs.length === 0) {
    void runInstalledAgent(agent.agentId, {}, { openInNewTab: true })
  } else {
    chrome.action.setBadgeText({ text: 'NEW' }).catch(() => {})
    chrome.action.setBadgeBackgroundColor({ color: '#6d58c9' }).catch(() => {})
  }
  return { agentId: agent.agentId, version: agent.version, autoRun: Boolean(response.autoRun && agent.definition.inputs.length === 0) }
}

async function syncAgents() {
  const response = await apiRequest('/api/extension/agents')
  const stored = await chrome.storage.local.get(['forgeosAgents', 'forgeosActiveAgentId'])
  const local = Array.isArray(stored.forgeosAgents) ? stored.forgeosAgents : []
  const next = []
  for (const agent of response.agents || []) {
    if (!validWorkflow(agent.definition) || await integrity(agent.definition) !== agent.integrity) continue
    const previous = local.find((item) => item.agentId === agent.agentId)
    next.push({ ...agent, workspace: previous?.workspace, installedAt: previous?.installedAt || new Date().toISOString(), lastRunAt: previous?.lastRunAt || null })
  }
  await chrome.storage.local.set({ forgeosAgents: next, forgeosActiveAgentId: stored.forgeosActiveAgentId || next[0]?.agentId || null })
  chrome.runtime.sendMessage({ type: 'FORGEOS_LIBRARY_UPDATED', agents: next, activeAgentId: stored.forgeosActiveAgentId }).catch(() => {})
  return next
}

function waitForTab(tabId, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener)
      reject(new Error('The website took too long to load.'))
    }, timeoutMs)
    const listener = (changedId, info, tab) => {
      if (changedId !== tabId || info.status !== 'complete') return
      clearTimeout(timeout)
      chrome.tabs.onUpdated.removeListener(listener)
      resolve(tab)
    }
    chrome.tabs.onUpdated.addListener(listener)
    chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === 'complete') {
        clearTimeout(timeout)
        chrome.tabs.onUpdated.removeListener(listener)
        resolve(tab)
      }
    }).catch(() => {})
  })
}

function waitForPageChange(tabId, timeoutMs = 2_800) {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      chrome.tabs.onUpdated.removeListener(listener)
      resolve()
    }
    const listener = (changedId, info) => {
      if (changedId === tabId && info.status === 'complete') finish()
    }
    const timeout = setTimeout(finish, timeoutMs)
    chrome.tabs.onUpdated.addListener(listener)
  })
}

async function startRemoteRun(agent, inputs) {
  try {
    const response = await apiRequest('/api/extension/runs', { method: 'POST', body: JSON.stringify({ agentId: agent.agentId, status: 'running', goal: agent.definition.goal, inputs }) })
    return response.runId
  } catch {
    return crypto.randomUUID()
  }
}

async function updateRemoteRun(runId, status, result = '') {
  try { await apiRequest(`/api/extension/runs/${encodeURIComponent(runId)}`, { method: 'PATCH', body: JSON.stringify({ status, result }) }) } catch { /* the local run remains usable offline */ }
}

async function syncEvent(runId, state, title, detail) {
  try { await apiRequest(`/api/extension/runs/${encodeURIComponent(runId)}/events`, { method: 'POST', body: JSON.stringify({ state, title, detail }) }) } catch { /* transient activity may remain local */ }
}

function emitRunEvent(runId, state, title, detail, extra) {
  STATUS.emit(runId, state, title, detail, extra)
  void syncEvent(runId, state, title, detail)
}

function controlFor(runId) {
  if (!controls.has(runId)) controls.set(runId, { state: 'running', waiters: [] })
  return controls.get(runId)
}

async function controlPoint(runId) {
  const control = controlFor(runId)
  if (control.state === 'stopped') return { stopped: true }
  if (control.state !== 'paused') return { stopped: false }
  await new Promise((resolve) => control.waiters.push(resolve))
  return { stopped: control.state === 'stopped' }
}

async function requestApproval(message) {
  let approvalId = ''
  try {
    const response = await apiRequest('/api/extension/approvals', { method: 'POST', body: JSON.stringify({ runId: message.runId, agentId: message.agentId, action: message.action, details: message.detail }) })
    approvalId = response.approvalId
  } catch { /* approval remains enforced locally */ }
  STATUS.emit(message.runId, 'approval', 'Approval required', message.detail, { approvalId, action: message.action })
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      approvals.delete(message.runId)
      resolve({ approved: false, reason: 'Approval timed out.' })
    }, 5 * 60_000)
    approvals.set(message.runId, { resolve, timeout, approvalId })
  })
}

function numberFrom(value) {
  const normalized = String(value || '').replace(/,/g, '')
  const match = normalized.match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : 0
}

function inputMatching(inputs, pattern) {
  const entry = Object.entries(inputs || {}).find(([key]) => pattern.test(key))
  return String(entry?.[1] || '').trim()
}

function usefulWords(value) {
  return String(value || '').toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !['with', 'under', 'best', 'find', 'product', 'maximum', 'preferred', 'features'].includes(word))
}

function rankProducts(products, workflow, inputs) {
  const maximumBudget = numberFrom(inputMatching(inputs, /budget|maximum|price/i))
  const requestedFeatures = usefulWords(`${inputMatching(inputs, /feature|must|require/i)} ${inputMatching(inputs, /use|case|purpose/i)}`)
  const wantsRecent = /latest|new|recent|current/i.test(`${inputMatching(inputs, /launch|date|age/i)} ${workflow.goal}`)
  const today = Date.now()
  return products.map((product) => {
    const priceNumber = numberFrom(product.price)
    const ratingNumber = Math.min(numberFrom(product.rating), 5)
    const reviewNumber = numberFrom(product.reviews)
    const corpus = `${product.title} ${(product.features || []).join(' ')} ${Object.entries(product.specifications || {}).flat().join(' ')} ${product.pageEvidence || product.cardEvidence || ''}`.toLowerCase()
    const featureMatches = requestedFeatures.filter((word) => corpus.includes(word))
    const parsedDate = Date.parse(product.launchDate || '')
    const ageMonths = Number.isFinite(parsedDate) ? Math.max(0, (today - parsedDate) / 2_629_746_000) : null
    const budgetFit = !maximumBudget || !priceNumber ? 0 : priceNumber <= maximumBudget ? 22 : -Math.min(28, ((priceNumber - maximumBudget) / maximumBudget) * 55)
    const reviewConfidence = reviewNumber ? Math.min(18, Math.log10(reviewNumber + 1) * 5) : 0
    const featureFit = requestedFeatures.length ? (featureMatches.length / requestedFeatures.length) * 25 : 8
    const recency = wantsRecent && ageMonths != null ? Math.max(-10, 12 - ageMonths / 4) : 0
    const availability = /in stock|available/i.test(product.availability || '') ? 5 : /unavailable|out of stock/i.test(product.availability || '') ? -18 : 0
    const evidence = (product.features?.length || 0) * .65 + Math.min(8, Object.keys(product.specifications || {}).length * .5)
    const score = Math.round((ratingNumber * 8) + reviewConfidence + budgetFit + featureFit + recency + availability + evidence - (product.sponsored ? 3 : 0))
    return { ...product, priceNumber, ratingNumber, reviewNumber, ageMonths, featureMatches, score }
  }).sort((left, right) => right.score - left.score)
}

function recommendationReasons(product, maximumBudget, requestedFeatures) {
  const reasons = []
  if (product.ratingNumber) reasons.push(`${product.ratingNumber.toFixed(1)} rating`)
  if (product.reviewNumber) reasons.push(`${product.reviewNumber.toLocaleString()} review signals`)
  if (product.price) reasons.push(product.price)
  if (maximumBudget && product.priceNumber && product.priceNumber <= maximumBudget) reasons.push('inside budget')
  if (product.featureMatches?.length) reasons.push(`matches ${product.featureMatches.slice(0, 3).join(', ')}`)
  if (product.launchDate) reasons.push(`date evidence: ${product.launchDate}`)
  if (product.availability) reasons.push(product.availability)
  if (!reasons.length && requestedFeatures.length) reasons.push('closest evidence-backed match')
  return reasons.slice(0, 5)
}

function buildResearchResult(products, workflow, inputs) {
  const maximumBudget = numberFrom(inputMatching(inputs, /budget|maximum|price/i))
  const requestedFeatures = usefulWords(`${inputMatching(inputs, /feature|must|require/i)} ${inputMatching(inputs, /use|case|purpose/i)}`)
  const ranked = rankProducts(products, workflow, inputs)
  const picks = []
  const addPick = (label, product, reason) => {
    if (!product || picks.some((pick) => pick.url === product.url)) return
    picks.push({ label, ...product, reasons: [reason, ...recommendationReasons(product, maximumBudget, requestedFeatures)].filter(Boolean).slice(0, 6) })
  }
  addPick('Best overall', ranked[0], 'Strongest balance of evidence, fit, price and customer confidence.')
  const value = ranked.filter((product) => product.priceNumber > 0 && (!maximumBudget || product.priceNumber <= maximumBudget)).sort((left, right) => (right.score / Math.max(right.priceNumber, 1)) - (left.score / Math.max(left.priceNumber, 1)))[0]
  addPick('Best value', value, 'Best quality-and-fit score for the price.')
  const featureChoice = [...ranked].sort((left, right) => (right.featureMatches?.length || 0) - (left.featureMatches?.length || 0) || right.score - left.score)[0]
  addPick('Best for your use case', featureChoice, 'Matches the largest share of the requested features and intended use.')
  addPick('Alternative', ranked.find((product) => !picks.some((pick) => pick.url === product.url)), 'A credible alternative with different trade-offs.')
  for (const product of ranked) {
    if (picks.length >= Math.min(4, ranked.length)) break
    addPick(`Alternative ${picks.length - 1}`, product, 'Another evidence-backed option worth considering for a different balance of price and features.')
  }
  const verifiedCount = products.filter((product) => !product.error).length
  return JSON.stringify({
    type: 'forgeos-product-research',
    summary: `Visited ${products.length} product pages, verified ${verifiedCount}, and ranked the candidates using visible product evidence.`,
    criteria: { maximumBudget: maximumBudget || null, requestedFeatures, goal: workflow.goal },
    recommendations: picks.map((pick) => ({
      label: pick.label,
      title: pick.title,
      url: pick.url,
      price: pick.price || 'Not shown',
      rating: pick.rating || 'Not shown',
      reviews: pick.reviews || 'Not shown',
      availability: pick.availability || 'Not shown',
      launchDate: pick.launchDate || 'Not found on page',
      brand: pick.brand || 'Not shown',
      score: pick.score,
      reasons: pick.reasons,
      tradeOffs: [
        !pick.launchDate ? 'The page did not expose reliable launch-date evidence.' : '',
        !pick.reviewNumber ? 'Review-count evidence was not available.' : '',
        maximumBudget && pick.priceNumber > maximumBudget ? 'This option is above the requested budget.' : '',
      ].filter(Boolean),
      keyFeatures: (pick.features || []).slice(0, 6),
    })),
    note: 'Rankings use information visible on the visited pages. Verify price, stock, variants and warranty before purchase.',
  }, null, 2)
}

async function inspectProductCandidate(runId, workflow, candidate, index, total) {
  if (!allowedHost(candidate.url, workflow.allowedDomains || [])) return { ...candidate, error: 'Blocked by domain policy' }
  emitRunEvent(runId, 'running', `Inspecting product ${index + 1} of ${total}`, candidate.title)
  let tab
  try {
    tab = await chrome.tabs.create({ url: candidate.url, active: false })
    await waitForTab(tab.id, 35_000)
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'FORGEOS_EXTRACT_PRODUCT' })
    if (!response?.ok || !response.product) throw new Error(response?.error || 'No product details were returned.')
    return { ...candidate, ...response.product, url: candidate.url }
  } catch (error) {
    return { ...candidate, error: error instanceof Error ? error.message : 'Product page could not be inspected.' }
  } finally {
    if (tab?.id) await chrome.tabs.remove(tab.id).catch(() => {})
  }
}

async function runProductResearch(runId, workflow, inputs, candidates) {
  const selected = candidates.filter((candidate) => candidate?.url).slice(0, 5)
  const products = []
  for (let index = 0; index < selected.length; index += 1) {
    const control = await controlPoint(runId)
    if (control.stopped) throw new Error('Run stopped by the user.')
    products.push(await inspectProductCandidate(runId, workflow, selected[index], index, selected.length))
  }
  if (!products.length) throw new Error('ForgeOS could not inspect any reliable product page.')
  return buildResearchResult(products, workflow, inputs)
}

async function runInstalledAgent(agentId, inputs, options = {}) {
  const stored = await chrome.storage.local.get(['forgeosAgents'])
  const agents = Array.isArray(stored.forgeosAgents) ? stored.forgeosAgents : []
  const agent = agents.find((item) => item.agentId === agentId)
  if (!agent) throw new Error('This agent is not installed.')
  const workflow = agent.definition
  if (!validWorkflow(workflow)) throw new Error('This agent needs to be deployed again before it can run.')
  if (!allowedHost(workflow.websiteUrl, workflow.allowedDomains || [])) throw new Error('The target address is outside this agent’s allowed domains.')
  const missing = workflow.inputs.filter((field) => !String(inputs?.[field] || '').trim())
  if (missing.length) throw new Error(`Enter ${missing.join(', ')} before running.`)

  const runId = await startRemoteRun(agent, inputs)
  controls.set(runId, { state: 'running', waiters: [] })
  emitRunEvent(runId, 'running', 'Opening website', workflow.websiteUrl)

  let tab
  if (options.openInNewTab === false) {
    const [active] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (active?.id && allowedHost(active.url || '', workflow.allowedDomains)) tab = active
  }
  if (!tab) {
    tab = await chrome.tabs.create({ url: workflow.websiteUrl, active: true })
    await waitForTab(tab.id)
  }

  emitRunEvent(runId, 'done', 'Website ready', 'The approved domain is open in a normal tab.')
  let runtimeState = { searched: false, appliedInputs: [], sorted: false, pagePass: 0 }
  const maximumPasses = Math.min(Math.max(Number(workflow.maximumSteps) || 10, 1), 25)
  let finalResult = ''

  try {
    for (let pass = 0; pass < maximumPasses; pass += 1) {
      const control = await controlPoint(runId)
      if (control.stopped) throw new Error('Run stopped by the user.')
      runtimeState.pagePass = pass
      let response
      try {
        response = await chrome.tabs.sendMessage(tab.id, { type: 'FORGEOS_EXECUTE', runId, agentId, workflow, inputs, runtimeState })
      } catch (error) {
        await waitForPageChange(tab.id)
        if (pass + 1 < maximumPasses) continue
        throw error
      }
      if (!response?.ok) throw new Error(response?.error || 'The page could not run this workflow.')
      runtimeState = response.runtimeState || runtimeState
      if (response.researchPlan?.candidates?.length) {
        emitRunEvent(runId, 'running', 'Researching leading products', `Opening up to five product pages to verify specifications, price, ratings, reviews and date evidence.`)
        finalResult = await runProductResearch(runId, workflow, inputs, response.researchPlan.candidates)
        emitRunEvent(runId, 'completed', 'Product research complete', 'ForgeOS prepared evidence-backed choices for different use cases.', { result: finalResult })
        await updateRemoteRun(runId, 'completed', finalResult)
        const nextAgents = agents.map((item) => item.agentId === agentId ? { ...item, lastRunAt: new Date().toISOString() } : item)
        await chrome.storage.local.set({ forgeosAgents: nextAgents })
        return { runId, result: finalResult }
      }
      if (response.needsTakeover) {
        emitRunEvent(runId, 'takeover', response.title || 'User takeover requested', response.detail || workflow.fallbackInstructions)
        await updateRemoteRun(runId, 'takeover', response.detail || '')
        return { runId, needsTakeover: true }
      }
      if (response.continueAfterNavigation) {
        await waitForPageChange(tab.id)
        continue
      }
      finalResult = response.result || response.detail || ''
      emitRunEvent(runId, 'completed', response.title || 'Agent completed', response.detail || 'The workflow finished successfully.', { result: finalResult })
      await updateRemoteRun(runId, 'completed', finalResult)
      const nextAgents = agents.map((item) => item.agentId === agentId ? { ...item, lastRunAt: new Date().toISOString() } : item)
      await chrome.storage.local.set({ forgeosAgents: nextAgents })
      return { runId, result: finalResult }
    }
    throw new Error(`The agent reached its ${maximumPasses}-step safety limit.`)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected browser error'
    const stopped = controlFor(runId).state === 'stopped'
    emitRunEvent(runId, stopped ? 'stopped' : 'error', stopped ? 'Run stopped' : 'Run stopped safely', message)
    await updateRemoteRun(runId, stopped ? 'stopped' : 'failed', message)
    throw error
  } finally {
    controls.delete(runId)
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'FORGEOS_EXTENSION_INFO') {
    extensionInfo(message.pageOrigin).then((info) => sendResponse({ ok: true, info })).catch((error) => sendResponse({ ok: false, error: error.message }))
    return true
  }
  if (message?.type === 'FORGEOS_DEPLOY_FROM_WEB') {
    installDeployment(message.payload).then((result) => sendResponse({ ok: true, result })).catch((error) => sendResponse({ ok: false, error: error.message }))
    return true
  }
  if (message?.type === 'FORGEOS_SYNC_AGENTS') {
    syncAgents().then((agents) => sendResponse({ ok: true, agents })).catch((error) => sendResponse({ ok: false, error: error.message }))
    return true
  }
  if (message?.type === 'FORGEOS_DISCONNECT') {
    chrome.storage.local.remove(['forgeosPairingToken', 'forgeosApiBase', 'forgeosWorkspace']).then(() => {
      chrome.runtime.sendMessage({ type: 'FORGEOS_CONNECTION_CHANGED', paired: false }).catch(() => {})
      sendResponse({ ok: true })
    }).catch((error) => sendResponse({ ok: false, error: error.message }))
    return true
  }
  if (message?.type === 'FORGEOS_RUN') {
    runInstalledAgent(message.agentId, message.inputs || {}, message.options || {}).then((result) => sendResponse({ ok: true, result })).catch((error) => sendResponse({ ok: false, error: error.message }))
    return true
  }
  if (message?.type === 'FORGEOS_CONTROL') {
    const control = controlFor(message.runId)
    control.state = message.action === 'pause' ? 'paused' : message.action === 'stop' ? 'stopped' : 'running'
    if (control.state !== 'paused') control.waiters.splice(0).forEach((resolve) => resolve())
    STATUS.emit(message.runId, control.state, control.state === 'paused' ? 'Run paused' : control.state === 'stopped' ? 'Stopping run' : 'Run resumed', control.state === 'paused' ? 'No further browser actions will run until you continue.' : '')
    sendResponse({ ok: true, state: control.state })
    return false
  }
  if (message?.type === 'FORGEOS_CONTROL_POINT') {
    controlPoint(message.runId).then((result) => sendResponse({ ok: true, ...result }))
    return true
  }
  if (message?.type === 'FORGEOS_RUNTIME_EVENT') {
    emitRunEvent(message.runId, message.state || 'running', message.title || 'Agent activity', message.detail || '')
    sendResponse({ ok: true })
    return false
  }
  if (message?.type === 'FORGEOS_REQUEST_APPROVAL') {
    requestApproval(message).then((result) => sendResponse({ ok: true, ...result }))
    return true
  }
  if (message?.type === 'FORGEOS_APPROVAL_DECISION') {
    const pending = approvals.get(message.runId)
    if (!pending) { sendResponse({ ok: false }); return false }
    clearTimeout(pending.timeout)
    approvals.delete(message.runId)
    if (pending.approvalId) void apiRequest(`/api/extension/approvals/${encodeURIComponent(pending.approvalId)}`, { method: 'PATCH', body: JSON.stringify({ status: message.approved ? 'approved' : 'rejected' }) })
    pending.resolve({ approved: Boolean(message.approved) })
    sendResponse({ ok: true })
    return false
  }
  if (message?.type === 'FORGEOS_REMOVE_AGENT') {
    chrome.storage.local.get(['forgeosAgents']).then(async ({ forgeosAgents }) => {
      const next = (forgeosAgents || []).filter((item) => item.agentId !== message.agentId)
      await chrome.storage.local.set({ forgeosAgents: next, forgeosActiveAgentId: next[0]?.agentId || null })
      sendResponse({ ok: true, agents: next })
    })
    return true
  }
  return false
})
