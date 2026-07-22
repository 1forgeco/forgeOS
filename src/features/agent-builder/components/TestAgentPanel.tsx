import { ArrowRight, Bot, Check, RotateCcw, Send, Sparkles, UserRound } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { NODE_REGISTRY } from '../data/nodeRegistry'
import {
  EMPTY_BOOKING_SESSION,
  runBookingTurn,
  type BookingAgentResponse,
  type BookingSession,
} from '../runtime/bookingAgent'
import type { AgentNodeKind } from '../types'

type ChatMessage = { id: string; role: 'agent' | 'visitor'; text: string }

type TestAgentPanelProps = {
  onActivity: (steps: AgentNodeKind[]) => void
}

const TEST_PIPELINE: AgentNodeKind[] = [
  'websiteChat',
  'collectRequirements',
  'searchCatalog',
  'filterRank',
  'checkAvailability',
  'requestConfirmation',
  'createBooking',
  'sendConfirmation',
]

export function TestAgentPanel({ onActivity }: TestAgentPanelProps) {
  const opening = useMemo(() => runBookingTurn('', EMPTY_BOOKING_SESSION), [])
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 'welcome', role: 'agent', text: opening.reply }])
  const [session, setSession] = useState<BookingSession>(opening.session)
  const [sessionId, setSessionId] = useState<string>(() => crypto.randomUUID())
  const [quickReplies, setQuickReplies] = useState(opening.quickReplies)
  const [activeSteps, setActiveSteps] = useState<AgentNodeKind[]>(opening.activeSteps)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [liveMode, setLiveMode] = useState<'connected' | 'browser-preview'>('connected')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, quickReplies, busy])

  const reset = () => {
    const start = runBookingTurn('', EMPTY_BOOKING_SESSION)
    setMessages([{ id: `welcome-${Date.now()}`, role: 'agent', text: start.reply }])
    setSession(start.session)
    setSessionId(crypto.randomUUID())
    setQuickReplies(start.quickReplies)
    setActiveSteps(start.activeSteps)
    onActivity(start.activeSteps)
  }

  const requestAgent = async (message: string): Promise<BookingAgentResponse> => {
    try {
      const response = await fetch('/api/agents/demo-booking/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, session, sessionId }),
      })
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Preview API is not available locally')
      const result = await response.json() as BookingAgentResponse & { error?: string; sessionId?: string }
      if (!response.ok) throw new Error(result.error ?? 'The agent could not respond')
      if (result.sessionId) setSessionId(result.sessionId)
      setLiveMode('connected')
      return result
    } catch {
      setLiveMode('browser-preview')
      return runBookingTurn(message, session)
    }
  }

  const sendMessage = async (message: string) => {
    const clean = message.trim()
    if (!clean || busy) return
    setMessages((current) => [...current, { id: `visitor-${Date.now()}`, role: 'visitor', text: clean }])
    setValue('')
    setQuickReplies([])
    setBusy(true)
    const result = await requestAgent(clean)
    setSession(result.session)
    setQuickReplies(result.quickReplies)
    setActiveSteps(result.activeSteps)
    onActivity(result.activeSteps)
    setMessages((current) => [...current, { id: `agent-${Date.now()}`, role: 'agent', text: result.reply }])
    setBusy(false)
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    void sendMessage(value)
  }

  return (
    <main className="test-agent-view">
      <section className="test-intro">
        <div>
          <span className="view-eyebrow"><Sparkles size={13} /> Real conversation test</span>
          <h1>Talk to your agent like a visitor would.</h1>
          <p>Try different requests, vague answers, and booking details. The live path below shows which parts of your workflow handled each message.</p>
        </div>
        <button onClick={reset}><RotateCcw size={14} /> Start a fresh test</button>
      </section>

      <section className="live-pipeline" aria-label="Agent execution path">
        {TEST_PIPELINE.map((kind, index) => {
          const definition = NODE_REGISTRY[kind]
          const Icon = definition.icon
          const active = activeSteps.includes(kind)
          return (
            <div className={`live-pipeline-step${active ? ' active' : ''}`} key={kind}>
              <span style={{ '--step-color': definition.color } as CSSProperties}><Icon size={15} /></span>
              <small>{definition.label}</small>
              {index < TEST_PIPELINE.length - 1 && <i><b /></i>}
            </div>
          )
        })}
      </section>

      <div className="test-workspace">
        <section className="chat-preview-card">
          <header>
            <span className="chat-agent-avatar"><Bot size={19} /></span>
            <div><strong>Booking concierge</strong><small><i /> Online · test mode</small></div>
            <span className={`runtime-badge ${liveMode}`}>{liveMode === 'connected' ? 'Saving test runs' : 'Local preview'}</span>
          </header>
          <div className="chat-messages" ref={scrollRef}>
            {messages.map((message) => (
              <div className={`chat-message ${message.role}`} key={message.id}>
                <span>{message.role === 'agent' ? <Bot size={13} /> : <UserRound size={13} />}</span>
                <p>{message.text}</p>
              </div>
            ))}
            {busy && <div className="chat-message agent"><span><Bot size={13} /></span><p className="agent-thinking">Checking the next step<span>•••</span></p></div>}
            {quickReplies.length > 0 && !busy && (
              <div className="chat-quick-replies">
                {quickReplies.map((reply) => <button onClick={() => void sendMessage(reply)} key={reply}>{reply}<ArrowRight size={11} /></button>)}
              </div>
            )}
          </div>
          <form className="chat-composer" onSubmit={submit}>
            <input value={value} onChange={(event) => setValue(event.target.value)} placeholder="Example: I need help automating my operations" maxLength={1_000} aria-label="Message your agent" />
            <button disabled={busy || !value.trim()} aria-label="Send message"><Send size={15} /></button>
          </form>
        </section>

        <aside className="test-guide-card">
          <span className="view-eyebrow">What to test</span>
          <h2>Try these realistic situations</h2>
          <div className="test-prompts">
            {[
              ['Clear request', 'I need an automation audit next week.'],
              ['Needs guidance', 'I am not sure which service I need.'],
              ['Different request', 'I want to redesign my website.'],
              ['Missing details', 'Book something for Tuesday.'],
            ].map(([label, prompt]) => <button onClick={() => void sendMessage(prompt)} key={label}><span><Check size={12} /></span><div><strong>{label}</strong><small>{prompt}</small></div></button>)}
          </div>
          <div className="test-privacy-note"><strong>This test now uses the real agent endpoint.</strong><p>Confirmed booking requests are stored so the workflow can be verified. Use test contact details until authentication is added.</p></div>
        </aside>
      </div>
    </main>
  )
}
