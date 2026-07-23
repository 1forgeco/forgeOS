const WEB_CHANNEL = 'forgeos-web'
const EXTENSION_CHANNEL = 'forgeos-extension'

function isForgeOSPage() {
  const host = window.location.hostname
  const trustedHost = ['localhost', '127.0.0.1', 'forgeos.1forge.in', 'forgeos-agent-studio.kamalkatal512.chatgpt.site'].includes(host)
  return trustedHost && Boolean(document.querySelector('meta[name="forgeos-app"][content="agent-studio"]'))
}

if (isForgeOSPage()) {
  document.documentElement.dataset.forgeosExtension = chrome.runtime.getManifest().version
  window.postMessage({ channel: EXTENSION_CHANNEL, type: 'FORGEOS_EXTENSION_READY', version: chrome.runtime.getManifest().version }, window.location.origin)
  window.dispatchEvent(new CustomEvent('forgeos-extension-ready', { detail: { version: chrome.runtime.getManifest().version } }))
  window.addEventListener('message', async (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return
    const message = event.data
    if (message?.channel !== WEB_CHANNEL || !message.requestId) return
    const respond = (ok, payload, error) => window.postMessage({ channel: EXTENSION_CHANNEL, requestId: message.requestId, ok, payload, error }, window.location.origin)
    try {
      if (message.type === 'FORGEOS_EXTENSION_PING') {
        const response = await chrome.runtime.sendMessage({ type: 'FORGEOS_EXTENSION_INFO', pageOrigin: window.location.origin })
        respond(Boolean(response?.ok), response?.info, response?.error)
      } else if (message.type === 'FORGEOS_EXTENSION_DEPLOY') {
        const response = await chrome.runtime.sendMessage({ type: 'FORGEOS_DEPLOY_FROM_WEB', payload: message.payload })
        respond(Boolean(response?.ok), response?.result, response?.error)
      } else if (message.type === 'FORGEOS_EXTENSION_DISCONNECT') {
        const response = await chrome.runtime.sendMessage({ type: 'FORGEOS_DISCONNECT' })
        respond(Boolean(response?.ok), { disconnected: Boolean(response?.ok) }, response?.error)
      }
    } catch (error) {
      respond(false, null, error instanceof Error ? error.message : 'The extension bridge failed.')
    }
  })
}

function visible(element) {
  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)
  return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0'
}

