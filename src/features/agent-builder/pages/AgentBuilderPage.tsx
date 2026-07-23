import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  ArrowLeft,
  Check,
  Cloud,
  Code2,
  MessageSquareText,
  Play,
  Plus,
  RotateCcw,
  Redo2,
  Save,
  Sparkles,
  Workflow,
  Undo2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { useParams } from 'react-router-dom'
import { productApi } from '../../product/api'
import { AgentNodeCard } from '../components/AgentNodeCard'
import { AddStepMenu } from '../components/AddStepMenu'
import { InspectorPanel } from '../components/InspectorPanel'
import { InstallAgentPanel } from '../components/InstallAgentPanel'
import { NodePalette } from '../components/NodePalette'
import { RunPanel } from '../components/RunPanel'
import { TestAgentPanel } from '../components/TestAgentPanel'
import { WorkflowAddContext } from '../components/WorkflowAddContext'
import { DEFAULT_EDGES, DEFAULT_NODES, createPaletteNode } from '../data/defaultWorkflow'
import { buildRunDetails, compileBrowserWorkflow, getExecutionOrder } from '../runtime/browserWorkflow'
import type { AgentEdge, AgentNode, AgentNodeData, AgentNodeKind, RunLog } from '../types'
import '../styles/agent-builder.css'

const STORAGE_KEY = 'forgeos.browser-agent.v1'

type StudioView = 'build' | 'test' | 'install'

type SavedWorkflow = {
  title: string
  ready: boolean
  nodes: AgentNode[]
  edges: AgentEdge[]
}

function loadWorkflow(): SavedWorkflow {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved) as SavedWorkflow
  } catch {
    // A fresh template is safer than blocking the studio when local storage is unavailable.
  }
  return {
    title: 'Product Research Agent',
    ready: false,
    nodes: DEFAULT_NODES,
    edges: DEFAULT_EDGES,
  }
}

const nodeTypes = { agentNode: AgentNodeCard }

export function AgentBuilderPage() {
  return (
    <ReactFlowProvider>
      <AgentBuilder />
    </ReactFlowProvider>
  )
}

