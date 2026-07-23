import { Bot, Cable, CalendarDays, Check, Database, FileText, Mail, MessageSquare, Phone, Share2, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { productApi } from '../api'

const providers = [
  { id: 'openai', name: 'OpenAI reasoning', description: 'Powers specialist reasoning, grounded writing, analysis, and web research.', icon: Bot, status: 'server key required' },
  { id: 'google-calendar', name: 'Google Calendar', description: 'Read availability and create approved events.', icon: CalendarDays, status: 'OAuth required' },
  { id: 'gmail', name: 'Gmail', description: 'Triage mail and save or send approved drafts.', icon: Mail, status: 'OAuth required' },
  { id: 'microsoft', name: 'Microsoft 365', description: 'Connect Outlook mail and calendar for executive-assistant work.', icon: Mail, status: 'OAuth required' },
  { id: 'social-publishing', name: 'Social publishing', description: 'Publish approved LinkedIn, Meta, and X content.', icon: Share2, status: 'app credentials required' },
  { id: 'cms', name: 'Website CMS', description: 'Save or publish approved WordPress, Webflow, Shopify, or Wix drafts.', icon: Database, status: 'site token required' },
  { id: 'telephony', name: 'Phone and SMS', description: 'Answer, transfer, transcribe, and follow up on calls.', icon: Phone, status: 'telephony account required' },
  { id: 'google-drive', name: 'Google Drive', description: 'Read approved legal and business documents.', icon: FileText, status: 'OAuth required' },
  { id: 'slack', name: 'Slack', description: 'Send approved updates and human handoffs.', icon: MessageSquare, status: 'OAuth required' },
]

export function ConnectionsPage() {
  const [saved, setSaved] = useState<Array<{ id: string; provider: string; status: string }>>([])
  useEffect(() => { productApi.connections().then((result) => setSaved(result.connections)) }, [])
  return <main className="product-page connections-page">
    <div className="product-page-heading"><div><span className="product-eyebrow"><Cable size={12} /> Workspace tools</span><h1>Connections</h1><p>Connect the services agents may use. Every connection is workspace-scoped and each workflow still needs explicit permission.</p></div></div>
    <section className="connection-security"><Sparkles size={16} /><p><strong>Connection secrets never enter workflow files.</strong> ForgeOS stores only a protected reference and shows exactly what each agent may read or change.</p></section>
    <section className="connection-grid">{providers.map(({ id, name, description, icon: Icon, status }) => { const connected = saved.find((item) => item.provider === id)?.status === 'connected'; return <article key={id}><span><Icon size={19} /></span><div><h3>{name}</h3><p>{description}</p></div><small className={connected ? 'connected' : ''}>{connected ? <><Check size={10} /> Connected</> : status}</small><button disabled>{connected ? 'Manage' : 'Needs setup'}</button></article> })}</section>
  </main>
}
