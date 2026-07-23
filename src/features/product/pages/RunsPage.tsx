import { Activity, Check, Clock3, ExternalLink, Search, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { productApi } from '../api'
import type { AgentRunRecord } from '../types'

export function RunsPage() {
  const [runs, setRuns] = useState<AgentRunRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [error, setError] = useState('')
  useEffect(() => { productApi.runs().then((result) => setRuns(result.runs)).catch((cause) => setError(cause instanceof Error ? cause.message : 'Run history could not be loaded.')).finally(() => setLoading(false)) }, [])
  const filtered = useMemo(() => runs.filter((run) => {
    const matchesQuery = `${run.agentName} ${run.goal} ${run.result || ''}`.toLowerCase().includes(query.toLowerCase())
    return matchesQuery && (status === 'all' || run.status === status)
  }), [query, runs, status])
  const completedDurations = runs.filter((run) => run.completedAt).map((run) => new Date(run.completedAt as string).getTime() - new Date(run.startedAt).getTime()).filter((value) => value >= 0)
  const average = completedDurations.length ? Math.round(completedDurations.reduce((sum, value) => sum + value, 0) / completedDurations.length / 1_000) : null
  return <main className="product-page records-page">
    <div className="product-page-heading"><div><span className="product-eyebrow"><Activity size={12} /> Execution history</span><h1>Runs</h1><p>See what every agent attempted, where it paused, and what result it returned.</p></div></div>
    <section className="records-summary"><article><span>Completed</span><strong>{runs.filter((run) => run.status === 'completed').length}</strong></article><article><span>Needs attention</span><strong>{runs.filter((run) => run.status === 'failed' || run.status === 'takeover').length}</strong></article><article><span>Average duration</span><strong>{average === null ? '—' : average < 60 ? `${average}s` : `${Math.round(average / 60)}m`}</strong></article></section>
    <div className="record-list-heading"><h2>Recent activity</h2><div className="record-filters"><select aria-label="Filter runs by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="takeover">Needs takeover</option><option value="running">Running</option><option value="stopped">Stopped</option></select><label><Search size={13} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search runs" /></label></div></div>
    {error && <div className="product-error-banner">{error}<button onClick={() => window.location.reload()}>Retry</button></div>}
    {loading ? <div className="product-loading">Loading run history…</div> : filtered.length ? <div className="record-list">{filtered.map((run) => <Link to={`/runs/${run.id}`} className="record-list-row" key={run.id}><span className={`record-state ${run.status}`}>{run.status === 'completed' ? <Check size={13} /> : <Clock3 size={13} />}</span><div><strong>{run.agentName}</strong><p>{run.goal}</p></div><span>{new Date(run.startedAt).toLocaleString()}</span><b>{run.status}</b><span aria-label="Open run"><ExternalLink size={13} /></span></Link>)}</div> : <section className="empty-records"><span><Sparkles size={22} /></span><h2>{runs.length ? 'No runs match these filters' : 'No runs yet'}</h2><p>{runs.length ? 'Change the status or search query to see more activity.' : 'Test or run an agent and its actions, result, and status will appear here.'}</p>{!runs.length && <Link to="/projects">Open an agent</Link>}</section>}
  </main>
}
