const STATUS = {
  emit(runId, state, title, detail) {
    chrome.runtime.sendMessage({ type: 'FORGEOS_STATUS', runId, state, title, detail }).catch(() => {})
  },
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})
})

function allowedHost(url, domains) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    return domains.some((domain) => {
      const clean = String(domain).trim().replace(/^www\./, '')
      return hostname === clean || hostname.endsWith(`.${clean}`)
    })
  } catch {
    return false
  }
}

function waitForTab(tabId) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener)
      reject(new Error('The website took too long to load.'))
    }, 30000)
    const listener = (changedId, info, tab) => {
      if (changedId !== tabId || info.status !== 'complete') return
      clearTimeout(timeout)
      chrome.tabs.onUpdated.removeListener(listener)
      resolve(tab)
    }
    chrome.tabs.onUpdated.addListener(listener)
  })
}

async function runWorkflow(workflow, inputs) {
  const runId = crypto.randomUUID()
  if (!allowedHost(workflow.websiteUrl, workflow.allowedDomains || [])) {
    STATUS.emit(runId, 'error', 'Website blocked', 'The target address is outside this agent’s allowed domains.')
    return
  }

  STATUS.emit(runId, 'running', 'Opening website', workflow.websiteUrl)
  const tab = await chrome.tabs.create({ url: workflow.websiteUrl, active: true })
  await waitForTab(tab.id)
  STATUS.emit(runId, 'done', 'Website ready', 'The approved domain is open in a normal tab.')

  const response = await chrome.tabs.sendMessage(tab.id, {
    type: 'FORGEOS_EXECUTE',
    runId,
    workflow,
    inputs,
  })

  if (!response?.ok) throw new Error(response?.error || 'The page could not run this workflow.')
  STATUS.emit(runId, response.needsTakeover ? 'takeover' : 'done', response.title, response.detail)
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'FORGEOS_RUN') return false
  runWorkflow(message.workflow, message.inputs || {})
    .then(() => sendResponse({ ok: true }))
    .catch((error) => {
      STATUS.emit(message.runId || 'run', 'error', 'Run stopped', error instanceof Error ? error.message : 'Unexpected browser error')
      sendResponse({ ok: false })
    })
  return true
})
