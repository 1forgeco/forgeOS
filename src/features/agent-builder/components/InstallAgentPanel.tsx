import { AlertTriangle, Check, Code2, Download, ExternalLink, Play, Puzzle, Radio, RefreshCw, ShieldCheck } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { compileBrowserWorkflow, downloadWorkflow } from '../runtime/browserWorkflow'
import { deliverDeploymentToExtension, detectForgeOSExtension, disconnectForgeOSExtension, type ForgeOSExtensionStatus } from '../runtime/extensionBridge'
import { productApi } from '../../product/api'
import type { AgentEdge, AgentNode } from '../types'

type InstallAgentPanelProps = {
  agentId: string
  title: string
  nodes: AgentNode[]
  edges: AgentEdge[]
  onOpenTest: () => void
}

type DeliveryState = 'idle' | 'pairing' | 'publishing' | 'delivering' | 'ready' | 'running' | 'error'

export function InstallAgentPanel({ agentId, title, nodes, edges, onOpenTest }: InstallAgentPanelProps) {
  const [downloaded, setDownloaded] = useState(false)
  const [deployedVersion, setDeployedVersion] = useState<number | null>(null)
  const [versions, setVersions] = useState<Array<{ id: string; version: number; createdAt: string }>>([])
  const [extension, setExtension] = useState<ForgeOSExtensionStatus | null>(null)
  const [checkingExtension, setCheckingExtension] = useState(true)
  const [deliveryState, setDeliveryState] = useState<DeliveryState>('idle')
  const [deliveryMessage, setDeliveryMessage] = useState('Checking for the ForgeOS extension…')
  const compiled = useMemo(() => compileBrowserWorkflow(title, nodes, edges), [title, nodes, edges])
  const definition = compiled.definition
  const needsInputs = Boolean(definition?.inputs.length)

  const checkExtension = useCallback(async () => {
    setCheckingExtension(true)
    const status = await detectForgeOSExtension()
    setExtension(status)
    setCheckingExtension(false)
    setDeliveryMessage(status ? `${status.paired ? 'Connected' : 'Detected'} · extension ${status.extensionVersion} · ${status.agentCount} installed agent${status.agentCount === 1 ? '' : 's'}` : 'Extension not detected. Reload it in chrome://extensions, then refresh this ForgeOS tab once.')
    return status
  }, [])

  useEffect(() => {
    void checkExtension()
    const refresh = () => { if (document.visibilityState === 'visible') void checkExtension() }
    document.addEventListener('visibilitychange', refresh)
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible') void checkExtension() }, 12_000)
    return () => { document.removeEventListener('visibilitychange', refresh); window.clearInterval(interval) }
  }, [checkExtension])

  useEffect(() => {
    if (agentId) productApi.versions(agentId).then((result) => setVersions(result.versions)).catch(() => setVersions([]))
  }, [agentId, deployedVersion])

  const exportAgent = () => {
    if (!definition) return
    downloadWorkflow(definition)
    setDownloaded(true)
    window.setTimeout(() => setDownloaded(false), 1_800)
  }

  const deployAgent = async (autoRun: boolean) => {
    if (!definition || !agentId || ['pairing', 'publishing', 'delivering'].includes(deliveryState)) return
    setDeliveryState('pairing')
    setDeliveryMessage('Connecting this browser securely…')
    try {
      const detected = extension ?? await checkExtension()
      if (!detected) throw new Error('Reload the ForgeOS extension, refresh this ForgeOS tab, and check again before deploying.')
      const pairing = await productApi.pairExtension({
        installationId: detected.installationId,
        extensionVersion: detected.extensionVersion,
        label: `${navigator.userAgent.includes('Edg/') ? 'Edge' : 'Chrome'} on this device`,
      })
      setDeliveryState('publishing')
      setDeliveryMessage('Publishing an immutable agent version…')
      const published = await productApi.deployAgent(agentId, { runtime: definition, name: title, nodes, edges }, { installationId: detected.installationId, autoRun })
      setDeliveryState('delivering')
      setDeliveryMessage('Sending the version securely to the extension…')
      await deliverDeploymentToExtension({ pairingToken: pairing.pairingToken, deploymentUrl: published.deploymentUrl, apiBase: window.location.origin, autoRun })
      setDeployedVersion(published.version)
      setExtension((current) => current ? { ...current, paired: true, workspaceName: pairing.workspace.name, agentCount: Math.max(1, current.agentCount) } : current)
      setDeliveryState(autoRun ? 'running' : 'ready')
      setDeliveryMessage(autoRun ? `Version ${published.version} delivered. The extension is starting the run.` : `Version ${published.version} is installed and ready in the extension.`)
    } catch (error) {
      setDeliveryState('error')
      setDeliveryMessage(error instanceof Error ? error.message : 'The agent could not be delivered to the extension.')
    }
  }

  const disconnectExtension = async () => {
    if (!extension || !window.confirm('Disconnect this browser extension from your ForgeOS workspace? Installed agents will remain on this device.')) return
    try {
      await productApi.disconnectExtension(extension.installationId)
      await disconnectForgeOSExtension()
      setExtension({ ...extension, paired: false, workspaceName: undefined })
      setDeliveryState('idle')
      setDeliveryMessage(`Detected · extension ${extension.extensionVersion} · connect again on the next deployment.`)
    } catch (error) {
      setDeliveryState('error')
      setDeliveryMessage(error instanceof Error ? error.message : 'The extension could not be disconnected.')
    }
  }

  const restore = async (version: number) => {
    if (!window.confirm(`Restore version ${version} as a new draft?`)) return
    await productApi.restoreVersion(agentId, version)
    window.location.reload()
  }

  const busy = ['pairing', 'publishing', 'delivering'].includes(deliveryState)

  return (
    <main className="install-agent-view deploy-agent-view">
      <section className="install-hero">
        <span className="view-eyebrow"><Puzzle size={13} /> Browser deployment</span>
        <h1>Deploy directly to your browser.</h1>
        <p>ForgeOS detects the extension on this exact app origin—localhost or hosted—publishes an immutable version, transfers it through a short-lived secure handoff, and keeps run activity synchronized. It does not depend on ChatGPT or a separate AI website.</p>
      </section>

      <div className={`extension-connection-card ${extension ? 'connected' : 'disconnected'}`}>
        <span><Radio size={17} /></span>
        <div><strong>{checkingExtension ? 'Looking for the extension…' : extension ? 'ForgeOS extension detected' : 'ForgeOS extension not detected'}</strong><p>{deliveryMessage}</p></div>
        <div className="extension-connection-actions">
          {extension?.paired && <button type="button" onClick={() => void disconnectExtension()}>Disconnect</button>}
          <button type="button" onClick={() => void checkExtension()} disabled={checkingExtension}><RefreshCw size={13} className={checkingExtension ? 'spinning' : ''} /> Check again</button>
        </div>
      </div>

      <div className="deploy-readiness-card">
        <div className={`deploy-readiness-icon ${definition ? 'ready' : 'blocked'}`}>{definition ? <Check size={18} /> : <AlertTriangle size={18} />}</div>
        <div><strong>{definition ? 'Agent definition is ready' : 'Fix the workflow before deploying'}</strong><p>{definition ? `${definition.allowedDomains.length} allowed domain${definition.allowedDomains.length === 1 ? '' : 's'} · ${definition.allowedActions.length} browser capabilities · ${definition.approvalActions.length} approval checks` : compiled.errors[0]}</p></div>
        <div className="deploy-primary-actions">
          <button onClick={() => void deployAgent(false)} disabled={!definition || !extension || busy}>{busy ? 'Deploying…' : deployedVersion ? `Deploy version ${deployedVersion + 1}` : 'Deploy to extension'} <ExternalLink size={13} /></button>
          <button className="deploy-run-action" onClick={() => void deployAgent(true)} disabled={!definition || !extension || needsInputs || busy} title={needsInputs ? 'Enter required inputs in the extension before running.' : undefined}><Play size={12} /> Deploy & run</button>
        </div>
      </div>

      {needsInputs && <div className="deploy-input-note"><ShieldCheck size={14} /><p><strong>This agent needs run inputs.</strong> Deployment will open it in the extension so you can review and enter them before execution.</p></div>}

      <div className="install-grid install-grid--automatic">
        <section className="install-steps-card">
          <h2>What happens on deploy</h2>
          <ol>
            <li><b>1</b><div><strong>Secure browser pairing</strong><p>ForgeOS connects this extension installation without sharing your website session cookie.</p></div></li>
            <li><b>2</b><div><strong>Version fetch and verification</strong><p>The extension fetches the published agent once, verifies its integrity and checks every permission.</p></div></li>
            <li><b>3</b><div><strong>Review or run</strong><p>Enter changing inputs, inspect permissions and run. Protected actions always pause for approval.</p></div></li>
          </ol>
        </section>

        <section className="extension-capability-card">
          <header><span><Puzzle size={16} /></span><div><strong>Extension runtime</strong><p>{extension ? `Version ${extension.extensionVersion}` : 'Waiting for connection'}</p></div></header>
          <div><span><Check size={12} /> Localhost and hosted detection</span><span><Check size={12} /> Pause, stop and takeover</span><span><Check size={12} /> Multi-page product research</span><span><Check size={12} /> Evidence-backed result brief</span></div>
          {!extension && <a href="/forgeos-extension.zip" download><Download size={13} /> Install development extension</a>}
        </section>
      </div>

      <details className="manual-deploy-card">
        <summary><Code2 size={15} /> Advanced: manual JSON fallback <span>Open</span></summary>
        <div className="manual-deploy-content">
          <section className="install-code-card deploy-definition-card">
            <header><div><Code2 size={16} /><strong>Agent definition</strong></div><span>JSON</span></header>
            <pre><code>{definition ? JSON.stringify(definition, null, 2) : JSON.stringify({ error: compiled.errors[0] ?? 'Workflow is incomplete' }, null, 2)}</code></pre>
            <div className="deploy-downloads">
              <button className="copy-code" onClick={exportAgent} disabled={!definition}>{downloaded ? <Check size={14} /> : <Download size={14} />}{downloaded ? 'Agent downloaded' : 'Download agent JSON'}</button>
              <a href="/forgeos-extension.zip" download><Puzzle size={14} /> Download extension package</a>
            </div>
          </section>
        </div>
      </details>

      <section className="install-status-card deploy-status-card">
        <div><span><ShieldCheck size={18} /></span><div><strong>Domain restricted</strong><p>The agent can act only on the domains configured in the workflow.</p></div></div>
        <div><span><Puzzle size={18} /></span><div><strong>Human controlled</strong><p>Passwords, payment details, CAPTCHA and protected actions remain under your control.</p></div></div>
        <button onClick={onOpenTest}>Test the definition <ExternalLink size={13} /></button>
      </section>

      {versions.length > 0 && <section className="version-history-card"><header><div><strong>Version history</strong><p>Published versions stay immutable. Restore any editable snapshot as a new draft.</p></div><span>{versions.length} versions</span></header><div>{versions.map((version) => <article key={version.id}><span>v{version.version}</span><div><strong>{version.version === versions[0].version ? 'Current published version' : 'Previous version'}</strong><small>{new Date(version.createdAt).toLocaleString()}</small></div>{version.version !== versions[0].version && <button onClick={() => void restore(version.version)}>Restore draft</button>}</article>)}</div></section>}
    </main>
  )
}
