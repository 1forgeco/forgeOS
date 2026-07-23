import { BadgeCheck, Check, ExternalLink, Globe2, ShieldCheck, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { productApi } from '../api'
import type { ApprovalRecord } from '../types'

export function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([])
  const [view, setView] = useState<'pending' | 'history'>('pending')
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { productApi.approvals().then((result) => setApprovals(result.approvals)).catch((cause) => setError(cause instanceof Error ? cause.message : 'Approvals could not be loaded.')) }, [])
  const resolve = async (id: string, status: 'approved' | 'rejected') => { setBusyId(id); setError(''); try { await productApi.resolveApproval(id, status); setApprovals((current) => current.map((item) => item.id === id ? { ...item, status, resolvedAt: new Date().toISOString() } : item)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'The approval could not be updated.') } finally { setBusyId('') } }
  const pending = approvals.filter((item) => item.status === 'pending')
  const visible = useMemo(() => view === 'pending' ? pending : approvals.filter((item) => item.status !== 'pending'), [approvals, pending, view])
  return <main className="product-page approvals-page">
    <div className="product-page-heading"><div><span className="product-eyebrow"><ShieldCheck size={12} /> Human control</span><h1>Approvals</h1><p>Review sensitive actions before an agent submits, sends, publishes, deletes, or purchases anything.</p></div></div>
    <section className="approval-policy-banner"><span><ShieldCheck size={20} /></span><div><strong>Protected actions always stop here.</strong><p>ForgeOS never completes payment, authentication, CAPTCHA, legal acceptance, or irreversible actions without a person.</p></div></section>
    <div className="record-list-heading"><div><h2>{view === 'pending' ? 'Waiting for you' : 'Decision history'}</h2><span>{pending.length} pending</span></div><div className="approval-tabs"><button className={view === 'pending' ? 'active' : ''} onClick={() => setView('pending')}>Pending</button><button className={view === 'history' ? 'active' : ''} onClick={() => setView('history')}>History</button></div></div>
    {error && <div className="product-error-banner">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
    {visible.length ? <div className="approval-list">{visible.map((approval) => <article className={approval.status} key={approval.id}><span><BadgeCheck size={18} /></span><div><small>{approval.agentName}</small><h3>{approval.action}</h3><div className="approval-context">{approval.websiteUrl && <span><Globe2 size={11} /> {new URL(approval.websiteUrl).hostname}</span>}{approval.runId && <Link to={`/runs/${approval.runId}`}>Open originating run <ExternalLink size={11} /></Link>}</div><p>{approval.details}</p><time>{new Date(approval.createdAt).toLocaleString()}</time></div>{approval.status === 'pending' ? <div><button className="reject" disabled={busyId === approval.id} onClick={() => void resolve(approval.id, 'rejected')}><X size={13} /> Reject</button><button className="approve" disabled={busyId === approval.id} onClick={() => void resolve(approval.id, 'approved')}><Check size={13} /> {busyId === approval.id ? 'Saving…' : 'Approve once'}</button></div> : <b className={`approval-decision ${approval.status}`}>{approval.status}</b>}</article>)}</div> : <section className="empty-records"><span><BadgeCheck size={22} /></span><h2>{view === 'pending' ? 'Nothing needs approval' : 'No decisions recorded'}</h2><p>{view === 'pending' ? 'Protected actions from live agents will wait here until you review them.' : 'Approved and rejected actions will remain visible here for accountability.'}</p></section>}
  </main>
}
