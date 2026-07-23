import { ArrowRight, Bot, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AGENT_TEMPLATES } from '../data/agentTemplates'
import { AgentTemplateCard } from './AgentTemplateCard'
import '../styles/product.css'

export function LandingAgentCarousel() {
  return <section className="landing-agent-section section-shell" id="agents">
    <div className="landing-agent-heading"><div><span className="section-index">01 — Choose an agent</span><h2>Start with a job.<br /><em>Make it yours.</em></h2></div><div><p>Pick a clear starting point, answer a few questions, and ForgeOS prepares the workflow. Every website, instruction, tool, and safeguard stays editable.</p><Link to="/templates">Browse every template <ArrowRight size={14} /></Link></div></div>
    <div className="landing-agent-carousel" role="region" aria-label="Agent templates">{AGENT_TEMPLATES.map((template) => <AgentTemplateCard compact template={template} key={template.id} />)}</div>
    <div className="landing-agent-note"><span><Sparkles size={15} /></span><div><strong>Only working runtimes can be opened.</strong><p>Product Research and the public playground work today. Planned agent cards stay visible but disabled until their complete workflow is ready.</p></div><Link to="/playground"><Bot size={14} /> Open playground</Link></div>
  </section>
}
