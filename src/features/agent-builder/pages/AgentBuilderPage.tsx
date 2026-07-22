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
  CircleHelp,
  Cloud,
  Play,
  RotateCcw,
  Rocket,
  Sparkles,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { AgentNodeCard } from '../components/AgentNodeCard'
import { InspectorPanel } from '../components/InspectorPanel'
import { NodePalette } from '../components/NodePalette'
import { RunPanel } from '../components/RunPanel'
import { DEFAULT_EDGES, DEFAULT_NODES, createPaletteNode } from '../data/defaultWorkflow'
import type { AgentEdge, AgentNode, AgentNodeData, AgentNodeKind, RunLog } from '../types'
import '../styles/agent-builder.css'

const STORAGE_KEY = 'forgeos.booking-agent.v1'

type SavedWorkflow = {
  title: string
  published: boolean
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
    published: false,
    nodes: DEFAULT_NODES,
    edges: DEFAULT_EDGES,
  }
}

function runDetail(kind: AgentNodeKind) {
  const details: Record<AgentNodeKind, string> = {
    websiteChat: 'Received “I need a strategy consultation next week.”',
    collectRequirements: 'Captured service, preferred date, location, and budget.',
    searchCatalog: 'Found 6 matching services in the connected catalogue.',
    filterRank: 'Ranked the 3 strongest matches using your business rules.',
    checkAvailability: 'Found open times on Tuesday and Thursday.',
    requestConfirmation: 'Customer confirmed Thursday at 4:00 PM.',
    createBooking: 'Created a calendar event with the customer details.',
    sendConfirmation: 'Prepared confirmation for the customer.',
    humanHandoff: 'Prepared a handoff with the complete conversation context.',
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
  const [published, setPublished] = useState(initial.published)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [showRun, setShowRun] = useState(false)
  const [logs, setLogs] = useState<RunLog[]>([])
  const [notice, setNotice] = useState('')
  const canvasRef = useRef<HTMLDivElement>(null)
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
      const workflow: SavedWorkflow = { title, published, nodes, edges }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workflow))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [title, published, nodes, edges])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 2400)
    return () => window.clearTimeout(timer)
  }, [notice])

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
    setPublished(false)
    setLogs([])
    setShowRun(false)
    setNotice('Template restored')
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
        detail: 'Processing sample customer request…',
        status: 'running',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      }])
      await new Promise((resolve) => window.setTimeout(resolve, 520))
      setNodes((current) => current.map((item) => item.id === node.id ? { ...item, data: { ...item.data, status: 'success' } } : item))
      setLogs((current) => current.map((log) => log.id === logId ? { ...log, detail: runDetail(node.data.kind), status: 'success' } : log))
    }
    setRunning(false)
    setNotice('Simulation completed successfully')
  }

  const publishAgent = () => {
    if (!healthy) {
      setNotice('Connect an input and booking action before publishing')
      return
    }
    setPublished((current) => !current)
    setNotice(published ? 'Agent returned to draft' : 'Agent published')
  }

  return (
    <div className="studio-page">
      <header className="studio-header">
        <div className="studio-branding">
          <a href="/" className="studio-back" aria-label="Back to 1forge home"><ArrowLeft size={16} /></a>
          <a href="/" className="studio-logo"><span>F</span><div><strong>ForgeOS</strong><small>Agent studio</small></div></a>
          <i />
          <div className="workflow-name">
            <input aria-label="Workflow name" value={title} onChange={(event) => setTitle(event.target.value)} />
            <button aria-label="Workflow menu"><ChevronDown size={13} /></button>
          </div>
        </div>
        <div className="save-state"><Cloud size={13} /><span>Saved to this device</span></div>
        <div className="studio-actions">
          <button className="icon-action" aria-label="Help"><CircleHelp size={17} /></button>
          <button className="secondary-action" onClick={simulateAgent} disabled={running || !healthy}><Play size={14} fill="currentColor" /> {running ? 'Running…' : 'Test agent'}</button>
          <button className={`publish-action${published ? ' published' : ''}`} onClick={publishAgent}>{published ? <Check size={14} /> : <Rocket size={14} />} {published ? 'Published' : 'Publish'}</button>
        </div>
      </header>

      <div className="studio-body">
        <NodePalette onAdd={addNode} />
        <main className="workflow-stage" ref={canvasRef} onDrop={onDrop} onDragOver={(event) => event.preventDefault()}>
          <div className="canvas-context">
            <div className="template-pill"><Sparkles size={13} /><span>Service Finder & Booking</span><b>Starter</b></div>
            <button onClick={resetTemplate}><RotateCcw size={13} /> Reset template</button>
          </div>
          <div className="canvas-health"><span className={healthy ? 'healthy' : ''} /><div><strong>{healthy ? 'Workflow ready' : 'Needs attention'}</strong><small>{nodes.length} blocks · {edges.length} connections</small></div></div>
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

      {notice && <div className="studio-notice"><Check size={14} />{notice}</div>}
      <div className="studio-ambient studio-ambient-one" />
      <div className="studio-ambient studio-ambient-two" />
    </div>
  )
}
