import { Check, Clipboard, Code2, ExternalLink, Globe2, ShieldCheck } from 'lucide-react'
import { useMemo, useState } from 'react'

type InstallAgentPanelProps = {
  onOpenTest: () => void
}

export function InstallAgentPanel({ onOpenTest }: InstallAgentPanelProps) {
  const [copied, setCopied] = useState(false)
  const baseUrl = window.location.origin
  const snippet = useMemo(() => `<script
  async
  src="${baseUrl}/forgeos-widget.js"
  data-agent-id="demo-booking"
  data-title="Booking concierge"
  data-accent="#6f63f6"
></script>`, [baseUrl])

  const copySnippet = async () => {
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <main className="install-agent-view">
      <section className="install-hero">
        <span className="view-eyebrow"><Globe2 size={13} /> Website installation</span>
        <h1>Put this agent on your website.</h1>
        <p>Copy one small script into your site. It adds a floating Booking Concierge that uses the workflow and agent endpoint you just tested.</p>
      </section>

      <div className="install-grid">
        <section className="install-code-card">
          <header><div><Code2 size={16} /><strong>Installation code</strong></div><span>HTML</span></header>
          <pre><code>{snippet}</code></pre>
          <button className="copy-code" onClick={() => void copySnippet()}>{copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? 'Copied' : 'Copy installation code'}</button>
        </section>

        <section className="install-steps-card">
          <h2>Install in three steps</h2>
          <ol>
            <li><b>1</b><div><strong>Copy the code</strong><p>Use the button beside the installation snippet.</p></div></li>
            <li><b>2</b><div><strong>Paste before <code>&lt;/body&gt;</code></strong><p>Add it to the global layout or footer of your website.</p></div></li>
            <li><b>3</b><div><strong>Open your website</strong><p>The purple chat button appears in the bottom-right corner.</p></div></li>
          </ol>
        </section>
      </div>

      <section className="install-status-card">
        <div><span><ShieldCheck size={18} /></span><div><strong>Safe test configuration</strong><p>The widget can only use the demo booking agent. It cannot access the rest of the visitor’s site or accounts.</p></div></div>
        <div><span><Globe2 size={18} /></span><div><strong>Public access required</strong><p>External websites cannot load an owner-only deployment. Make ForgeOS public when you are ready to test the widget on another domain.</p></div></div>
        <button onClick={onOpenTest}>Test inside ForgeOS first <ExternalLink size={13} /></button>
      </section>
    </main>
  )
}
