import { ArrowLeft, ArrowRight, Bot, Check, ShieldCheck, Sparkles } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getTemplate } from '../data/agentTemplates'
import '../styles/product.css'

export function TemplateDetailPage() {
  const { slug = '' } = useParams()
  const template = getTemplate(slug)
  if (!template) return <Navigate to="/" replace />
  return <main className="template-detail-page">
    <header className="template-detail-nav"><Link to="/"><span>F</span><strong>ForgeOS</strong></Link><nav><Link to="/#agents">Agent templates</Link><Link to="/#safety">Safety</Link><Link to="/projects">Log in</Link></nav></header>
    <section className="template-detail-hero"><Link className="back-template" to="/#agents"><ArrowLeft size={13} /> All agents</Link><div className="template-detail-icon" style={{ color: template.accent, background: template.softAccent }}><Bot size={28} /></div><span className={`availability-badge ${template.availability}`}>{template.availability.replace('-', ' ')}</span><h1>{template.name}</h1><p>{template.outcome} {template.description}</p>{template.availability !== 'coming-soon' ? <Link className="detail-cta" to={`/new/${template.id}`}>Use this agent <ArrowRight size={14} /></Link> : <span className="detail-coming">Planned for a future runtime release</span>}</section>
    <section className="template-detail-grid"><article><span className="product-eyebrow"><Sparkles size={11} /> What it does</span><h2>Starts useful. Stays editable.</h2><p>This card creates a complete workflow with a website, specialist reasoning mode, run inputs, browser capabilities, approval rules, fallback, and result format. Every part remains editable on the visual canvas.</p><ul>{template.capabilities.map((item) => <li key={item}><Check size={12} /> {item}</li>)}</ul>{template.requiredConnections.length > 0 && <div className="template-connections"><strong>Connections for live actions</strong><p>{template.requiredConnections.join(' · ')}</p></div>}</article><article className="template-example-card"><small>Example goal</small><p>{template.defaultGoal}</p><div><span>Example sites</span>{template.exampleSites.map((site) => <b key={site}>{site}</b>)}</div></article></section>
    <section className="template-safety-section" id="safety"><ShieldCheck size={23} /><div><span className="product-eyebrow">Human control</span><h2>It pauses before the action matters.</h2><p>Login, CAPTCHA, two-factor authentication, payments, final purchases, legal acceptance, and irreversible actions stay with you.</p></div></section>
  </main>
}
