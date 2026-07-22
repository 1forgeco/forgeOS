import { ArrowLeft, ArrowRight, Bot, Check, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { productApi } from '../api'
import type { AccountSession } from '../types'
import '../styles/product.css'
import '../styles/auth.css'

function safeNext(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/projects'
}

export function AuthPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const mode = searchParams.get('mode') === 'register' ? 'register' : 'login'
  const next = useMemo(() => safeNext(searchParams.get('next')), [searchParams])
  const [session, setSession] = useState<AccountSession | null>(null)
  const [checking, setChecking] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  useEffect(() => {
    productApi.session().then(setSession).catch(() => setSession(null)).finally(() => setChecking(false))
  }, [])

  const changeMode = (nextMode: 'login' | 'register') => {
    const params = new URLSearchParams(searchParams)
    if (nextMode === 'register') params.set('mode', 'register')
    else params.delete('mode')
    setSearchParams(params)
    setError('')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const result = mode === 'register'
        ? await productApi.register({ name: form.name, email: form.email, password: form.password })
        : await productApi.login({ email: form.email, password: form.password })
      setSession(result)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ForgeOS could not sign you in.')
    } finally {
      setSaving(false)
    }
  }

  if (!checking && session?.authenticated) return <Navigate to={next} replace />

  return <main className="auth-page">
    <section className="auth-story">
      <Link className="auth-back" to="/"><ArrowLeft size={14} /> ForgeOS home</Link>
      <div className="auth-story-copy"><span className="auth-kicker"><Sparkles size={13} /> Your agent workspace</span><h1>Build once.<br /><em>Run with control.</em></h1><p>Every agent, workflow, run, and approval stays inside your own ForgeOS account.</p></div>
      <div className="auth-flow-preview">
        <div className="auth-flow-status"><span><i /> Agent ready</span><small>Private workspace</small></div>
        <article><span><Mail size={15} /></span><div><strong>Your instruction</strong><small>Collect the goal and run inputs</small></div><Check size={13} /></article>
        <b />
        <article className="active"><span><Bot size={15} /></span><div><strong>Browser agent</strong><small>Plan and perform allowed actions</small></div><Sparkles size={13} /></article>
        <b />
        <article><span><ShieldCheck size={15} /></span><div><strong>Your approval</strong><small>Pause before sensitive actions</small></div><Check size={13} /></article>
      </div>
      <div className="auth-trust"><ShieldCheck size={16} /><span><strong>Account-isolated by default</strong><small>No shared demo data or demo credentials.</small></span></div>
    </section>

    <section className="auth-form-side">
      <div className="auth-card">
        <div className="auth-brand"><span>F</span><div><strong>ForgeOS</strong><small>by 1forge</small></div></div>
        <div className="auth-mode-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => changeMode('login')}>Sign in</button><button className={mode === 'register' ? 'active' : ''} onClick={() => changeMode('register')}>Create account</button></div>
        <div className="auth-heading"><h2>{mode === 'login' ? 'Welcome back' : 'Create your workspace'}</h2><p>{mode === 'login' ? 'Sign in to open your agents and saved workflows.' : 'Use your own details. ForgeOS does not create a demo account.'}</p></div>
        <form onSubmit={(event) => void submit(event)}>
          {mode === 'register' && <label><span>Full name</span><div><UserRound size={15} /><input autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your name" required minLength={2} /></div></label>}
          <label><span>Email address</span><div><Mail size={15} /><input type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@company.com" required /></div></label>
          <label><span>Password</span><div><LockKeyhole size={15} /><input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'} required minLength={8} maxLength={128} /></div></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" disabled={saving || checking}>{saving ? 'Please wait…' : mode === 'login' ? 'Sign in to ForgeOS' : 'Create account'} {!saving && <ArrowRight size={15} />}</button>
        </form>
        <p className="auth-switch">{mode === 'login' ? 'New to ForgeOS?' : 'Already have an account?'} <button onClick={() => changeMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create your account' : 'Sign in'}</button></p>
        <p className="auth-legal">By continuing, you agree to the <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy Policy</Link>.</p>
      </div>
    </section>
  </main>
}
