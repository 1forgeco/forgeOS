import { Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AgentTemplateCard } from '../components/AgentTemplateCard'
import { AGENT_TEMPLATES } from '../data/agentTemplates'

export function TemplatesPage() {
  const [query, setQuery] = useState('')
  const templates = useMemo(() => AGENT_TEMPLATES.filter((template) => `${template.name} ${template.category} ${template.description} ${template.capabilities.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [query])
  return <main className="product-page templates-page">
    <div className="product-page-heading"><div><span className="product-eyebrow"><Sparkles size={12} /> Agent library</span><h1>Choose a useful starting point.</h1><p>Every template creates an editable workflow. You can change its website, goal, tools, safeguards, and output before deploying.</p></div></div>
    <div className="template-library-toolbar"><label><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search templates and capabilities" /></label><div><span>Available</span><span>Beta</span><span>Coming soon</span></div></div>
    <section className="template-library-grid">{templates.map((template) => <AgentTemplateCard template={template} key={template.id} />)}</section>
  </main>
}
