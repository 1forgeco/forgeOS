import type { AgentEdge, AgentNode, AgentNodeKind, BrowserWorkflowDefinition } from '../types'

export type WorkflowValidation = {
  definition: BrowserWorkflowDefinition | null
  orderedNodes: AgentNode[]
  errors: string[]
  warnings: string[]
}

const REQUIRED_KINDS: AgentNodeKind[] = [
  'manualTrigger',
  'targetWebsite',
  'taskGoal',
  'browserAgent',
  'approvalGate',
  'returnResult',
]

function text(node: AgentNode | undefined, key: string) {
  return String(node?.data.config[key] ?? '').trim()
}

function list(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

export function getExecutionOrder(nodes: AgentNode[], edges: AgentEdge[]) {
  const primaryEdges = edges.filter((edge) => edge.data?.path !== 'fallback')
  const incoming = new Set(primaryEdges.map((edge) => edge.target))
  const queue = nodes.filter((node) => !incoming.has(node.id)).map((node) => node.id)
  const visited = new Set<string>()
  const ordered: AgentNode[] = []

  while (queue.length > 0) {
    const id = queue.shift()
    if (!id || visited.has(id)) continue
    visited.add(id)
    const node = nodes.find((item) => item.id === id)
    if (node) ordered.push(node)
    primaryEdges.filter((edge) => edge.source === id).forEach((edge) => queue.push(edge.target))
  }

  return ordered
}

export function compileBrowserWorkflow(name: string, nodes: AgentNode[], edges: AgentEdge[]): WorkflowValidation {
  const errors: string[] = []
  const warnings: string[] = []
  const byKind = new Map(nodes.map((node) => [node.data.kind, node]))
  const orderedNodes = getExecutionOrder(nodes, edges)

  REQUIRED_KINDS.forEach((kind) => {
    if (!byKind.has(kind)) errors.push(`Add the “${kind === 'taskGoal' ? 'Describe the goal' : kind === 'targetWebsite' ? 'Choose website' : kind === 'browserAgent' ? 'Browser agent' : kind === 'approvalGate' ? 'Ask for approval' : kind === 'returnResult' ? 'Return the result' : 'Start manually'}” step.`)
  })

  const websiteNode = byKind.get('targetWebsite')
  const goalNode = byKind.get('taskGoal')
  const agentNode = byKind.get('browserAgent')
  const approvalNode = byKind.get('approvalGate')
  const resultNode = byKind.get('returnResult')
  const inputNode = byKind.get('requiredInputs')
  const takeoverNode = byKind.get('humanTakeover')
  const websiteUrl = text(websiteNode, 'websiteUrl')

  if (websiteNode && !/^https:\/\//i.test(websiteUrl)) errors.push('The website address must begin with https://.')
  if (goalNode && !text(goalNode, 'goal')) errors.push('Describe what the agent should accomplish.')
  if (agentNode && list(text(agentNode, 'allowedActions')).length === 0) errors.push('Give the Browser agent at least one allowed action.')
  if (!takeoverNode) warnings.push('Add “Let me take over” so the agent can stop safely when it gets stuck.')

  const primaryKinds = new Set(orderedNodes.map((node) => node.data.kind))
  REQUIRED_KINDS.forEach((kind) => {
    if (byKind.has(kind) && !primaryKinds.has(kind)) errors.push(`Connect the “${byKind.get(kind)?.data.label}” step to the main path.`)
  })

  if (errors.length > 0) return { definition: null, orderedNodes, errors, warnings }

  const parsedMaximum = Number(text(agentNode, 'maximumSteps'))
  let hostname = ''
  try { hostname = new URL(websiteUrl).hostname.replace(/^www\./, '') } catch { /* reported above */ }

  return {
    definition: {
      schemaVersion: 1,
      id: 'custom-browser-agent',
      name: name.trim() || 'Untitled browser agent',
      version: 1,
      websiteUrl,
      allowedDomains: list(text(websiteNode, 'allowedDomains')).length > 0 ? list(text(websiteNode, 'allowedDomains')) : [hostname],
      goal: text(goalNode, 'goal'),
      completionCriteria: text(goalNode, 'completionCriteria'),
      runtimeMode: (['general', 'product-research', 'executive-assistant', 'social-media', 'sales-outreach', 'seo-writer', 'receptionist', 'legal-assistant'].includes(text(agentNode, 'runtimeMode')) ? text(agentNode, 'runtimeMode') : 'general') as BrowserWorkflowDefinition['runtimeMode'],
      agentInstructions: text(agentNode, 'instructions'),
      inputs: list(text(inputNode, 'fields')),
      allowedActions: list(text(agentNode, 'allowedActions')),
      approvalActions: list(text(approvalNode, 'approvalActions')),
      maximumSteps: Number.isFinite(parsedMaximum) && parsedMaximum > 0 ? Math.min(parsedMaximum, 100) : 25,
      resultFormat: text(resultNode, 'resultFormat'),
      fallbackInstructions: text(takeoverNode, 'fallbackInstructions') || 'Pause when a person is needed.',
    },
    orderedNodes,
    errors,
    warnings,
  }
}

export function buildRunDetails(definition: BrowserWorkflowDefinition, inputs: Record<string, string>) {
  const inputSummary = definition.inputs.length
    ? definition.inputs.map((field) => `${field}: ${inputs[field] || 'not provided'}`).join(' · ')
    : 'This workflow does not require changing inputs.'

  return {
    manualTrigger: 'Started a protected browser session.',
    targetWebsite: `Prepared ${definition.websiteUrl}. The agent is restricted to ${definition.allowedDomains.join(', ')}.`,
    taskGoal: `Loaded the goal: “${definition.goal}”`,
    requiredInputs: inputSummary,
    browserAgent: `Planned page actions from: ${definition.allowedActions.join(', ')}. It will stop after ${definition.maximumSteps} actions.`,
    approvalGate: `Armed approval checks for: ${definition.approvalActions.join(', ')}.`,
    returnResult: `Will finish only when: ${definition.completionCriteria || 'the requested result is available'}.`,
    humanTakeover: definition.fallbackInstructions,
  } satisfies Record<AgentNodeKind, string>
}

export function downloadWorkflow(definition: BrowserWorkflowDefinition) {
  const blob = new Blob([JSON.stringify(definition, null, 2)], { type: 'application/json' })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = `${definition.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'forgeos-agent'}.json`
  anchor.click()
  URL.revokeObjectURL(href)
}