function AgentBuilder() {
  const { agentId = '' } = useParams()
  const isPlayground = !agentId
  const initial = useMemo(loadWorkflow, [])
  const [nodes, setNodes, onNodesChange] = useNodesState<AgentNode>(initial.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<AgentEdge>(initial.edges)
  const [title, setTitle] = useState(initial.title)
  const [ready, setReady] = useState(initial.ready)
  const [view, setView] = useState<StudioView>('build')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [showRun, setShowRun] = useState(false)
  const [logs, setLogs] = useState<RunLog[]>([])
  const [notice, setNotice] = useState('')
  const [addMenu, setAddMenu] = useState<{ open: boolean; afterNodeId: string | null }>({ open: false, afterNodeId: null })
  const [saveState, setSaveState] = useState<'loading' | 'saving' | 'saved' | 'error'>(isPlayground ? 'saved' : 'loading')
  const hydrated = useRef(false)
  const activityTimer = useRef<number | null>(null)
  const history = useRef<Array<{ nodes: AgentNode[]; edges: AgentEdge[] }>>([])
  const future = useRef<Array<{ nodes: AgentNode[]; edges: AgentEdge[] }>>([])
  const { screenToFlowPosition, fitView } = useReactFlow<AgentNode, AgentEdge>()

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null
  const compiled = useMemo(() => compileBrowserWorkflow(title, nodes, edges), [title, nodes, edges])
  const healthy = Boolean(compiled.definition)

  const visibleEdges = useMemo(() => edges.map((edge) => {
    const source = nodes.find((node) => node.id === edge.source)
    const state = source?.data.status
    return { ...edge, className: state === 'running' ? 'edge-running' : state === 'success' ? 'edge-success' : edge.data?.path === 'fallback' ? 'edge-fallback' : '' }
  }), [edges, nodes])

  const rememberGraph = useCallback(() => {
    history.current = [...history.current.slice(-29), { nodes: structuredClone(nodes), edges: structuredClone(edges) }]
    future.current = []
  }, [edges, nodes])

  const undoGraph = useCallback(() => {
    const previous = history.current.pop()
    if (!previous) return
    future.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) })
    setNodes(previous.nodes)
    setEdges(previous.edges)
    setSelectedNodeId(null)
    setNotice('Last workflow change undone')
  }, [edges, nodes, setEdges, setNodes])

  const redoGraph = useCallback(() => {
    const next = future.current.pop()
    if (!next) return
    history.current.push({ nodes: structuredClone(nodes), edges: structuredClone(edges) })
    setNodes(next.nodes)
    setEdges(next.edges)
    setSelectedNodeId(null)
    setNotice('Workflow change restored')
  }, [edges, nodes, setEdges, setNodes])

  useEffect(() => {
    if (!agentId) return
    let cancelled = false
    productApi.agent(agentId).then(({ agent }) => {
      if (cancelled) return
      const upgradedNodes = agent.templateId === 'product-research' ? agent.nodes.map((node) => {
        if (node.data.kind === 'browserAgent') return { ...node, data: { ...node.data, config: { ...node.data.config, runtimeMode: 'product-research', maximumSteps: 45, instructions: 'Research several candidates instead of stopping at search. Prefer verified product details over card text, penalize weak review evidence, respect the budget, and explain why each recommendation fits a different use case.' } } }
        if (node.data.kind === 'taskGoal') return { ...node, data: { ...node.data, config: { ...node.data.config, completionCriteria: 'Inspect up to five leading product pages and return evidence-backed recommendations for best overall, best value, and best fit. Include price, rating, review count, important features, availability, launch/date evidence when present, trade-offs, and direct links.' } } }
        return node
      }) : agent.nodes
      setTitle(agent.name); setNodes(upgradedNodes); setEdges(agent.edges); setReady(agent.status === 'live' || agent.status === 'testing'); hydrated.current = true; setSaveState('saved')
      window.setTimeout(() => void fitView({ padding: 0.16, duration: 450 }), 80)
    }).catch(() => { if (!cancelled) { hydrated.current = true; setSaveState('error'); setNotice('This agent could not be loaded') } })
    return () => { cancelled = true }
  }, [agentId, fitView, setEdges, setNodes])

  useEffect(() => {
    if (!agentId || !hydrated.current) return
    setSaveState('saving')
    const timer = window.setTimeout(() => {
      const websiteNode = nodes.find((node) => node.data.kind === 'targetWebsite')
      const goalNode = nodes.find((node) => node.data.kind === 'taskGoal')
      productApi.updateAgent(agentId, {
        name: title,
        websiteUrl: String(websiteNode?.data.config.websiteUrl || ''),
        goal: String(goalNode?.data.config.goal || ''),
        nodes,
        edges,
        status: ready ? 'testing' : 'draft',
      }).then(() => setSaveState('saved')).catch(() => setSaveState('error'))
    }, 700)
    return () => window.clearTimeout(timer)
  }, [agentId, title, ready, nodes, edges])

  useEffect(() => {
    if (!isPlayground) return
    setSaveState('saving')
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ title, ready, nodes, edges }))
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    }, 350)
    return () => window.clearTimeout(timer)
  }, [isPlayground, title, ready, nodes, edges])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2400)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => () => {
    if (activityTimer.current) window.clearTimeout(activityTimer.current)
  }, [])

  const onConnect = useCallback((connection: Connection) => {
    rememberGraph()
    setEdges((current) => addEdge({ ...connection, type: 'smoothstep', animated: true, data: { path: 'primary' } }, current))
  }, [rememberGraph, setEdges])

  const focusKind = useCallback((kind: AgentNodeKind) => {
    const existing = nodes.find((node) => node.data.kind === kind)
    if (!existing) return false
    setSelectedNodeId(existing.id)
    setNotice(`Editing ${existing.data.label}`)
    return true
  }, [nodes])

  const addNode = useCallback((kind: AgentNodeKind, position?: { x: number; y: number }, afterNodeId?: string | null) => {
    const existing = nodes.find((node) => node.data.kind === kind)
    if (existing) {
      setSelectedNodeId(existing.id)
      setNotice(`${existing.data.label} is already in this workflow`)
      return
    }
    rememberGraph()
    const source = afterNodeId ? nodes.find((node) => node.id === afterNodeId) : null
    const returnNode = nodes.find((node) => node.data.kind === 'returnResult')
    const incomingToResult = returnNode ? edges.find((edge) => edge.target === returnNode.id && edge.data?.path !== 'fallback') : null
    const defaultSource = incomingToResult ? nodes.find((node) => node.id === incomingToResult.source) : null
    const insertionSource = source || (!position ? defaultSource : null)
    const target = position ?? (insertionSource ? { x: insertionSource.position.x + 290, y: insertionSource.position.y } : screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }))
    const node = createPaletteNode(kind, target.x, target.y)
    setNodes((current) => [
      ...current.map((item) => !position && insertionSource && item.position.x > insertionSource.position.x ? { ...item, position: { ...item.position, x: item.position.x + 290 } } : item),
      node,
    ])
    if (!position && insertionSource) {
      setEdges((current) => {
        const outgoing = current.find((edge) => edge.source === insertionSource.id && edge.data?.path !== 'fallback')
        const withoutOutgoing = outgoing ? current.filter((edge) => edge.id !== outgoing.id) : current
        const first = { id: `${insertionSource.id}-${node.id}-${Date.now()}`, source: insertionSource.id, target: node.id, type: 'smoothstep', animated: true, data: { path: kind === 'humanTakeover' ? 'fallback' : 'primary' } } as AgentEdge
        if (!outgoing || kind === 'humanTakeover') return [...current, first]
        const second = { id: `${node.id}-${outgoing.target}-${Date.now()}`, source: node.id, target: outgoing.target, type: 'smoothstep', animated: true, data: { path: 'primary' } } as AgentEdge
        return [...withoutOutgoing, first, second]
      })
    }
    setSelectedNodeId(node.id)
    setNotice(`${node.data.label} added and connected`)
  }, [edges, nodes, rememberGraph, screenToFlowPosition, setEdges, setNodes])

  const onDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const kind = event.dataTransfer.getData('application/forge-node') as AgentNodeKind
    if (!kind) return
    addNode(kind, screenToFlowPosition({ x: event.clientX, y: event.clientY }))
  }, [addNode, screenToFlowPosition])

  const updateSelectedNode = (data: AgentNodeData) => {
    if (!selectedNodeId) return
    setNodes((current) => current.map((node) => node.id === selectedNodeId ? { ...node, data } : node))
  }

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return
    rememberGraph()
    setNodes((current) => current.filter((node) => node.id !== selectedNodeId))
    setEdges((current) => current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId))
    setSelectedNodeId(null)
  }

  const resetTemplate = () => {
    if (!window.confirm('Restore the starter workflow? Your current canvas changes will be replaced.')) return
    rememberGraph()
    setNodes(DEFAULT_NODES.map((node) => ({ ...node, data: { ...node.data, config: { ...node.data.config } } })))
    setEdges(DEFAULT_EDGES.map((edge) => ({ ...edge })))
    setSelectedNodeId(null)
    setReady(false)
    setLogs([])
    setShowRun(false)
    setTitle('Product Research Agent')
    setNotice('Custom browser workflow restored')
    window.setTimeout(() => void fitView({ padding: 0.16, duration: 500 }), 50)
  }

  const simulateAgent = async () => {
    if (running || !healthy) return
    setRunning(true)
    setShowRun(true)
    setLogs([])
    setNodes((current) => current.map((node) => ({ ...node, data: { ...node.data, status: 'idle' } })))
    const order = getExecutionOrder(nodes, edges).filter((node) => node.data.kind !== 'humanTakeover')
    const details = compiled.definition ? buildRunDetails(compiled.definition, {}) : null

    for (const node of order) {
      setNodes((current) => current.map((item) => item.id === node.id ? { ...item, data: { ...item.data, status: 'running' } } : item))
      const logId = `${node.id}-${Date.now()}`
      setLogs((current) => [...current, {
        id: logId,
        nodeId: node.id,
        label: node.data.label,
        detail: 'Handling this part of the example…',
        status: 'running',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }])
      await new Promise((resolve) => window.setTimeout(resolve, 480))
      setNodes((current) => current.map((item) => item.id === node.id ? { ...item, data: { ...item.data, status: 'success' } } : item))
      setLogs((current) => current.map((log) => log.id === logId ? { ...log, detail: details?.[node.data.kind] ?? 'Step completed.', status: 'success' } : log))
    }
    setRunning(false)
    setNotice('Workflow dry run completed')
  }

  const showConversationActivity = (steps: AgentNodeKind[]) => {
    if (activityTimer.current) window.clearTimeout(activityTimer.current)
    setNodes((current) => current.map((node) => ({ ...node, data: { ...node.data, status: steps.includes(node.data.kind) ? 'running' : 'idle' } })))
    activityTimer.current = window.setTimeout(() => {
      setNodes((current) => current.map((node) => ({ ...node, data: { ...node.data, status: steps.includes(node.data.kind) ? 'success' : 'idle' } })))
    }, 700)
  }

  const markReady = () => {
    if (!healthy) {
      setNotice(compiled.errors[0] ?? 'Connect all required steps first')
      return
    }
    setReady(true)
    setNotice('Agent marked ready to deploy')
  }

  return (
    <div className="studio-page">
      <header className="studio-header">
        <div className="studio-branding">
          <a href={isPlayground ? '/' : '/projects'} className="studio-back" aria-label={isPlayground ? 'Back to ForgeOS home' : 'Back to agents'}><ArrowLeft size={16} /></a>
          <a href={isPlayground ? '/' : '/projects'} className="studio-logo"><span>F</span><div><strong>ForgeOS</strong><small>{isPlayground ? 'Public playground' : 'Agent studio'}</small></div></a>
          <i />
          <div className="workflow-name">
            <input aria-label="Agent name" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
        </div>

        <nav className="studio-view-tabs" aria-label="Agent setup sections">
          <button className={view === 'build' ? 'active' : ''} onClick={() => setView('build')}><Workflow size={13} /> Build</button>
          <button className={view === 'test' ? 'active' : ''} onClick={() => setView('test')}><MessageSquareText size={13} /> Test</button>
          <button className={view === 'install' ? 'active' : ''} onClick={() => setView('install')}><Code2 size={13} /> Deploy</button>
        </nav>

        <div className="studio-actions">
          <div className={`save-state ${saveState}`}><Cloud size={13} /><span>{saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save failed' : saveState === 'loading' ? 'Loading…' : isPlayground ? 'Saved on this device' : 'Saved to workspace'}</span></div>
          {view === 'build' && <><button className="icon-action" title="Undo graph change" aria-label="Undo graph change" onClick={undoGraph} disabled={!history.current.length}><Undo2 size={14} /></button><button className="icon-action" title="Redo graph change" aria-label="Redo graph change" onClick={redoGraph} disabled={!future.current.length}><Redo2 size={14} /></button><button className="secondary-action" onClick={simulateAgent} disabled={running || !healthy}><Play size={14} fill="currentColor" /> {running ? 'Checking…' : 'Check workflow'}</button></>}
          <button className={`publish-action${ready ? ' published' : ''}`} onClick={ready ? () => setView('install') : markReady}>{ready ? <Check size={14} /> : <Save size={14} />} {ready ? 'Ready to deploy' : 'Validate agent'}</button>
        </div>
      </header>

      {view === 'build' && (
        <div className="studio-body">
          <NodePalette onAdd={addNode} onOpenTest={() => setView('test')} onOpenInstall={() => setView('install')} onOpenAdd={() => setAddMenu({ open: true, afterNodeId: null })} onFocusKind={(kind) => void focusKind(kind)} existingKinds={nodes.map((node) => node.data.kind)} />
          <main className="workflow-stage" onDrop={onDrop} onDragOver={(event) => event.preventDefault()}>
            <div className="canvas-context">
              <button className="canvas-add-step" onClick={() => setAddMenu({ open: true, afterNodeId: null })}><Plus size={12} /> Add step</button>
              <div className="template-pill"><Sparkles size={13} /><span>Custom browser agent</span><b>Core workflow</b></div>
              <button onClick={() => void simulateAgent()}><Play size={12} /> Check the path</button>
              <button onClick={resetTemplate}><RotateCcw size={12} /> Start over</button>
            </div>
            <div className="canvas-guide"><b>1</b><span>Choose the website</span><i /><b>2</b><span>Describe the outcome</span><i /><b>3</b><span>Set permissions and test</span></div>
            <div className="canvas-health"><span className={healthy ? 'healthy' : ''} /><div><strong>{healthy ? 'Workflow is executable' : compiled.errors[0] ?? 'A step is disconnected'}</strong><small>{nodes.length} steps · {edges.length} connections</small></div></div>
            <WorkflowAddContext.Provider value={{ requestAddAfter: (nodeId) => setAddMenu({ open: true, afterNodeId: nodeId }) }}>
            <ReactFlow<AgentNode, AgentEdge>
              nodes={nodes}
              edges={visibleEdges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              fitView
              fitViewOptions={{ padding: 0.16 }}
              minZoom={0.25}
              maxZoom={1.6}
              defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
              connectionLineStyle={{ stroke: '#7668f7', strokeWidth: 2 }}
              proOptions={{ hideAttribution: true }}
              deleteKeyCode={['Backspace', 'Delete']}
            >
              <Background variant={BackgroundVariant.Dots} gap={18} size={1.1} color="#d8dce8" />
              <Controls position="bottom-left" showInteractive={false} />
              <MiniMap position="bottom-right" pannable zoomable nodeStrokeWidth={2} maskColor="rgba(244, 246, 251, .78)" />
            </ReactFlow>
            </WorkflowAddContext.Provider>
            {showRun && <RunPanel logs={logs} running={running} onClose={() => !running && setShowRun(false)} />}
          </main>
          <InspectorPanel node={selectedNode} onChange={updateSelectedNode} onDelete={deleteSelectedNode} onClose={() => setSelectedNodeId(null)} />
        </div>
      )}

      {view === 'test' && <TestAgentPanel agentId={agentId} title={title} nodes={nodes} edges={edges} onActivity={showConversationActivity} onOpenDeploy={() => setView('install')} />}
      {view === 'install' && (isPlayground ? <section className="playground-deploy-gate"><span><Sparkles size={18} /></span><small>Playground complete</small><h1>Your workflow is ready to become a real agent.</h1><p>The playground stays private to this browser. Create an account when you want to publish immutable versions, connect the extension, synchronize results, and keep run history.</p><div><button onClick={() => setView('test')}><Play size={13} /> Keep testing</button><a href="/login?mode=register&next=/templates">Create a workspace</a></div></section> : <InstallAgentPanel agentId={agentId} title={title} nodes={nodes} edges={edges} onOpenTest={() => setView('test')} />)}

      {notice && <div className="studio-notice"><Check size={14} />{notice}</div>}
      <AddStepMenu
        open={addMenu.open}
        afterNodeLabel={nodes.find((node) => node.id === addMenu.afterNodeId)?.data.label}
        existingKinds={nodes.map((node) => node.data.kind)}
        onChoose={(kind) => { addNode(kind, undefined, addMenu.afterNodeId); setAddMenu({ open: false, afterNodeId: null }) }}
        onFocusExisting={(kind) => { focusKind(kind); setAddMenu({ open: false, afterNodeId: null }) }}
        onClose={() => setAddMenu({ open: false, afterNodeId: null })}
      />
      <div className="studio-ambient studio-ambient-one" />
      <div className="studio-ambient studio-ambient-two" />
      <section className="studio-mobile-blocker"><Workflow size={28} /><h1>Open ForgeOS on a desktop browser</h1><p>The visual canvas and Chrome extension need a desktop-sized browser. Your agents remain available in the workspace.</p><a href="/projects">Return to agents</a></section>
    </div>
  )
}
