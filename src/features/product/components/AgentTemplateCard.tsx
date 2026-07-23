import { ArrowUpRight, Bot, Check, Clock3, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import type { AgentTemplate } from '../types'

type AgentTemplateCardProps = {
  template: AgentTemplate
  compact?: boolean
}

export function AgentTemplateCard({ template, compact = false }: AgentTemplateCardProps) {
  const available = template.availability !== 'coming-soon'
  return (
    <article className={`agent-template-card${compact ? ' compact' : ''}${available ? '' : ' unavailable'}`} title={available ? undefined : 'Coming soon — this agent cannot be opened yet'} aria-disabled={!available} style={{ '--template-accent': template.accent, '--template-soft': template.softAccent } as CSSProperties}>
      <div className="template-card-top">
        <span className="template-avatar"><Bot size={compact ? 16 : 20} /></span>
        <span className={`availability-badge ${template.availability}`}>{template.availability === 'available' ? <Check size={10} /> : <Clock3 size={10} />}{template.availability.replace('-', ' ')}</span>
      </div>
      <span className="template-category">{template.category}</span>
      <h3>{template.name}</h3>
      <p>{template.outcome}</p>
      {!compact && <div className="template-capabilities">{template.capabilities.map((item) => <span key={item}>{item}</span>)}</div>}
      <div className="template-card-meta"><span><ShieldCheck size={11} /> {template.risk} risk</span><span>{template.exampleSites[0]}</span></div>
      <div className="template-card-actions">
        {available ? <><Link to={`/agents/${template.slug}`}>See details</Link><Link className="use-template" to={`/new/${template.id}`}>{template.availability === 'beta' ? 'Build preview' : 'Use agent'} <ArrowUpRight size={13} /></Link></> : <><span className="coming-label">Workflow in development</span><span className="coming-hover">Coming soon</span></>}
      </div>
    </article>
  )
}
