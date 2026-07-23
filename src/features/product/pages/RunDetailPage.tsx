import { Activity, AlertTriangle, ArrowLeft, Bot, Check, Clock3, ExternalLink, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { productApi } from '../api'
import type { RunDetail } from '../types'

function duration(run: RunDetail) {
  if (!run.completedAt) return 'Still running'
  const milliseconds = new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()
  if (milliseconds < 60_000) return `${Math.max(1, Math.round(milliseconds / 1_000))} sec`
  return `${Math.round(milliseconds / 60_000)} min`
}

export function RunDetailPage() {
  const { runId = '' } = useParams()
  const [run, setRun] = useState<RunDetail | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { productApi.run(runId).then((result) => setRun(result.run)).catch((cause) => setError(cause instanceof Error ? cause.message : 'This run could not be opened.')) }, [runId])

  if (error) return <main className="product-page"><section className="empty-records"><AlertTriangle size={24} /><h2>Run unavailable</h2><p>{error}</p><Link to="/runs">Return to runs</Link></section></main>
  if (!run) return <main className="product-page"><div className="product-loading">Opening the run record…</div></main>

  return (
    <main className="product-page run-detail-page">
      <Link className="run-detail-back" to="/runs"><ArrowLeft size={14} /> All runs</Link>
      <div className="product-page-heading">
        <div><span className="product-eyebrow"><Activity size={12} /> Run record</span><h1>{run.agentName}</h1><p>{run.goal}</p></div>
        <span className={`run-detail-status ${run.status}`}>{run.status === 'completed' ? <Check size={14} /> : <Clock3 size={14} />}{run.status}</span>
      </div>
      <section className="records-summary">
        <article><span>Started</span><strong className="run-detail-metric">{new Date(run.startedAt).toLocaleString()}</strong></article>
        <article><span>Duration</span><strong className="run-detail-metric">{duration(run)}</strong></article>
        <article><span>Protected actions</span><strong>{run.approvals.length}</strong></article>
      </section>
      <section className="run-detail-grid">
        <article className="run-timeline-card">
          <header><div><Activity size={16} /><span><strong>Activity timeline</strong><small>{run.events.length} recorded events</small></span></div><a href={run.websiteUrl} target="_blank" rel="noreferrer">Open target <ExternalLink size={12} /></a></header>
          {run.events.length ? <ol>{run.events.map((event) => <li className={event.state} key={event.id}><span>{event.state === 'completed' ? <Check size={12} /> : <Bot size={12} />}</span><div><strong>{event.title}</strong><p>{event.detail}</p><time>{new Date(event.createdAt).toLocaleString()}</time></div></li>)}</ol> : <div className="run-empty-section">No step-level events were recorded for this run.</div>}
        </article>
        <aside>
          <section className="run-result-card"><header><Bot size={16} /><strong>Result</strong></header><pre>{run.result || 'This run did not return a saved result.'}</pre></section>
          <section className="run-approval-card"><header><ShieldCheck size={16} /><strong>Approval decisions</strong></header>{run.approvals.length ? run.approvals.map((approval) => <div key={approval.id}><span>{approval.action}</span><b className={approval.status}>{approval.status}</b><p>{approval.details}</p></div>) : <p>No protected action was requested.</p>}</section>
        </aside>
      </section>
    </main>
  )
}
