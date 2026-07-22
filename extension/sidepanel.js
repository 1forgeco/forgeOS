let workflow = null

const empty = document.querySelector('#empty')
const agent = document.querySelector('#agent')
const file = document.querySelector('#file')
const activity = document.querySelector('#activity')
const events = document.querySelector('#events')

function showWorkflow(value) {
  workflow = value
  empty.hidden = true
  agent.hidden = false
  document.querySelector('#name').textContent = value.name
  document.querySelector('#goal').textContent = value.goal
  document.querySelector('#website').textContent = value.websiteUrl
  document.querySelector('#actions').textContent = (value.allowedActions || []).join(', ')
  document.querySelector('#approval').textContent = (value.approvalActions || []).join(', ')
  const inputArea = document.querySelector('#inputs')
  inputArea.replaceChildren(...(value.inputs || []).map((field) => {
    const label = document.createElement('label')
    label.textContent = field
    const input = document.createElement('input')
    input.dataset.field = field
    input.placeholder = `Enter ${field}`
    label.append(input)
    return label
  }))
  chrome.storage.local.set({ forgeosWorkflow: value })
}

file.addEventListener('change', async () => {
  const selected = file.files?.[0]
  if (!selected) return
  try {
    const value = JSON.parse(await selected.text())
    if (!value.websiteUrl || !value.goal || !Array.isArray(value.allowedDomains)) throw new Error('Invalid workflow')
    showWorkflow(value)
  } catch {
    window.alert('This is not a valid ForgeOS agent file.')
  }
})

document.querySelector('#replace').addEventListener('click', () => file.click())
document.querySelector('#run').addEventListener('click', async () => {
  if (!workflow) return
  const inputs = Object.fromEntries([...document.querySelectorAll('[data-field]')].map((input) => [input.dataset.field, input.value]))
  events.replaceChildren()
  activity.hidden = false
  document.querySelector('#run-state').textContent = 'Running'
  await chrome.runtime.sendMessage({ type: 'FORGEOS_RUN', workflow, inputs })
})

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'FORGEOS_STATUS') return
  const item = document.createElement('li')
  item.className = message.state
  const title = document.createElement('b')
  title.textContent = message.title
  const detail = document.createElement('p')
  detail.textContent = message.detail
  item.append(title, detail)
  events.append(item)
  document.querySelector('#run-state').textContent = message.state === 'error' ? 'Stopped' : message.state === 'takeover' ? 'Needs you' : message.state === 'done' ? 'Working' : 'Running'
})

chrome.storage.local.get('forgeosWorkflow').then(({ forgeosWorkflow }) => {
  if (forgeosWorkflow) showWorkflow(forgeosWorkflow)
})
