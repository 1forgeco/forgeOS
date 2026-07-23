import { ArrowRight, Bot, Copy, Globe2, Pause, Play, Plus, Search, ShieldCheck, Sparkles, Trash2, Workflow } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { productApi } from '../api'
import { AGENT_TEMPLATES } from '../data/agentTemplates'
import type { StoredAgent } from '../types'

function relativeDate(value: string) {
  const difference = Date.now() - new Date(value).getTime()
  const days = Math.floor(difference / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

export function ProjectsPage() {
  const [agents, setAgents] = useState<StoredAgent[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  useEffect(() => { productApi.agents().then((result) => setAgents(result.agents)).finally(() => setLoading(false)) }, [])
  const filtered = useMemo(() => agents.filter((agent) => `${agent.name} ${agent.goal} ${agent.websiteUrl}`.toLowerCase().includes(query.toLowerCase())), [agents, query])
  const changeStatus = async (agent: StoredAgent) => { const next = agent.status === 'paused' ? 'draft' : 'paused'; await productApi.updateAgent(agent.id, { status: next }); setAgents((current) => current.map((item) => item.id === agent.id ? { ...item, status: next } : item)) }
  const duplicate = async (agent: StoredAgent) => { const result = await productApi.createAgent({ templateId: agent.templateId, name: `${agent.name} copy`, websiteUrl: agent.websiteUrl, goal: agent.goal, nodes: agent.nodes, edges: agent.edges }); setAgents((current) => [result.agent, ...current]) }
  const remove = async (agent: StoredAgent) => { if (!window.confirm(`Delete “${agent.name}”? This also removes its versions and run history.`)) return; await productApi.deleteAgent(agent.id); setAgents((current) => current.filter((item) => item.id !== agent.id)) }

  return (
    <main className="product-page projects-page">
      <section className="agents-command-hero">
        <div><span className="product-eyebrow"><Sparkles size={12} /> Your agent command center</span><h1>Build fewer agents.<br />Make each one excellent.</h1><p>Create, test, deploy, and inspect agents that do visible work in your browser. Product Research now performs bounded multi-page comparison instead of stopping at search results.</p><div><Link className="primary-product-action" to="/templates"><Plus size={15} /> Create working agent</Link><a href="/playground"><Workflow size={14} /> Open playground</a></div></div>
        <aside><span><i /> Browser runtime ready</span><div><b>01</b><strong>Collect candidates</strong></div><div><b>02</b><strong>Inspect evidence</strong></div><div><b>03</b><strong>Rank by use case</strong></div><small><ShieldCheck size={12} /> Domain restricted · human controlled</small></aside>
      </section>
      <section className="workspace-summary">
        <article><span>Agents</span><strong>{agents.length}</strong><small>{agents.filter((agent) => agent.status === 'live').length} currently live</small></article>
        <article><span>Runs this month</span><strong>0</strong><small>Run history begins after testing</small></article>
        <article><span>Needs approval</span><strong>0</strong><small>Nothing waiting for you</small></article>
        <article className="runtime-summary"><span><i /> Runtime</span><strong>Research ready</strong><small>Up to five product pages per run</small></article>
      </section>
      <div className="agents-toolbar"><div><h2>Your agents</h2><span>{filtered.length} total</span></div><label><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agents" /></label></div>
      {loading ? <div className="product-loading">Loading your agents…</div> : filtered.length > 0 ? (
        <section className="saved-agent-grid">
          {filtered.map((agent) => {
            const template = AGENT_TEMPLATES.find((item) => item.id === agent.templateId)
            return <article className="saved-agent-card" key={agent.id}>
              <Link className="saved-agent-open" to={`/app/${agent.id}`}><div className="saved-agent-accent" style={{ background: template?.accent || '#6759cf' }} /><div className="saved-agent-top"><span style={{ background: template?.softAccent, color: template?.accent }}><Bot size={18} /></span><b>Open studio <ArrowRight size={12} /></b></div><div className="saved-agent-labels"><span className={`agent-status ${agent.status}`}><i /> {agent.status}</span><span>{agent.templateId === 'product-research' ? 'Advanced research' : template?.category || 'Custom'}</span></div><h3>{agent.name}</h3><p>{agent.goal}</p><div className="saved-agent-pipeline"><span><Search size={11} /> Find</span><i /><span><Globe2 size={11} /> Inspect</span><i /><span><Sparkles size={11} /> Return</span></div><div className="agent-site">{agent.websiteUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</div></Link>
              <footer><span>Edited {relativeDate(agent.updatedAt)}</span><div><button onClick={() => void duplicate(agent)} title="Duplicate"><Copy size={12} /></button><button onClick={() => void changeStatus(agent)} title={agent.status === 'paused' ? 'Resume' : 'Pause'}>{agent.status === 'paused' ? <Play size={12} /> : <Pause size={12} />}</button><button className="delete-agent-action" onClick={() => void remove(agent)} title="Delete"><Trash2 size={12} /></button></div></footer>
            </article>
          })}
          <Link className="saved-agent-card new-card" to="/templates"><Plus size={20} /><strong>Create another agent</strong><span>Start with a guided template or a blank workflow.</span></Link>
        </section>
      ) : (
        <section className="empty-agents-state"><span><Bot size={25} /></span><h2>{query ? 'No agents match that search' : 'Create your first working agent'}</h2><p>{query ? 'Try a different agent name, website, or goal.' : 'Choose a clear starting point, answer a few questions, and ForgeOS will prepare the workflow.'}</p>{!query && <Link to="/templates">Browse agent templates <ArrowRight size={13} /></Link>}</section>
      )}
      <section className="project-template-strip"><div><span className="product-eyebrow">Recommended next</span><h2>Start with a clear outcome.</h2></div>{AGENT_TEMPLATES.filter((template) => template.availability === 'available').map((template) => <Link to={`/new/${template.id}`} key={template.id}><span style={{ background: template.softAccent, color: template.accent }}><Bot size={15} /></span><div><strong>{template.name}</strong><small>{template.outcome}</small></div><ArrowRight size={13} /></Link>)}</section>
    </main>
  )
}
