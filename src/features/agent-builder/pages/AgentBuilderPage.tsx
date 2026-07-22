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
  ChevronDown,
  Cloud,
  Code2,
  MessageSquareText,
  Play,
  RotateCcw,
  Save,
  Sparkles,
  Workflow,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { AgentNodeCard } from '../components/AgentNodeCard'
import { InspectorPanel } from '../components/InspectorPanel'
import { InstallAgentPanel } from '../components/InstallAgentPanel'
import { NodePalette } from '../components/NodePalette'
import { RunPanel } from '../components/RunPanel'
import { TestAgentPanel } from '../components/TestAgentPanel'
import { DEFAULT_EDGES, DEFAULT_NODES, createPaletteNode } from '../data/defaultWorkflow'
import type { AgentEdge, AgentNode, AgentNodeData, AgentNodeKind, RunLog } from '../types'
import '../styles/agent-builder.css'

const STORAGE_KEY = 'forgeos.booking-agent.v2'

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
    title: 'Service Finder & Booking Agent',
    ready: false,
    nodes: DEFAULT_NODES,
    edges: DEFAULT_EDGES,
  }
}

function runDetail(kind: AgentNodeKind) {
  const details: Record<AgentNodeKind, string> = {
    websiteChat: 'Received “I need a strategy consultation next week.”',
    collectRequirements: 'Understood the service, preferred date, location, and budget.',
    searchCatalog: 'Found matching services in the approved service list.',
    filterRank: 'Selected the strongest options using your rules.',
    checkAvailability: 'Found open times on Tuesday and Thursday.',
    requestConfirmation: 'The visitor confirmed Thursday at 4:00 PM.',
    createBooking: 'Saved the booking request with the visitor’s details.',
    sendConfirmation: 'Prepared the confirmation and reference number.',
    humanHandoff: 'Prepared a handoff with the complete conversation.',
  }
  return details[kind]
}

