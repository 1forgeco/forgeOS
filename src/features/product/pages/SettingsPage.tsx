import { Bell, Check, Download, KeyRound, LoaderCircle, Save, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { productApi } from '../api'
import type { AccountSession, WorkspaceSettings } from '../types'

const defaults: WorkspaceSettings = {
  safety: { askBeforeSubmit: true, stopForAuthentication: true, blockPaymentDetails: true, stopAfterRepeatedFailure: true },
  notifications: { approvals: true, failedRuns: true, successfulRuns: false },
}

export function SettingsPage() {
  const { session } = useOutletContext<{ session: AccountSession | null }>()
  const [identity, setIdentity] = useState({ name: '', workspaceName: '' })
  const [settings, setSettings] = useState<WorkspaceSettings>(defaults)
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' })
  const [deleteForm, setDeleteForm] = useState({ confirmation: '', password: '' })
  const [saving, setSaving] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setIdentity({ name: session?.user?.name || '', workspaceName: session?.workspace?.name || '' })
  }, [session])
  useEffect(() => { productApi.settings().then((result) => setSettings(result.settings)).catch((cause) => setError(cause instanceof Error ? cause.message : 'Workspace settings could not be loaded.')) }, [])

  const perform = async (key: string, work: () => Promise<void>, success: string) => {
    setSaving(key); setError(''); setNotice('')
    try { await work(); setNotice(success) } catch (cause) { setError(cause instanceof Error ? cause.message : 'The change could not be saved.') } finally { setSaving('') }
  }
  const saveIdentity = () => perform('identity', async () => { await productApi.updateAccount(identity) }, 'Account and workspace names updated.')
  const saveSettings = () => perform('settings', async () => { const result = await productApi.updateSettings(settings); setSettings(result.settings) }, 'Safety and notification defaults saved.')
  const changePassword = () => perform('password', async () => { await productApi.changePassword(passwords); setPasswords({ currentPassword: '', newPassword: '' }) }, 'Password changed and other sessions signed out.')
  const exportData = () => perform('export', async () => {
    const data = await productApi.exportWorkspace()
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `forgeos-workspace-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }, 'Workspace export downloaded.')
  const deleteWorkspace = () => perform('delete', async () => {
    await productApi.deleteWorkspace(deleteForm)
    window.location.assign('/')
  }, 'Workspace deleted.')

  const safetyToggle = (key: keyof WorkspaceSettings['safety']) => setSettings((current) => ({ ...current, safety: { ...current.safety, [key]: !current.safety[key] } }))
  const notificationToggle = (key: keyof WorkspaceSettings['notifications']) => setSettings((current) => ({ ...current, notifications: { ...current.notifications, [key]: !current.notifications[key] } }))

  return <main className="product-page settings-page">
    <div className="product-page-heading"><div><span className="product-eyebrow"><UserRound size={12} /> Account and workspace</span><h1>Settings</h1><p>Manage identity, durable safety defaults, notifications, password security, and workspace data.</p></div></div>
    {notice && <div className="product-success-banner"><Check size={14} />{notice}</div>}
    {error && <div className="product-error-banner">{error}<button onClick={() => setError('')}>Dismiss</button></div>}
    <section className="settings-stack">
      <article><header><UserRound size={17} /><div><h2>Account and workspace</h2><p>These names appear in the app and paired browser extension.</p></div></header><div className="settings-fields"><label><span>Name</span><input value={identity.name} onChange={(event) => setIdentity({ ...identity, name: event.target.value })} /></label><label><span>Email</span><input value={session?.user?.email || ''} readOnly /></label><label><span>Workspace name</span><input value={identity.workspaceName} onChange={(event) => setIdentity({ ...identity, workspaceName: event.target.value })} /></label></div><div className="settings-actions"><button onClick={() => void saveIdentity()} disabled={saving === 'identity'}>{saving === 'identity' ? <LoaderCircle className="spin" size={13} /> : <Save size={13} />} Save account</button></div></article>
      <article><header><ShieldCheck size={17} /><div><h2>Safety defaults</h2><p>These safeguards are stored for the workspace and applied to new agents.</p></div></header><div className="settings-options"><label><input type="checkbox" checked={settings.safety.askBeforeSubmit} onChange={() => safetyToggle('askBeforeSubmit')} /> Ask before form submission</label><label><input type="checkbox" checked={settings.safety.stopForAuthentication} onChange={() => safetyToggle('stopForAuthentication')} /> Stop for login, CAPTCHA and two-factor authentication</label><label><input type="checkbox" checked={settings.safety.blockPaymentDetails} onChange={() => safetyToggle('blockPaymentDetails')} /> Never enter or store payment details</label><label><input type="checkbox" checked={settings.safety.stopAfterRepeatedFailure} onChange={() => safetyToggle('stopAfterRepeatedFailure')} /> Stop after two failed attempts</label></div></article>
      <article><header><Bell size={17} /><div><h2>Notifications</h2><p>Choose which recorded events should request your attention.</p></div></header><div className="settings-options"><label><input type="checkbox" checked={settings.notifications.approvals} onChange={() => notificationToggle('approvals')} /> Approval requests</label><label><input type="checkbox" checked={settings.notifications.failedRuns} onChange={() => notificationToggle('failedRuns')} /> Failed runs</label><label><input type="checkbox" checked={settings.notifications.successfulRuns} onChange={() => notificationToggle('successfulRuns')} /> Successful runs</label></div><div className="settings-actions"><button onClick={() => void saveSettings()} disabled={saving === 'settings'}>{saving === 'settings' ? <LoaderCircle className="spin" size={13} /> : <Save size={13} />} Save preferences</button></div></article>
      <article><header><KeyRound size={17} /><div><h2>Password and sessions</h2><p>Changing the password signs out every other browser session.</p></div></header><div className="settings-fields"><label><span>Current password</span><input type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} /></label><label><span>New password</span><input type="password" autoComplete="new-password" placeholder="At least 10 characters" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} /></label></div><div className="settings-actions"><button onClick={() => void changePassword()} disabled={saving === 'password' || !passwords.currentPassword || passwords.newPassword.length < 10}><KeyRound size={13} /> Change password</button></div></article>
      <article><header><Download size={17} /><div><h2>Workspace data</h2><p>Download a machine-readable copy of agents, versions, run history, approvals and settings.</p></div></header><div className="settings-actions"><button onClick={() => void exportData()} disabled={saving === 'export'}><Download size={13} /> {saving === 'export' ? 'Preparing…' : 'Download data export'}</button></div></article>
      <article className="danger-settings-card"><header><Trash2 size={17} /><div><h2>Delete workspace</h2><p>Permanently removes this account, agents, versions, runs, approvals and extension pairings.</p></div></header><div className="settings-fields"><label><span>Type DELETE</span><input value={deleteForm.confirmation} onChange={(event) => setDeleteForm({ ...deleteForm, confirmation: event.target.value })} /></label><label><span>Account password</span><input type="password" value={deleteForm.password} onChange={(event) => setDeleteForm({ ...deleteForm, password: event.target.value })} /></label></div><div className="settings-actions"><button className="danger" onClick={() => void deleteWorkspace()} disabled={saving === 'delete' || deleteForm.confirmation !== 'DELETE' || !deleteForm.password}><Trash2 size={13} /> Delete workspace permanently</button></div></article>
    </section>
  </main>
}
