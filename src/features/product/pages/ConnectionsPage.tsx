import { Cable, CalendarDays, Check, Database, FileText, Mail, MessageSquare, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { productApi } from '../api'

const providers = [
  { id: 'google-calendar', name: 'Google Calendar', description: 'Check availability and prepare events.', icon: CalendarDays, status: 'planned' },
  { id: 'gmail', name: 'Gmail', description: 'Prepare messages and send after approval.', icon: Mail, status: 'planned' },
  { id: 'google-drive', name: 'Google Drive', description: 'Read approved documents and save outputs.', icon: FileText, status: 'planned' },
  { id: 'notion', name: 'Notion', description: 'Read workspace knowledge and create pages.', icon: Database, status: 'planned' },
  { id: 'slack', name: 'Slack', description: 'Send approved updates and human handoffs.', icon: MessageSquare, status: 'planned' },
]

export function ConnectionsPage() {
  const [saved, setSaved] = useState<Array<{ id: string; provider: string; status: string }>>([])
  useEffect(() => { productApi.connections().then((result) => setSaved(result.connections)) }, [])
  return <main className="product-page connections-page">
    <div className="product-page-heading"><div><span className="product-eyebrow"><Cable size={12} /> Workspace tools</span><h1>Connections</h1><p>Connect the services agents may use. Every connection is workspace-scoped and each workflow still needs explicit permission.</p></div></div>
    <section className="connection-security"><Sparkles size={16} /><p><strong>Connection secrets never enter workflow files.</strong> ForgeOS stores only a protected reference and shows exactly what each agent may read or change.</p></section>
    <section className="connection-grid">{providers.map(({ id, name, description, icon: Icon, status }) => { const connected = saved.find((item) => item.provider === id)?.status === 'connected'; return <article key={id}><span><Icon size={19} /></span><div><h3>{name}</h3><p>{description}</p></div><small className={connected ? 'connected' : ''}>{connected ? <><Check size={10} /> Connected</> : status}</small><button disabled>{connected ? 'Manage' : 'Coming soon'}</button></article> })}</section>
  </main>
}
