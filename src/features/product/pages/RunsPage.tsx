import { Activity, Check, Clock3, ExternalLink, Search, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { productApi } from '../api'
import type { AgentRunRecord } from '../types'

export function RunsPage() {
  const [runs, setRuns] = useState<AgentRunRecord[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { productApi.runs().then((result) => setRuns(result.runs)).finally(() => setLoading(false)) }, [])
  return <main className="product-page records-page">
    <div className="product-page-heading"><div><span className="product-eyebrow"><Activity size={12} /> Execution history</span><h1>Runs</h1><p>See what every agent attempted, where it paused, and what result it returned.</p></div></div>
    <section className="records-summary"><article><span>Completed</span><strong>{runs.filter((run) => run.status === 'completed').length}</strong></article><article><span>Needs attention</span><strong>{runs.filter((run) => run.status === 'failed' || run.status === 'takeover').length}</strong></article><article><span>Average duration</span><strong>—</strong></article></section>
    <div className="record-list-heading"><h2>Recent activity</h2><label><Search size={13} /><input placeholder="Search runs" /></label></div>
    {loading ? <div className="product-loading">Loading run history…</div> : runs.length ? <div className="record-list">{runs.map((run) => <article key={run.id}><span className={`record-state ${run.status}`}>{run.status === 'completed' ? <Check size={13} /> : <Clock3 size={13} />}</span><div><strong>{run.agentName}</strong><p>{run.goal}</p></div><span>{new Date(run.startedAt).toLocaleString()}</span><b>{run.status}</b><button aria-label="Open run"><ExternalLink size={13} /></button></article>)}</div> : <section className="empty-records"><span><Sparkles size={22} /></span><h2>No runs yet</h2><p>Test or run an agent and its actions, result, and status will appear here.</p></section>}
  </main>
}
