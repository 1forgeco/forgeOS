import { Bot, Cable, CalendarDays, Check, Database, FileText, Mail, MessageSquare, Phone, Puzzle, Share2, Sparkles } from 'lucide-react'
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
  const [runtime, setRuntime] = useState({ reasoning: 'checking', googleOAuth: 'checking', microsoftOAuth: 'checking' })
  const [extensions, setExtensions] = useState<Array<{ installationId: string; extensionVersion: string; label: string; lastSeenAt: string }>>([])
  const [error, setError] = useState('')
  useEffect(() => { productApi.connections().then((result) => { setSaved(result.connections); setRuntime(result.runtime); setExtensions(result.extensions) }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Connections could not be loaded.')) }, [])
  return <main className="product-page connections-page">
    <div className="product-page-heading"><div><span className="product-eyebrow"><Cable size={12} /> Workspace tools</span><h1>Connections</h1><p>Connect the services agents may use. Every connection is workspace-scoped and each workflow still needs explicit permission.</p></div></div>
    <section className="connection-security"><Sparkles size={16} /><p><strong>Connection secrets never enter workflow files.</strong> ForgeOS stores only a protected reference and shows exactly what each agent may read or change.</p></section>
    {error && <div className="product-error-banner">{error}<button onClick={() => window.location.reload()}>Retry</button></div>}
    <section className="connection-runtime-grid">
      <article><span><Puzzle size={20} /></span><div><h2>Browser extensions</h2><p>{extensions.length ? `${extensions.length} paired browser${extensions.length === 1 ? '' : 's'} can receive deployed agents.` : 'No browser is paired yet. Open an agent’s Deploy tab after installing the extension.'}</p>{extensions.map((extension) => <small key={extension.installationId}>{extension.label} · v{extension.extensionVersion} · seen {new Date(extension.lastSeenAt).toLocaleString()}</small>)}</div><b className={extensions.length ? 'ready' : ''}>{extensions.length ? 'Ready' : 'Not connected'}</b></article>
      <article><span><Bot size={20} /></span><div><h2>Specialist reasoning</h2><p>The server-side model turns collected browser evidence into the final structured result.</p></div><b className={runtime.reasoning === 'ready' ? 'ready' : ''}>{runtime.reasoning === 'ready' ? 'Ready' : 'Server key required'}</b></article>
    </section>
    <div className="record-list-heading"><div><h2>External services</h2><span>Activated only when vendor credentials are configured</span></div></div>
    <section className="connection-grid">{providers.filter((provider) => provider.id !== 'openai').map(({ id, name, description, icon: Icon, status }) => {
      const connected = saved.find((item) => item.provider === id)?.status === 'connected'
      const configured = id === 'google-calendar' || id === 'gmail' || id === 'google-drive' ? runtime.googleOAuth === 'configured' : id === 'microsoft' ? runtime.microsoftOAuth === 'configured' : false
      return <article key={id}><span><Icon size={19} /></span><div><h3>{name}</h3><p>{description}</p></div><small className={connected ? 'connected' : ''}>{connected ? <><Check size={10} /> Connected</> : configured ? status : 'Not enabled on this deployment'}</small><button disabled title={connected ? 'Connection management will open when this provider is enabled.' : configured ? 'OAuth flow is not yet enabled for this provider.' : 'An administrator must configure this provider first.'}>{connected ? 'Manage' : configured ? 'Awaiting OAuth route' : 'Unavailable'}</button></article>
    })}</section>
  </main>
}
