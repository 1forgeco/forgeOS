import { Bell, Download, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import type { AccountSession } from '../types'

export function SettingsPage() {
  const { session } = useOutletContext<{ session: AccountSession | null }>()
  return <main className="product-page settings-page">
    <div className="product-page-heading"><div><span className="product-eyebrow"><UserRound size={12} /> Account and workspace</span><h1>Settings</h1><p>Review your identity, workspace, safety defaults, notifications, and data controls.</p></div></div>
    <section className="settings-stack">
      <article><header><UserRound size={17} /><div><h2>Account</h2><p>Your ForgeOS records are isolated by this authenticated identity.</p></div></header><div className="settings-fields"><label><span>Name</span><input value={session?.user?.name || ''} readOnly /></label><label><span>Email</span><input value={session?.user?.email || ''} readOnly /></label></div></article>
      <article><header><ShieldCheck size={17} /><div><h2>Safety defaults</h2><p>These safeguards are applied to every new agent.</p></div></header><div className="settings-options"><label><input type="checkbox" defaultChecked /> Ask before form submission</label><label><input type="checkbox" defaultChecked /> Stop for login, CAPTCHA and two-factor authentication</label><label><input type="checkbox" defaultChecked /> Never enter or store payment details</label><label><input type="checkbox" defaultChecked /> Stop after two failed attempts</label></div></article>
      <article><header><Bell size={17} /><div><h2>Notifications</h2><p>Choose what should interrupt you.</p></div></header><div className="settings-options"><label><input type="checkbox" defaultChecked /> Approval requests</label><label><input type="checkbox" defaultChecked /> Failed runs</label><label><input type="checkbox" /> Successful runs</label></div></article>
      <article><header><Download size={17} /><div><h2>Workspace data</h2><p>Export or remove your stored agents and run history.</p></div></header><div className="settings-actions"><button><Download size={13} /> Request data export</button><button className="danger"><Trash2 size={13} /> Delete workspace</button></div></article>
    </section>
  </main>
}
