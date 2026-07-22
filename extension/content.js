function visible(element) {
  const rect = element.getBoundingClientRect()
  const style = window.getComputedStyle(element)
  return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
}

function descriptor(element) {
  return [
    element.getAttribute('aria-label'),
    element.getAttribute('placeholder'),
    element.getAttribute('name'),
    element.id,
    element.textContent,
  ].filter(Boolean).join(' ').toLowerCase()
}

function findSearchInput() {
  const inputs = [...document.querySelectorAll('input, textarea')].filter(visible)
  return inputs.find((element) => element.getAttribute('type') === 'search')
    || inputs.find((element) => /search|find|query|keyword|product/.test(descriptor(element)))
}

function searchQuery(workflow, inputs) {
  const provided = Object.values(inputs || {}).map(String).map((value) => value.trim()).filter(Boolean)
  if (provided.length) return provided.join(' ')
  return String(workflow.goal || '')
    .replace(/^(please\s+)?(find|search for|look for|show me)\s+/i, '')
    .replace(/\b(with|and return|then return|show)\s+(the\s+)?\d+\s+best.*$/i, '')
    .trim()
}

function fill(element, value) {
  element.focus()
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  setter?.call(element, value)
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
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

function pageSummary() {
  const heading = document.querySelector('h1')?.textContent?.trim()
  const cards = [...document.querySelectorAll('article, [data-component-type="s-search-result"], [class*="product"], [class*="result"]')]
    .filter(visible)
    .slice(0, 5)
    .map((element) => element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 180))
    .filter(Boolean)
  return { heading, cards }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'FORGEOS_EXECUTE') return false
  const workflow = message.workflow || {}
  const allowed = new Set((workflow.allowedActions || []).map((action) => String(action).toLowerCase()))
  const canSearch = [...allowed].some((action) => action.includes('search') || action.includes('type'))

  if (!canSearch) {
    sendResponse({ ok: true, needsTakeover: true, title: 'Permission needed', detail: 'This page needs typing or search, but those actions are not allowed by the workflow.' })
    return false
  }

  const input = findSearchInput()
  if (!input) {
    const summary = pageSummary()
    sendResponse({
      ok: true,
      needsTakeover: true,
      title: 'User takeover requested',
      detail: summary.heading ? `ForgeOS reached “${summary.heading}” but could not identify a reliable search control.` : 'ForgeOS could not identify a reliable search control on this page.',
    })
    return false
  }

  const query = searchQuery(workflow, message.inputs)
  fill(input, query)
  sendResponse({ ok: true, title: 'Search started', detail: `Entered “${query}” in the page’s search control. The next runtime version will continue through filters and result extraction.` })
  window.setTimeout(() => submitSearch(input), 250)
  return false
})