function getPrimaryExecutionOrder(nodes: AgentNode[], edges: AgentEdge[]) {
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

const nodeTypes = { agentNode: AgentNodeCard }

export function AgentBuilderPage() {
  return (
    <ReactFlowProvider>
      <AgentBuilder />
    </ReactFlowProvider>
  )
}

function AgentBuilder() {
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
  const activityTimer = useRef<number | null>(null)
  const { screenToFlowPosition, fitView } = useReactFlow<AgentNode, AgentEdge>()

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null
  const healthy = nodes.some((node) => node.data.kind === 'websiteChat') && nodes.some((node) => node.data.kind === 'createBooking') && edges.length > 0

  const visibleEdges = useMemo(() => edges.map((edge) => {
    const source = nodes.find((node) => node.id === edge.source)
    const state = source?.data.status
    return { ...edge, className: state === 'running' ? 'edge-running' : state === 'success' ? 'edge-success' : edge.data?.path === 'fallback' ? 'edge-fallback' : '' }
  }), [edges, nodes])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const workflow: SavedWorkflow = { title, ready, nodes, edges }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workflow))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [title, ready, nodes, edges])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2400)
    return () => window.clearTimeout(timer)
  }, [notice])

  useEffect(() => () => {
    if (activityTimer.current) window.clearTimeout(activityTimer.current)
  }, [])

  const onConnect = useCallback((connection: Connection) => {
    setEdges((current) => addEdge({ ...connection, type: 'smoothstep', animated: true, data: { path: 'primary' } }, current))
  }, [setEdges])

  const addNode = useCallback((kind: AgentNodeKind, position?: { x: number; y: number }) => {
    const target = position ?? screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    const node = createPaletteNode(kind, target.x, target.y)
    setNodes((current) => [...current, node])
    setSelectedNodeId(node.id)
  }, [screenToFlowPosition, setNodes])

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
    setNodes((current) => current.filter((node) => node.id !== selectedNodeId))
    setEdges((current) => current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId))
    setSelectedNodeId(null)
  }

  const resetTemplate = () => {
    setNodes(DEFAULT_NODES.map((node) => ({ ...node, data: { ...node.data, config: { ...node.data.config } } })))
    setEdges(DEFAULT_EDGES.map((edge) => ({ ...edge })))
    setSelectedNodeId(null)
    setReady(false)
    setLogs([])
    setShowRun(false)
    setNotice('Starting workflow restored')
    window.setTimeout(() => void fitView({ padding: 0.16, duration: 500 }), 50)
  }

  const simulateAgent = async () => {
    if (running || !healthy) return
    setRunning(true)
    setShowRun(true)
    setLogs([])
    setNodes((current) => current.map((node) => ({ ...node, data: { ...node.data, status: 'idle' } })))
    const order = getPrimaryExecutionOrder(nodes, edges)

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
      setLogs((current) => current.map((log) => log.id === logId ? { ...log, detail: runDetail(node.data.kind), status: 'success' } : log))
    }
    setRunning(false)
    setNotice('Example completed successfully')
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
      setNotice('Connect the website chat to a booking step first')
      return
    }
    setReady(true)
    setNotice('Agent marked ready to install')
  }

  return (
    <div className="studio-page">
      <header className="studio-header">
        <div className="studio-branding">
          <a href="/" className="studio-back" aria-label="Back to 1forge home"><ArrowLeft size={16} /></a>
          <a href="/" className="studio-logo"><span>F</span><div><strong>ForgeOS</strong><small>Agent studio</small></div></a>
          <i />
          <div className="workflow-name">
            <input aria-label="Agent name" value={title} onChange={(event) => setTitle(event.target.value)} />
            <button aria-label="Agent menu"><ChevronDown size={13} /></button>
          </div>
        </div>

        <nav className="studio-view-tabs" aria-label="Agent setup sections">
          <button className={view === 'build' ? 'active' : ''} onClick={() => setView('build')}><Workflow size={13} /> Build</button>
          <button className={view === 'test' ? 'active' : ''} onClick={() => setView('test')}><MessageSquareText size={13} /> Test</button>
          <button className={view === 'install' ? 'active' : ''} onClick={() => setView('install')}><Code2 size={13} /> Install</button>
        </nav>

        <div className="studio-actions">
          <div className="save-state"><Cloud size={13} /><span>Draft saved</span></div>
          {view === 'build' && <button className="secondary-action" onClick={simulateAgent} disabled={running || !healthy}><Play size={14} fill="currentColor" /> {running ? 'Running…' : 'Run example'}</button>}
          <button className={`publish-action${ready ? ' published' : ''}`} onClick={ready ? () => setView('install') : markReady}>{ready ? <Check size={14} /> : <Save size={14} />} {ready ? 'Ready to install' : 'Mark ready'}</button>
        </div>
      </header>

      {view === 'build' && (
        <div className="studio-body">
          <NodePalette onAdd={addNode} onOpenTest={() => setView('test')} onOpenInstall={() => setView('install')} />
          <main className="workflow-stage" onDrop={onDrop} onDragOver={(event) => event.preventDefault()}>
            <div className="canvas-context">
              <div className="template-pill"><Sparkles size={13} /><span>Service Finder & Booking</span><b>Starting workflow</b></div>
              <button onClick={() => void simulateAgent()}><Play size={12} /> Show me how it runs</button>
              <button onClick={resetTemplate}><RotateCcw size={12} /> Start over</button>
            </div>
            <div className="canvas-guide"><b>1</b><span>Click a card</span><i /><b>2</b><span>Change its instructions on the right</span><i /><b>3</b><span>Use Test when you are ready</span></div>
            <div className="canvas-health"><span className={healthy ? 'healthy' : ''} /><div><strong>{healthy ? 'Agent steps are connected' : 'A step is disconnected'}</strong><small>{nodes.length} steps · {edges.length} connections</small></div></div>
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
            {showRun && <RunPanel logs={logs} running={running} onClose={() => !running && setShowRun(false)} />}
          </main>
          <InspectorPanel node={selectedNode} onChange={updateSelectedNode} onDelete={deleteSelectedNode} onClose={() => setSelectedNodeId(null)} />
        </div>
      )}

      {view === 'test' && <TestAgentPanel onActivity={showConversationActivity} />}
      {view === 'install' && <InstallAgentPanel onOpenTest={() => setView('test')} />}

      {notice && <div className="studio-notice"><Check size={14} />{notice}</div>}
      <div className="studio-ambient studio-ambient-one" />
      <div className="studio-ambient studio-ambient-two" />
    </div>
  )
}