function normalized(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function descriptor(element) {
  const labels = element.labels ? [...element.labels].map((label) => label.textContent) : []
  const parentLabel = element.closest('label')?.textContent
  return normalized([
    ...labels,
    parentLabel,
    element.getAttribute('aria-label'),
    element.getAttribute('placeholder'),
    element.getAttribute('name'),
    element.getAttribute('data-testid'),
    element.id,
    element.textContent,
  ].filter(Boolean).join(' '))
}

function allowed(workflow, action) {
  const requested = normalized(action)
  return (workflow.allowedActions || []).some((item) => {
    const permission = normalized(item)
    return permission.includes(requested) || requested.includes(permission) || (requested === 'type' && permission.includes('search'))
  })
}

function safeControl(element) {
  const type = normalized(element.getAttribute('type'))
  const autocomplete = normalized(element.getAttribute('autocomplete'))
  return !['password', 'hidden', 'file'].includes(type)
    && !/(cc number|cc csc|one time code|current password|new password)/.test(autocomplete)
    && !/(password|captcha|verification code|card number|cvv|cvc)/.test(descriptor(element))
}

function fill(element, value) {
  element.focus()
  if (element instanceof HTMLSelectElement) {
    const desired = normalized(value)
    const option = [...element.options].find((item) => normalized(item.textContent) === desired || normalized(item.value) === desired)
      || [...element.options].find((item) => normalized(item.textContent).includes(desired) || desired.includes(normalized(item.textContent)))
    if (!option) return false
    element.value = option.value
  } else if (element instanceof HTMLInputElement && ['checkbox', 'radio'].includes(element.type)) {
    const shouldCheck = !/^(false|no|0|off)$/i.test(String(value))
    if (element.checked !== shouldCheck) element.click()
    return true
  } else {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
    setter?.call(element, String(value))
  }
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
  return true
}

function searchQuery(workflow, inputs) {
  const namedSearch = Object.entries(inputs || {}).find(([key]) => /search|query|keyword|product|destination|location/i.test(key))?.[1]
  if (String(namedSearch || '').trim()) return String(namedSearch).trim()
  const provided = Object.values(inputs || {}).map(String).map((value) => value.trim()).filter(Boolean)
  if (provided.length === 1) return provided[0]
  return String(workflow.goal || '')
    .replace(/^(please\s+)?(find|search for|look for|show me|compare)\s+/i, '')
    .replace(/\b(with|and return|then return|show)\s+(the\s+)?\d+\s+best.*$/i, '')
    .trim()
}

function findSearchInput() {
  const inputs = [...document.querySelectorAll('input, textarea')].filter((element) => visible(element) && safeControl(element))
  return inputs.find((element) => element.getAttribute('type') === 'search')
    || inputs.find((element) => /search|find|query|keyword|product|destination/.test(descriptor(element)))
}

function findControlForField(field, used) {
  const fieldWords = normalized(field).split(' ').filter((word) => word.length > 2)
  const controls = [...document.querySelectorAll('input, textarea, select')].filter((element) => visible(element) && safeControl(element) && !used.has(element))
  return controls
    .map((element) => ({ element, score: fieldWords.reduce((score, word) => score + (descriptor(element).includes(word) ? 2 : 0), 0) }))
    .sort((left, right) => right.score - left.score)
    .find((item) => item.score > 0)?.element
}

function findButton(text) {
  const wanted = normalized(text)
  if (!wanted) return null
  return [...document.querySelectorAll('button, [role="button"], a')]
    .filter(visible)
    .find((element) => {
      const value = descriptor(element)
      return value === wanted || (wanted.length > 3 && value.includes(wanted))
    })
}

function findSortControl(workflow) {
  const controls = [...document.querySelectorAll('select, button, [role="button"]')].filter(visible)
  const control = controls.find((element) => /sort|order by|relevance|price low|price high|newest|rating/.test(descriptor(element)))
  if (!control) return null
  const goal = normalized(workflow.goal)
  const desired = goal.includes('low') || goal.includes('cheapest') ? 'low'
    : goal.includes('high') || goal.includes('expensive') ? 'high'
      : goal.includes('rating') || goal.includes('best') ? 'rating'
        : goal.includes('new') ? 'newest' : 'relevance'
  return { control, desired }
}

function resultElements() {
  return [...document.querySelectorAll('article, [data-component-type="s-search-result"], [data-testid*="result"], [class*="product-card"], [class*="search-result"], [class*="result-card"]')]
    .filter(visible)
}

function cleanText(value, limit = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function firstText(root, selectors, limit) {
  for (const selector of selectors) {
    const value = cleanText(root.querySelector(selector)?.textContent, limit)
    if (value) return value
  }
  return ''
}

function absoluteUrl(value) {
  try { return new URL(value, window.location.href).href } catch { return '' }
}

function extractSearchCandidates() {
  const seen = new Set()
  return resultElements().map((card, index) => {
    const title = firstText(card, ['h2 span', 'h2', '[data-testid*="title"]', '[class*="title"]'], 220)
    const linkElement = card.querySelector('h2 a[href], a[href*="/dp/"], a[href*="/product/"], a[href]')
    const url = absoluteUrl(linkElement?.getAttribute('href'))
    const price = firstText(card, ['.a-price .a-offscreen', '[data-testid*="price"]', '[class*="price"]'], 80)
    const rating = firstText(card, ['.a-icon-alt', '[aria-label*="out of"]', '[data-testid*="rating"]', '[class*="rating"]'], 80)
    const reviews = firstText(card, ['a[href*="customerReviews"] span', '[data-testid*="review"]', '[class*="review-count"]'], 60)
    const sponsored = /sponsored|promoted/i.test(cleanText(card.textContent, 180))
    const key = url || title
    if (!title || !url || seen.has(key)) return null
    seen.add(key)
    return { rank: index + 1, title, url, price, rating, reviews, sponsored, cardEvidence: cleanText(card.textContent, 420) }
  }).filter(Boolean).slice(0, 10)
}

function extractProductDetail() {
  const main = document.querySelector('main, #dp, #ppd, [role="main"]') || document.body
  const title = firstText(document, ['#productTitle', 'h1', '[data-testid*="title"]'], 260) || cleanText(document.title, 260)
  const price = firstText(document, ['#corePrice_feature_div .a-offscreen', '.a-price .a-offscreen', '[data-testid*="price"]', '[class*="price"]'], 90)
  const rating = firstText(document, ['#acrPopover', '.a-icon-alt', '[aria-label*="out of"]', '[data-testid*="rating"]'], 90)
  const reviews = firstText(document, ['#acrCustomerReviewText', '[data-hook="total-review-count"]', '[data-testid*="review"]'], 80)
  const availability = firstText(document, ['#availability', '[data-testid*="availability"]', '[class*="availability"]'], 100)
  const brand = firstText(document, ['#bylineInfo', '[data-testid*="brand"]', '[itemprop="brand"]'], 100)
  const bullets = [...main.querySelectorAll('#feature-bullets li, [data-testid*="feature"] li, [class*="feature"] li, [class*="highlights"] li')]
    .filter(visible).map((item) => cleanText(item.textContent, 240)).filter(Boolean).slice(0, 12)
  const details = {}
  for (const row of [...main.querySelectorAll('#productDetails_techSpec_section_1 tr, #productDetails_detailBullets_sections1 tr, [class*="spec"] tr, [data-testid*="spec"] tr')].slice(0, 30)) {
    const cells = [...row.querySelectorAll('th, td')].map((cell) => cleanText(cell.textContent, 180)).filter(Boolean)
    if (cells.length >= 2) details[cells[0]] = cells.slice(1).join(' · ')
  }
  for (const item of [...main.querySelectorAll('#detailBullets_feature_div li, [class*="detail"] li')].slice(0, 25)) {
    const value = cleanText(item.textContent, 260)
    const separator = value.indexOf(':')
    if (separator > 0 && separator < 80) details[value.slice(0, separator)] = value.slice(separator + 1).trim()
  }
  const dateEntry = Object.entries(details).find(([key]) => /date first available|release date|first available|model year/i.test(key))
  return {
    title,
    url: window.location.href,
    price,
    rating,
    reviews,
    availability,
    brand,
    launchDate: dateEntry?.[1] || '',
    features: bullets,
    specifications: details,
    pageEvidence: cleanText(main.textContent, 1500),
  }
}

function pageSummary(workflow) {
  const heading = document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() || document.title
  let cards = resultElements().slice(0, 10).map((element) => element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 320)).filter(Boolean)
  if (!cards.length) {
    cards = [...document.querySelectorAll('main li, main section, [role="main"] li')].filter(visible).slice(0, 10).map((element) => element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 320)).filter(Boolean)
  }
  const summary = { page: heading, url: window.location.href, results: cards }
  return /json/i.test(workflow.resultFormat || '') ? JSON.stringify(summary, null, 2) : [heading, ...cards.map((card, index) => `${index + 1}. ${card}`)].join('\n')
}

