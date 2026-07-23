import { Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AgentTemplateCard } from '../components/AgentTemplateCard'
import { AGENT_TEMPLATES } from '../data/agentTemplates'

export function TemplatesPage() {
  const [query, setQuery] = useState('')
  const templates = useMemo(() => AGENT_TEMPLATES.filter((template) => `${template.name} ${template.category} ${template.description} ${template.capabilities.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [query])
  return <main className="product-page templates-page">
    <div className="template-library-hero"><div><span className="product-eyebrow"><Sparkles size={12} /> Agent library</span><h1>Choose the specialist you need.</h1><p>Six advanced business-agent templates now include dedicated goals, run inputs, reasoning policies, connection requirements, and approval boundaries. Beta agents can be built and tested now; live external actions activate as their required accounts are connected.</p></div><a href="/playground">Build a custom agent</a></div>
    <div className="template-library-toolbar"><label><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agents and capabilities" /></label><div><span>Available</span><span>Beta · needs connections</span><span>Coming soon</span></div></div>
    <section className="template-library-grid">{templates.map((template) => <AgentTemplateCard template={template} key={template.id} />)}</section>
  </main>
}
