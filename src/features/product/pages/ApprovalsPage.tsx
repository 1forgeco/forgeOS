import { BadgeCheck, Check, ShieldCheck, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { productApi } from '../api'
import type { ApprovalRecord } from '../types'

export function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([])
  useEffect(() => { productApi.approvals().then((result) => setApprovals(result.approvals)) }, [])
  const resolve = async (id: string, status: 'approved' | 'rejected') => { await productApi.resolveApproval(id, status); setApprovals((current) => current.map((item) => item.id === id ? { ...item, status } : item)) }
  const pending = approvals.filter((item) => item.status === 'pending')
  return <main className="product-page approvals-page">
    <div className="product-page-heading"><div><span className="product-eyebrow"><ShieldCheck size={12} /> Human control</span><h1>Approvals</h1><p>Review sensitive actions before an agent submits, sends, publishes, deletes, or purchases anything.</p></div></div>
    <section className="approval-policy-banner"><span><ShieldCheck size={20} /></span><div><strong>Protected actions always stop here.</strong><p>ForgeOS never completes payment, authentication, CAPTCHA, legal acceptance, or irreversible actions without a person.</p></div></section>
    <div className="record-list-heading"><h2>Waiting for you</h2><span>{pending.length} pending</span></div>
    {pending.length ? <div className="approval-list">{pending.map((approval) => <article key={approval.id}><span><BadgeCheck size={18} /></span><div><small>{approval.agentName}</small><h3>{approval.action}</h3><p>{approval.details}</p><time>{new Date(approval.createdAt).toLocaleString()}</time></div><div><button className="reject" onClick={() => void resolve(approval.id, 'rejected')}><X size={13} /> Reject</button><button className="approve" onClick={() => void resolve(approval.id, 'approved')}><Check size={13} /> Approve once</button></div></article>)}</div> : <section className="empty-records"><span><BadgeCheck size={22} /></span><h2>Nothing needs approval</h2><p>Protected actions from live agents will wait here until you review them.</p></section>}
  </main>
}