function submitSearch(input) {
  const form = input.closest('form')
  if (form) {
    if (typeof form.requestSubmit === 'function') form.requestSubmit()
    else form.submit()
    return
  }
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }))
  input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }))
}

async function emit(runId, title, detail, state = 'running') {
  await chrome.runtime.sendMessage({ type: 'FORGEOS_RUNTIME_EVENT', runId, state, title, detail }).catch(() => {})
}

async function controlPoint(runId) {
  const response = await chrome.runtime.sendMessage({ type: 'FORGEOS_CONTROL_POINT', runId })
  if (response?.stopped) throw new Error('Run stopped by the user.')
}

function requiresApproval(workflow, action, detail) {
  const target = normalized(`${action} ${detail}`)
  return (workflow.approvalActions || []).some((rule) => {
    const policy = normalized(rule)
    if (!policy) return false
    if (/submit|send|book|purchase|buy|delete|confirm|payment/.test(policy) && /submit|send|book|purchase|buy|delete|confirm|payment|continue/.test(target)) return true
    return policy.split(' ').filter((word) => word.length > 4).some((word) => target.includes(word))
  })
}

async function approve(runId, agentId, workflow, action, detail) {
  if (!requiresApproval(workflow, action, detail)) return true
  const response = await chrome.runtime.sendMessage({ type: 'FORGEOS_REQUEST_APPROVAL', runId, agentId, action, detail })
  return Boolean(response?.approved)
}

