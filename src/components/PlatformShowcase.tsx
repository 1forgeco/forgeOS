import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from 'react'

type NodeId = 'trigger' | 'context' | 'availability' | 'agent' | 'outcome'
type Point = { x: number; y: number }

const desktopPositions: Record<NodeId, Point> = {
  trigger: { x: 4, y: 43 }, context: { x: 28, y: 15 }, availability: { x: 28, y: 62 }, agent: { x: 50, y: 37 }, outcome: { x: 78, y: 43 },
}

const mobilePositions: Record<NodeId, Point> = {
  trigger: { x: 50, y: 4 }, context: { x: 50, y: 22 }, availability: { x: 50, y: 40 }, agent: { x: 50, y: 58 }, outcome: { x: 50, y: 76 },
}

const nodeData: Record<NodeId, { className: string; mark: string; title: string; detail: string; meta?: string }> = {
  trigger: { className: 'trigger', mark: '◒', title: 'New enquiry', detail: 'WhatsApp or website form', meta: '01' },
  context: { className: 'source source-one', mark: '▣', title: 'Find context', detail: 'CRM, docs, inventory' },
  availability: { className: 'source source-two', mark: '◈', title: 'Check availability', detail: 'Bookings or calendar' },
  agent: { className: 'agent', mark: '✦', title: '1forge AI agent', detail: 'Understands, decides, prepares', meta: 'Active' },
  outcome: { className: 'outcome', mark: '↗', title: 'Useful next step', detail: 'Reply, task, lead or report', meta: 'Done' },
}

function curve(from: Point, to: Point) {
  const startX = from.x + 13
  const startY = from.y + 6
  const endX = to.x + 2
  const endY = to.y + 7
  const bend = Math.max(8, Math.abs(endX - startX) * .45)
  return `M ${startX} ${startY} C ${startX + bend} ${startY}, ${endX - bend} ${endY}, ${endX} ${endY}`
}

export function PlatformShowcase() {
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.innerWidth <= 800)
  const [positions, setPositions] = useState<Record<NodeId, Point>>(() => compact ? mobilePositions : desktopPositions)
  const [dragging, setDragging] = useState<{ id: NodeId; offsetX: number; offsetY: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateCompact = () => setCompact(window.innerWidth <= 800)
    window.addEventListener('resize', updateCompact)
    return () => window.removeEventListener('resize', updateCompact)
  }, [])

  const startDrag = (event: PointerEvent<HTMLDivElement>, id: NodeId) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const canvasBox = canvas.getBoundingClientRect()
    const nodeBox = event.currentTarget.getBoundingClientRect()
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging({ id, offsetX: event.clientX - nodeBox.left, offsetY: event.clientY - nodeBox.top })
    event.preventDefault()
    canvas.setAttribute('data-dragging', 'true')
    void canvasBox
  }

  const moveNode = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging || !canvasRef.current) return
    const canvas = canvasRef.current
    const box = canvas.getBoundingClientRect()
    const node = event.currentTarget.querySelector(`[data-node-id="${dragging.id}"]`) as HTMLDivElement | null
    const width = node?.offsetWidth ?? 190
    const height = node?.offsetHeight ?? 56
    const x = Math.max(0, Math.min(box.width - width, event.clientX - box.left - dragging.offsetX))
    const y = Math.max(0, Math.min(box.height - height, event.clientY - box.top - dragging.offsetY))
    setPositions((current) => ({
      ...current,
      [dragging.id]: { x: ((x + (compact ? width / 2 : 0)) / box.width) * 100, y: (y / box.height) * 100 },
    }))
  }

  const endDrag = () => {
    if (canvasRef.current) canvasRef.current.removeAttribute('data-dragging')
    setDragging(null)
  }

  return <div className="platform-showcase">
    <div className="platform-heading"><div><span className="section-index">A connected workflow</span><h2>One request. A lot less effort.</h2></div><p>Every agent is designed around a real trigger, a real task, and a useful outcome for your team.</p></div>
    <div className="canvas" ref={canvasRef} onPointerMove={moveNode} onPointerUp={endDrag} onPointerCancel={endDrag}>
      <div className="canvas-toolbar"><span className="canvas-live"><i /> Interactive workflow</span><span>Drag any card to explore</span></div>
      <svg className="canvas-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d={curve(positions.trigger, positions.context)} /><path d={curve(positions.trigger, positions.availability)} /><path d={curve(positions.context, positions.agent)} /><path d={curve(positions.availability, positions.agent)} /><path d={curve(positions.agent, positions.outcome)} />
      </svg>
      {(Object.keys(nodeData) as NodeId[]).map((id) => {
        const node = nodeData[id]
        const colours = id === 'context' ? ' green' : id === 'availability' ? ' pink' : id === 'agent' ? ' ai' : ''
        const style = { '--node-x': `${positions[id].x}%`, '--node-y': `${positions[id].y}%`, '--node-translate': compact ? '-50%' : '0%' } as CSSProperties
        return <div className={`canvas-node ${node.className} ${dragging?.id === id ? 'is-dragging' : ''}`} style={style} key={id} data-node-id={id} onPointerDown={(event) => startDrag(event, id)} role="button" tabIndex={0} aria-label={`Drag ${node.title} workflow node`}>
          <span className={`node-mark${colours}`}>{node.mark}</span><div><strong>{node.title}</strong><small>{node.detail}</small></div>{node.meta && (id === 'agent' ? <b>{node.meta}</b> : <i>{node.meta}</i>)}
        </div>
      })}
    </div>
  </div>
}
