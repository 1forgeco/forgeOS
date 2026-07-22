(() => {
  const script = document.currentScript
  if (!script || document.querySelector('[data-forgeos-widget-root]')) return

  const apiBase = (script.dataset.apiBase || new URL(script.src).origin).replace(/\/$/, '')
  const title = script.dataset.title || 'Booking concierge'
  const accent = script.dataset.accent || '#6f63f6'
  const sessionId = globalThis.crypto?.randomUUID?.() || `web-${Date.now()}`
  let session = { stage: 'choose-service' }
  let started = false

  const host = document.createElement('div')
  host.dataset.forgeosWidgetRoot = 'true'
  document.body.append(host)
  const root = host.attachShadow({ mode: 'open' })
  root.innerHTML = `
    <style>
      *{box-sizing:border-box}button,input{font:inherit}.bubble{position:fixed;right:22px;bottom:22px;z-index:2147483000;width:58px;height:58px;border:0;border-radius:19px;color:white;background:linear-gradient(145deg,${accent},#3b347f);box-shadow:0 16px 38px color-mix(in srgb,${accent} 38%,transparent),inset 0 1px rgba(255,255,255,.25);cursor:pointer;display:grid;place-items:center;transition:transform .2s}.bubble:hover{transform:translateY(-2px) scale(1.02)}.bubble svg{width:24px}.panel{position:fixed;right:22px;bottom:92px;z-index:2147483000;width:min(380px,calc(100vw - 28px));height:min(620px,calc(100vh - 120px));display:none;grid-template-rows:auto 1fr auto;border:1px solid rgba(33,34,44,.12);border-radius:22px;background:rgba(255,255,255,.97);box-shadow:0 28px 80px rgba(25,26,34,.25);overflow:hidden;color:#1d1e24;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.panel.open{display:grid;animation:in .23s ease-out}.head{min-height:70px;padding:13px 15px;display:flex;align-items:center;gap:10px;border-bottom:1px solid rgba(33,34,44,.08);background:linear-gradient(160deg,#fbfaff,#f2efff)}.avatar{width:39px;height:39px;border-radius:13px;display:grid;place-items:center;color:white;background:linear-gradient(145deg,${accent},#5045b8);box-shadow:0 7px 16px color-mix(in srgb,${accent} 26%,transparent)}.avatar svg{width:19px}.identity{display:grid;gap:3px}.identity strong{font-size:13px}.identity small{font-size:10px;color:#5d9c79;display:flex;align-items:center;gap:5px}.identity small:before{content:"";width:6px;height:6px;border-radius:50%;background:#44ae79;box-shadow:0 0 0 4px rgba(68,174,121,.12)}.close{margin-left:auto;width:31px;height:31px;border:0;border-radius:9px;background:rgba(255,255,255,.7);cursor:pointer;color:#777}.messages{padding:16px;overflow:auto;background:linear-gradient(#fff,#fafafe)}.message{max-width:86%;margin:0 0 11px;padding:10px 12px;border-radius:14px;font-size:12px;line-height:1.48;white-space:pre-wrap}.assistant{background:#f0eef8;border-bottom-left-radius:5px}.user{margin-left:auto;color:white;background:${accent};border-bottom-right-radius:5px}.typing{color:#85818f}.quick{display:flex;flex-wrap:wrap;gap:6px;margin:3px 0 12px}.quick button{border:1px solid color-mix(in srgb,${accent} 24%,transparent);border-radius:999px;padding:7px 9px;color:#5349aa;background:#f7f5ff;font-size:10px;cursor:pointer}.quick button:hover{background:#eeebff}.form{display:flex;gap:8px;padding:12px;border-top:1px solid rgba(33,34,44,.08);background:white}.form input{min-width:0;flex:1;height:42px;border:1px solid rgba(33,34,44,.12);border-radius:12px;padding:0 12px;outline:none;font-size:12px}.form input:focus{border-color:${accent};box-shadow:0 0 0 3px color-mix(in srgb,${accent} 10%,transparent)}.send{width:42px;border:0;border-radius:12px;color:white;background:${accent};cursor:pointer}.send:disabled{opacity:.5}.powered{text-align:center;font-size:8px;color:#a09da8;padding:0 0 7px;background:white}@keyframes in{from{opacity:0;transform:translateY(10px) scale(.98)}}@media(max-width:520px){.bubble{right:14px;bottom:14px}.panel{right:14px;bottom:82px;height:calc(100vh - 100px)}}
    </style>
    <button class="bubble" aria-label="Open ${title}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/></svg></button>
    <section class="panel" aria-label="${title}">
      <header class="head"><span class="avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="6" width="16" height="13" rx="4"/><path d="M9 11h.01M15 11h.01M9 15h6M12 6V3"/></svg></span><span class="identity"><strong>${title}</strong><small>Ready to help</small></span><button class="close" aria-label="Close">×</button></header>
      <div class="messages"></div>
      <div><form class="form"><input maxlength="1000" placeholder="Describe what you need…" aria-label="Message"><button class="send" aria-label="Send">↑</button></form><div class="powered">Powered by ForgeOS · 1forge</div></div>
    </section>`

  const panel = root.querySelector('.panel')
  const messages = root.querySelector('.messages')
  const form = root.querySelector('.form')
  const input = root.querySelector('input')
  const sendButton = root.querySelector('.send')

  const scroll = () => { messages.scrollTop = messages.scrollHeight }
  const addMessage = (role, text) => {
    const item = document.createElement('div')
    item.className = `message ${role}`
    item.textContent = text
    messages.append(item)
    scroll()
    return item
  }

  const addQuickReplies = (replies) => {
    const existing = messages.querySelector('.quick:last-child')
    if (existing) existing.remove()
    if (!replies?.length) return
    const wrap = document.createElement('div')
    wrap.className = 'quick'
    replies.forEach((reply) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = reply
      button.addEventListener('click', () => send(reply))
      wrap.append(button)
    })
    messages.append(wrap)
    scroll()
  }

  const send = async (message) => {
    const value = message.trim()
    if (value) addMessage('user', value)
    input.value = ''
    sendButton.disabled = true
    const waiting = addMessage('assistant typing', 'Working through the booking steps…')
    try {
      const response = await fetch(`${apiBase}/api/agents/demo-booking/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: value, session, sessionId }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'The agent could not respond.')
      session = result.session
      waiting.remove()
      addMessage('assistant', result.reply)
      addQuickReplies(result.quickReplies)
    } catch (error) {
      waiting.textContent = error instanceof Error ? error.message : 'The agent could not connect. Please try again.'
      waiting.classList.remove('typing')
    } finally {
      sendButton.disabled = false
      input.focus()
    }
  }

  root.querySelector('.bubble').addEventListener('click', () => {
    panel.classList.toggle('open')
    if (!started) { started = true; void send('') }
    if (panel.classList.contains('open')) input.focus()
  })
  root.querySelector('.close').addEventListener('click', () => panel.classList.remove('open'))
  form.addEventListener('submit', (event) => { event.preventDefault(); if (input.value.trim()) void send(input.value) })
})()
