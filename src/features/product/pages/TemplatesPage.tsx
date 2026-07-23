import { Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AgentTemplateCard } from '../components/AgentTemplateCard'
import { AGENT_TEMPLATES } from '../data/agentTemplates'

export function TemplatesPage() {
  const [query, setQuery] = useState('')
  const templates = useMemo(() => AGENT_TEMPLATES.filter((template) => `${template.name} ${template.category} ${template.description} ${template.capabilities.join(' ')}`.toLowerCase().includes(query.toLowerCase())), [query])
  return <main className="product-page templates-page">
    <div className="template-library-hero"><div><span className="product-eyebrow"><Sparkles size={12} /> Agent library</span><h1>Start with one agent that goes deep.</h1><p>Product Research is the first complete real-browser runtime. The public playground is open for custom experiments; every other card stays disabled until its workflow can meet the same standard.</p></div><a href="/playground">Open public playground</a></div>
    <div className="template-library-toolbar"><label><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agents and capabilities" /></label><div><span>Working now</span><span>Playground</span><span>Coming soon</span></div></div>
    <section className="template-library-grid">{templates.map((template) => <AgentTemplateCard template={template} key={template.id} />)}</section>
  </main>
}
