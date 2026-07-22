import { AlertTriangle, Check, Code2, Download, ExternalLink, Puzzle, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { compileBrowserWorkflow, downloadWorkflow } from '../runtime/browserWorkflow'
import { productApi } from '../../product/api'
import type { AgentEdge, AgentNode } from '../types'

type InstallAgentPanelProps = {
  agentId: string
  title: string
  nodes: AgentNode[]
  edges: AgentEdge[]
  onOpenTest: () => void
}

export function InstallAgentPanel({ agentId, title, nodes, edges, onOpenTest }: InstallAgentPanelProps) {
  const [downloaded, setDownloaded] = useState(false)
  const [deployedVersion, setDeployedVersion] = useState<number | null>(null)
  const [deploying, setDeploying] = useState(false)
  const [versions, setVersions] = useState<Array<{ id: string; version: number; createdAt: string }>>([])
  const compiled = useMemo(() => compileBrowserWorkflow(title, nodes, edges), [title, nodes, edges])
  const definition = compiled.definition
  useEffect(() => { if (agentId) productApi.versions(agentId).then((result) => setVersions(result.versions)).catch(() => setVersions([])) }, [agentId, deployedVersion])

  const exportAgent = () => {
    if (!definition) return
    downloadWorkflow(definition)
    setDownloaded(true)
    window.setTimeout(() => setDownloaded(false), 1800)
  }

  const deployAgent = async () => {
    if (!definition || !agentId || deploying) return
    setDeploying(true)
    try { const result = await productApi.deployAgent(agentId, { runtime: definition, name: title, nodes, edges }); setDeployedVersion(result.version) } finally { setDeploying(false) }
  }

  const restore = async (version: number) => { if (!window.confirm(`Restore version ${version} as a new draft?`)) return; await productApi.restoreVersion(agentId, version); window.location.reload() }

  return (
    <main className="install-agent-view deploy-agent-view">
      <section className="install-hero">
        <span className="view-eyebrow"><Puzzle size={13} /> Browser deployment</span>
        <h1>Move this workflow into the browser.</h1>
        <p>ForgeOS exports one versioned agent file. The browser extension reads it, opens the allowed website in a normal tab, shows progress in the side panel, and enforces your approval rules.</p>
      </section>

      <div className="deploy-readiness-card">
        <div className={`deploy-readiness-icon ${definition ? 'ready' : 'blocked'}`}>{definition ? <Check size={18} /> : <AlertTriangle size={18} />}</div>
        <div><strong>{definition ? 'Agent definition is ready' : 'Fix the workflow before deploying'}</strong><p>{definition ? `${definition.allowedDomains.length} allowed domain${definition.allowedDomains.length === 1 ? '' : 's'} · ${definition.allowedActions.length} browser capabilities · ${definition.approvalActions.length} approval checks` : compiled.errors[0]}</p></div>
        <button onClick={() => void deployAgent()} disabled={!definition || deploying}>{deployedVersion ? `Version ${deployedVersion} live` : deploying ? 'Publishing…' : 'Publish version'} <ExternalLink size={13} /></button>
      </div>

      <div className="install-grid">
        <section className="install-code-card deploy-definition-card">
          <header><div><Code2 size={16} /><strong>Version 1 agent definition</strong></div><span>JSON</span></header>
          <pre><code>{definition ? JSON.stringify(definition, null, 2) : JSON.stringify({ error: compiled.errors[0] ?? 'Workflow is incomplete' }, null, 2)}</code></pre>
          <div className="deploy-downloads">
            <button className="copy-code" onClick={exportAgent} disabled={!definition}>{downloaded ? <Check size={14} /> : <Download size={14} />}{downloaded ? 'Agent downloaded' : 'Download agent file'}</button>
            <a href="/forgeos-extension.zip" download><Puzzle size={14} /> Download Chrome extension</a>
          </div>
        </section>

        <section className="install-steps-card">
          <h2>Test with the Chrome extension</h2>
          <ol>
            <li><b>1</b><div><strong>Load the ForgeOS extension</strong><p>Download and unzip it, open Chrome Extensions, enable Developer mode, then load the unpacked <code>extension</code> folder.</p></div></li>
            <li><b>2</b><div><strong>Import this agent</strong><p>Download the JSON file here, then import it from the ForgeOS side panel.</p></div></li>
            <li><b>3</b><div><strong>Review and run</strong><p>The extension opens the target site. You remain in control of login, CAPTCHA, payments, and every protected action.</p></div></li>
          </ol>
        </section>
      </div>

      <section className="install-status-card deploy-status-card">
        <div><span><ShieldCheck size={18} /></span><div><strong>Domain restricted</strong><p>The exported agent can act only on the domains configured in the website node.</p></div></div>
        <div><span><Puzzle size={18} /></span><div><strong>Hybrid execution</strong><p>The agent chooses among approved browser capabilities. You do not need a separate node for every click or filter.</p></div></div>
        <button onClick={onOpenTest}>Test the definition <ExternalLink size={13} /></button>
      </section>
      {versions.length > 0 && <section className="version-history-card"><header><div><strong>Version history</strong><p>Published versions stay immutable. Restore any editable snapshot as a new draft.</p></div><span>{versions.length} versions</span></header><div>{versions.map((version) => <article key={version.id}><span>v{version.version}</span><div><strong>{version.version === versions[0].version ? 'Current published version' : 'Previous version'}</strong><small>{new Date(version.createdAt).toLocaleString()}</small></div>{version.version !== versions[0].version && <button onClick={() => void restore(version.version)}>Restore draft</button>}</article>)}</div></section>}
    </main>
  )
}
