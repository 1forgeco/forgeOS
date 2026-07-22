import { Check, LoaderCircle, X } from 'lucide-react'
import type { RunLog } from '../types'

type RunPanelProps = {
  logs: RunLog[]
  running: boolean
  onClose: () => void
}

export function RunPanel({ logs, running, onClose }: RunPanelProps) {
  return (
    <section className="run-panel" aria-live="polite">
      <div className="run-panel-header">
        <div><span className={running ? 'run-live' : 'run-done'}>{running ? <LoaderCircle size={13} /> : <Check size={13} />}</span><strong>{running ? 'Simulation running' : 'Simulation complete'}</strong></div>
        <button onClick={onClose} aria-label="Close simulation"><X size={15} /></button>
      </div>
      <div className="run-progress"><i style={{ width: `${running ? Math.min(92, (logs.filter((log) => log.status === 'success').length / Math.max(logs.length, 1)) * 100) : logs.length ? 100 : 0}%` }} /></div>
      <div className="run-log-list">
        {logs.map((log) => (
          <div className={`run-log ${log.status}`} key={log.id}>
            <span>{log.status === 'running' ? <LoaderCircle size={13} /> : <Check size={13} />}</span>
            <div><strong>{log.label}</strong><small>{log.detail}</small></div>
            <time>{log.timestamp}</time>
          </div>
        ))}
      </div>
    </section>
  )
}
