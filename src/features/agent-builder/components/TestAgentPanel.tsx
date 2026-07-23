import { AlertCircle, ArrowUpRight, Bot, Check, CircleStop, ExternalLink, Globe2, LoaderCircle, Play, RotateCcw, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { NODE_REGISTRY } from '../data/nodeRegistry'
import { buildRunDetails, compileBrowserWorkflow } from '../runtime/browserWorkflow'
import { productApi } from '../../product/api'
import type { AgentEdge, AgentNode, AgentNodeKind } from '../types'

type TestAgentPanelProps = {
  agentId: string
  title: string
  nodes: AgentNode[]
  edges: AgentEdge[]
  onActivity: (steps: AgentNodeKind[]) => void
}

type BrowserEvent = { id: string; title: string; detail: string; state: 'running' | 'done' }

export function TestAgentPanel({ agentId, title, nodes, edges, onActivity }: TestAgentPanelProps) {
  const compiled = useMemo(() => compileBrowserWorkflow(title, nodes, edges), [title, nodes, edges])
  const definition = compiled.definition
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [events, setEvents] = useState<BrowserEvent[]>([])
  const [running, setRunning] = useState(false)
  const [runComplete, setRunComplete] = useState(false)
  const [agentResult, setAgentResult] = useState<{ text: string; model: string; citations: Array<{ url: string; title: string }> } | null>(null)
  const [runError, setRunError] = useState('')
  const stopRequested = useRef(false)

  const reset = () => {
    stopRequested.current = true
    setEvents([])
    setRunning(false)
    setRunComplete(false)
    setAgentResult(null)
    setRunError('')
    onActivity([])
  }

  const run = async () => {
    if (!definition || running) return
    stopRequested.current = false
    setRunning(true)
    setRunComplete(false)
    setAgentResult(null)
    setRunError('')
    setEvents([])
    const details = buildRunDetails(definition, inputs)
    const primary = compiled.orderedNodes.filter((node) => node.data.kind !== 'humanTakeover')

    for (const node of primary) {
      if (stopRequested.current) break
      onActivity([node.data.kind])
      const id = `${node.id}-${Date.now()}`
      setEvents((current) => [...current, { id, title: node.data.label, detail: 'Checking this step…', state: 'running' }])
      await new Promise((resolve) => window.setTimeout(resolve, 620))
      if (stopRequested.current) break
      setEvents((current) => current.map((event) => event.id === id ? { ...event, detail: details[node.data.kind], state: 'done' } : event))
    }

    let reasoningSucceeded = true
    if (!stopRequested.current && agentId) {
      const reasoningEventId = `reasoning-${Date.now()}`
      setEvents((current) => [...current, { id: reasoningEventId, title: 'Advanced reasoning', detail: 'Producing the real agent output from your inputs…', state: 'running' }])
      try {
        const response = await productApi.executeAgent(agentId, inputs)
        if (!stopRequested.current) {
          setAgentResult(response.result)
          setEvents((current) => current.map((event) => event.id === reasoningEventId ? { ...event, detail: `Completed with ${response.result.model}.`, state: 'done' } : event))
        }
      } catch (cause) {
        reasoningSucceeded = false
        const message = cause instanceof Error ? cause.message : 'The advanced reasoning run failed.'
        setRunError(message)
        setEvents((current) => current.filter((event) => event.id !== reasoningEventId))
      }
    }

    if (!stopRequested.current && reasoningSucceeded) {
      setRunComplete(true)
      onActivity(primary.map((node) => node.data.kind))
    }
    setRunning(false)
  }

  const openTarget = () => {
    if (definition) window.open(definition.websiteUrl, '_blank', 'noopener,noreferrer')
  }

  const orderedKinds = compiled.orderedNodes.filter((node) => node.data.kind !== 'humanTakeover').map((node) => node.data.kind)

  return (
    <main className="browser-test-view">
      <section className="test-intro browser-test-intro">
        <div>
          <span className="view-eyebrow"><Bot size={13} /> Browser run test</span>
          <h1>Watch the workflow prepare a real browser run.</h1>
          <p>This verifies the saved website, goal, inputs, permissions, approval policy, and completion rule. The Chrome extension performs the page clicks in a normal tab.</p>
        </div>
        <button onClick={reset}><RotateCcw size={14} /> Reset test</button>
      </section>

      <section className="live-pipeline browser-live-pipeline" aria-label="Agent execution path">
        {orderedKinds.map((kind, index) => {
          const definitionForKind = NODE_REGISTRY[kind]
          const Icon = definitionForKind.icon
          const active = nodes.some((node) => node.data.kind === kind && node.data.status !== 'idle')
          return (
            <div className={`live-pipeline-step${active ? ' active' : ''}`} key={`${kind}-${index}`}>
              <span style={{ '--step-color': definitionForKind.color } as CSSProperties}><Icon size={15} /></span>
              <small>{definitionForKind.label}</small>
              {index < orderedKinds.length - 1 && <i><b /></i>}
            </div>
          )
        })}
      </section>

      <div className="browser-test-workspace">
        <section className="browser-window-card">
          <header className="browser-chrome">
            <div className="browser-dots"><i /><i /><i /></div>
            <div className="browser-address"><ShieldCheck size={12} /><span>{definition?.websiteUrl || 'Add a valid website to begin'}</span></div>
            <button onClick={openTarget} disabled={!definition} aria-label="Open target website"><ArrowUpRight size={14} /></button>
          </header>
          <div className="browser-surface">
            <div className="browser-page-preview">
              <span className="browser-site-mark"><Globe2 size={22} /></span>
              <p>Target website</p>
              <h2>{definition ? new URL(definition.websiteUrl).hostname : 'Workflow needs attention'}</h2>
              <small>{definition ? 'The extension opens this site in a normal browser tab. ForgeOS does not embed or imitate it.' : compiled.errors[0]}</small>
              {definition && <button onClick={openTarget}>Open site safely <ArrowUpRight size={13} /></button>}
            </div>
            <aside className="browser-side-panel">
              <div className="side-panel-agent"><span><Bot size={17} /></span><div><strong>{title}</strong><small>{running ? 'Running test…' : runComplete ? 'Test passed' : 'Ready to test'}</small></div></div>
              <div className="side-panel-goal"><span>Goal</span><p>{definition?.goal || 'Complete the missing builder settings.'}</p></div>
              {definition && definition.inputs.length > 0 && (
                <div className="side-panel-inputs">
                  <span>Inputs for this run</span>
                  {definition.inputs.map((field) => <label key={field}><small>{field}</small><input value={inputs[field] ?? ''} onChange={(event) => setInputs((current) => ({ ...current, [field]: event.target.value }))} placeholder={`Enter ${field}`} /></label>)}
                </div>
              )}
              <div className="side-panel-actions">
                {running ? <button className="stop-run" onClick={reset}><CircleStop size={14} /> Stop safely</button> : <button className="start-run" onClick={() => void run()} disabled={!definition}><Play size={14} fill="currentColor" /> Test this flow</button>}
              </div>
            </aside>
          </div>
        </section>

        <aside className="browser-run-log">
          <header><div><strong>Execution trace</strong><small>{events.length ? `${events.filter((event) => event.state === 'done').length} checks passed` : 'Nothing has run yet'}</small></div>{runComplete && <span><Check size={12} /> Ready</span>}</header>
          {!definition && <div className="workflow-errors">{compiled.errors.map((error) => <p key={error}>{error}</p>)}</div>}
          {definition && events.length === 0 && <div className="empty-trace"><Bot size={22} /><strong>Run a safe dry test</strong><p>ForgeOS will validate every part of the graph without clicking the external website.</p></div>}
          <div className="browser-event-list">
            {events.map((event) => <div className={`browser-event ${event.state}`} key={event.id}><span>{event.state === 'running' ? <LoaderCircle size={13} /> : <Check size={13} />}</span><div><strong>{event.title}</strong><p>{event.detail}</p></div></div>)}
          </div>
          {runError && <div className="agent-test-error"><AlertCircle size={15} /><div><strong>The live reasoning step needs setup</strong><p>{runError}</p></div></div>}
          {agentResult && <section className="agent-test-result"><header><span><Sparkles size={13} /> Agent result</span><small>{agentResult.model}</small></header><pre>{agentResult.text}</pre>{agentResult.citations.length > 0 && <div className="agent-result-citations">{agentResult.citations.map((citation) => <a href={citation.url} target="_blank" rel="noreferrer" key={citation.url}>{citation.title}<ExternalLink size={10} /></a>)}</div>}</section>}
          <div className="browser-test-truth"><UserRound size={14} /><p><strong>Actions stay separate from reasoning.</strong> The test above produces a real model result when the server key is configured. Deploy to the ForgeOS extension for approved browser actions; email, calendar, publishing, and phone actions also need their own workspace connection.</p></div>
        </aside>
      </div>
    </main>
  )
}
