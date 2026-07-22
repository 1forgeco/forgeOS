export type ForgeOSExtensionStatus = {
  installed: true
  installationId: string
  extensionVersion: string
  paired: boolean
  workspaceName?: string
  agentCount: number
}

type DeploymentBridgePayload = {
  pairingToken: string
  deploymentUrl: string
  apiBase: string
  autoRun: boolean
}

type BridgeResponse<T> = { ok: boolean; payload?: T; error?: string }

const REQUEST_CHANNEL = 'forgeos-web'
const RESPONSE_CHANNEL = 'forgeos-extension'

function bridgeRequest<T>(type: string, payload?: unknown, timeout = 1_500) {
  return new Promise<BridgeResponse<T>>((resolve) => {
    const requestId = crypto.randomUUID()
    let timer = 0

    const finish = (response: BridgeResponse<T>) => {
      window.clearTimeout(timer)
      window.removeEventListener('message', receive)
      resolve(response)
    }

    const receive = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return
      const message = event.data as { channel?: string; requestId?: string; ok?: boolean; payload?: T; error?: string }
      if (message?.channel !== RESPONSE_CHANNEL || message.requestId !== requestId) return
      finish({ ok: Boolean(message.ok), payload: message.payload, error: message.error })
    }

    window.addEventListener('message', receive)
    window.postMessage({ channel: REQUEST_CHANNEL, requestId, type, payload }, window.location.origin)
    timer = window.setTimeout(() => finish({ ok: false, error: 'ForgeOS extension not detected.' }), timeout)
  })
}

export async function detectForgeOSExtension() {
  const response = await bridgeRequest<ForgeOSExtensionStatus>('FORGEOS_EXTENSION_PING')
  return response.ok && response.payload ? response.payload : null
}

export async function deliverDeploymentToExtension(payload: DeploymentBridgePayload) {
  const response = await bridgeRequest<{ agentId: string; version: number; autoRun: boolean }>('FORGEOS_EXTENSION_DEPLOY', payload, 12_000)
  if (!response.ok || !response.payload) throw new Error(response.error || 'The extension could not receive this agent.')
  return response.payload
}

export async function disconnectForgeOSExtension() {
  const response = await bridgeRequest<{ disconnected: boolean }>('FORGEOS_EXTENSION_DISCONNECT')
  if (!response.ok) throw new Error(response.error || 'The extension could not be disconnected.')
}
