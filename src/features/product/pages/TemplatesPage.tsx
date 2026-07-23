import { Search, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AgentTemplateCard } from '../components/AgentTemplateCard'
import { AGENT_TEMPLATES } from '../data/agentTemplates'

export function TemplatesPage() {
  const [query, setQuery] = useState('')
  const [availability, setAvailability] = useState('all')
  const [category, setCategory] = useState('all')
  const categories = useMemo(() => Array.from(new Set(AGENT_TEMPLATES.map((template) => template.category))).sort(), [])
  const templates = useMemo(() => AGENT_TEMPLATES.filter((template) => {
    const matchesQuery = `${template.name} ${template.category} ${template.description} ${template.capabilities.join(' ')}`.toLowerCase().includes(query.toLowerCase())
    const matchesAvailability = availability === 'all' || template.availability === availability
    const matchesCategory = category === 'all' || template.category === category
    return matchesQuery && matchesAvailability && matchesCategory
  }), [availability, category, query])
  return <main className="product-page templates-page">
    <div className="template-library-hero"><div><span className="product-eyebrow"><Sparkles size={12} /> Agent library</span><h1>Choose the specialist you need.</h1><p>Six advanced business-agent templates now include dedicated goals, run inputs, reasoning policies, connection requirements, and approval boundaries. Beta agents can be built and tested now; live external actions activate as their required accounts are connected.</p></div><a href="/playground">Build a custom agent</a></div>
    <div className="template-library-toolbar"><label><Search size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agents and capabilities" /></label><div className="template-filter-controls"><select aria-label="Filter by availability" value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="all">All availability</option><option value="available">Works now</option><option value="beta">Beta</option><option value="coming-soon">Coming soon</option></select><select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></div></div>
    {templates.length ? <section className="template-library-grid">{templates.map((template) => <AgentTemplateCard template={template} key={template.id} />)}</section> : <section className="empty-records"><Sparkles size={22} /><h2>No agents match</h2><p>Try a broader search or clear one of the filters.</p><button onClick={() => { setQuery(''); setAvailability('all'); setCategory('all') }}>Clear filters</button></section>}
  </main>
}