async function executeWorkflow(message) {
  const workflow = message.workflow || {}
  const inputs = message.inputs || {}
  const state = { searched: false, appliedInputs: [], sorted: false, pagePass: 0, ...(message.runtimeState || {}) }
  const used = new Set()
  let steps = 0
  const maxSteps = Math.min(Math.max(Number(workflow.maximumSteps) || 10, 1), 100)
  const step = async (title, detail) => {
    if (steps >= maxSteps) throw new Error(`The agent reached its ${maxSteps}-action safety limit.`)
    steps += 1
    await controlPoint(message.runId)
    await emit(message.runId, title, detail)
  }

  if (!state.searched && (allowed(workflow, 'search') || allowed(workflow, 'type'))) {
    const input = findSearchInput()
    if (!input) {
      return { ok: true, needsTakeover: true, title: 'User takeover requested', detail: `ForgeOS reached “${document.title}” but could not identify a reliable search control.`, runtimeState: state }
    }
    const query = searchQuery(workflow, inputs)
    if (!query) return { ok: true, needsTakeover: true, title: 'Search input needed', detail: 'Enter a search term or add one to the agent goal.', runtimeState: state }
    await step('Entering search', `Typing “${query}” into the page search control.`)
    fill(input, query)
    state.searched = true
    await step('Submitting search', 'Waiting for the website to show results.')
    window.setTimeout(() => submitSearch(input), 80)
    return { ok: true, continueAfterNavigation: true, runtimeState: state }
  }

  for (const [field, value] of Object.entries(inputs)) {
    if (!String(value).trim() || state.appliedInputs.includes(field)) continue
    const control = findControlForField(field, used)
    if (control && (allowed(workflow, control instanceof HTMLSelectElement ? 'select' : 'type') || allowed(workflow, 'filter'))) {
      used.add(control)
      await step(`Applying ${field}`, `Setting the visible ${field} control to “${value}”.`)
      if (fill(control, value)) state.appliedInputs.push(field)
      continue
    }
    const button = findButton(value)
    if (button && (allowed(workflow, 'click') || allowed(workflow, 'filter'))) {
      if (!await approve(message.runId, message.agentId, workflow, 'Click filter', descriptor(button))) {
        return { ok: true, needsTakeover: true, title: 'Approval declined', detail: `The ${field} action was not approved.`, runtimeState: state }
      }
      await step(`Applying ${field}`, `Selecting “${value}”.`)
      button.click()
      state.appliedInputs.push(field)
    }
  }

  if (!state.sorted && (allowed(workflow, 'sort') || allowed(workflow, 'select'))) {
    if (workflow.runtimeMode === 'product-research') state.sorted = true
    const sort = findSortControl(workflow)
    if (sort && workflow.runtimeMode !== 'product-research') {
      await step('Sorting results', `Selecting the closest “${sort.desired}” sorting option.`)
      if (sort.control instanceof HTMLSelectElement) fill(sort.control, sort.desired)
      else sort.control.click()
      state.sorted = true
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  let cards = resultElements()
  if (!cards.length && allowed(workflow, 'scroll')) {
    await step('Checking more of the page', 'Scrolling to find visible results.')
    window.scrollBy({ top: Math.max(window.innerHeight * .75, 500), behavior: 'smooth' })
    await new Promise((resolve) => setTimeout(resolve, 650))
    cards = resultElements()
  }

  if (workflow.runtimeMode === 'product-research' && cards.length) {
    const candidates = extractSearchCandidates()
    if (candidates.length < 2) {
      return { ok: true, needsTakeover: true, title: 'More product evidence is needed', detail: 'ForgeOS could not identify enough reliable product links on this result page. Try a more specific product query or take over the current tab.', runtimeState: state }
    }
    await step('Building a research set', `Found ${candidates.length} candidates. ForgeOS will inspect the strongest product pages before ranking them.`)
    return { ok: true, researchPlan: { candidates }, runtimeState: { ...state, researchPrepared: true } }
  }

  const goal = normalized(workflow.goal)
  const wantsOpen = /\b(open|choose|select|book|visit|continue)\b/.test(goal)
  if (wantsOpen && allowed(workflow, 'click') && cards.length) {
    const link = cards[0].querySelector('a[href], button')
    if (link && visible(link)) {
      const detail = descriptor(link) || cards[0].textContent?.slice(0, 120) || 'first result'
      if (!await approve(message.runId, message.agentId, workflow, 'Open result', detail)) {
        return { ok: true, needsTakeover: true, title: 'Approval declined', detail: 'The next result was not opened.', runtimeState: state }
      }
      await step('Opening the best match', detail)
      link.click()
      return { ok: true, continueAfterNavigation: true, runtimeState: state }
    }
  }

  if (!allowed(workflow, 'extract') && !cards.length) {
    return { ok: true, needsTakeover: true, title: 'User takeover requested', detail: workflow.fallbackInstructions || 'ForgeOS could not verify a useful result on this page.', runtimeState: state }
  }

  await step('Collecting the result', workflow.completionCriteria || 'Reading the visible result state.')
  const result = pageSummary(workflow)
  return {
    ok: true,
    title: 'Agent completed',
    detail: cards.length ? `ForgeOS found ${cards.length} visible result${cards.length === 1 ? '' : 's'} and prepared the requested output.` : 'ForgeOS captured the current page result.',
    result,
    runtimeState: state,
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'FORGEOS_EXTRACT_PRODUCT') {
    try { sendResponse({ ok: true, product: extractProductDetail() }) } catch (error) { sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Product details could not be read.' }) }
    return false
  }
  if (message?.type !== 'FORGEOS_EXECUTE') return false
  executeWorkflow(message)
    .then((response) => sendResponse(response))
    .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : 'The page action failed safely.' }))
  return true
})
