import { ArrowLeft, ArrowRight, Bot, Check, Globe2, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { productApi } from '../api'
import { createWorkflowFromTemplate, getTemplate } from '../data/agentTemplates'

export function CreateAgentPage() {
  const { templateId = '' } = useParams()
  const template = getTemplate(templateId)
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState(() => ({ name: template?.name || '', websiteUrl: template?.defaultUrl || '', goal: template?.defaultGoal || '', inputs: template?.defaultInputs || '', approvals: 'payment, purchase, submit form, send message, publish, delete, accept terms' }))
  const steps = useMemo(() => [
    { title: 'Where should it work?', text: 'Choose the starting page and name this agent.' },
    { title: 'What outcome do you want?', text: 'Describe success in normal language. The agent plans the page actions.' },
    { title: 'What changes every run?', text: 'Add the information you want to provide when starting the agent.' },
    { title: 'Where should it pause?', text: 'Keep control over anything sensitive or difficult to undo.' },
    { title: 'Review the workflow', text: 'ForgeOS will generate an editable workflow from these choices.' },
  ], [])
  if (!template || template.availability === 'coming-soon') return <Navigate to="/templates" replace />

  const create = async () => {
    setSaving(true); setError('')
    const workflow = createWorkflowFromTemplate(template, { url: form.websiteUrl, goal: form.goal, inputs: form.inputs })
    const approvalNode = workflow.nodes.find((node) => node.data.kind === 'approvalGate')
    if (approvalNode) approvalNode.data.config.approvalActions = form.approvals
    try {
      const result = await productApi.createAgent({ templateId: template.id, name: form.name, websiteUrl: form.websiteUrl, goal: form.goal, nodes: workflow.nodes, edges: workflow.edges })
      navigate(`/app/${result.agent.id}`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The agent could not be created.'); setSaving(false) }
  }

  return <main className="creation-page">
    <header><Link to="/templates"><ArrowLeft size={15} /> Back to templates</Link><div className="creation-brand"><span>F</span><strong>ForgeOS</strong></div><span>Step {step + 1} of {steps.length}</span></header>
    <div className="creation-layout">
      <aside><span className="creation-template-icon" style={{ color: template.accent, background: template.softAccent }}><Bot size={23} /></span><small>{template.category} template</small><h2>{template.name}</h2><p>{template.description}</p><ol>{steps.map((item, index) => <li className={index === step ? 'active' : index < step ? 'done' : ''} key={item.title}><span>{index < step ? <Check size={11} /> : index + 1}</span><div><strong>{item.title}</strong><small>{index === step ? item.text : ''}</small></div></li>)}</ol></aside>
      <section className="creation-form-card">
        <span className="product-eyebrow"><Sparkles size={12} /> Guided setup</span><h1>{steps[step].title}</h1><p>{steps[step].text}</p>
        <div className="creation-fields">
          {step === 0 && <><label><span>Agent name</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="My product research agent" /></label><label><span>Starting website</span><div className="field-with-icon"><Globe2 size={14} /><input value={form.websiteUrl} onChange={(event) => setForm({ ...form, websiteUrl: event.target.value })} placeholder="https://example.com" /></div><small>ForgeOS automatically restricts this agent to the website’s domain.</small></label></>}
          {step === 1 && <label><span>Agent goal</span><textarea rows={7} value={form.goal} onChange={(event) => setForm({ ...form, goal: event.target.value })} /><small>Describe the result, requirements, and what should be returned.</small></label>}
          {step === 2 && <label><span>Inputs requested before each run</span><textarea rows={6} value={form.inputs} onChange={(event) => setForm({ ...form, inputs: event.target.value })} /><small>Separate fields with commas. You can remove the generated input node later.</small></label>}
          {step === 3 && <label><span>Actions that always need approval</span><textarea rows={6} value={form.approvals} onChange={(event) => setForm({ ...form, approvals: event.target.value })} /><div className="safety-callout"><ShieldCheck size={16} /><p>Passwords, CAPTCHA, two-factor authentication, payment details, and final purchases always require you, even if removed here.</p></div></label>}
          {step === 4 && <div className="creation-review"><div><span style={{ color: template.accent, background: template.softAccent }}><Bot size={18} /></span><strong>{form.name}</strong><small>{template.availability.replace('-', ' ')} runtime</small></div><dl><div><dt>Website</dt><dd>{form.websiteUrl}</dd></div><div><dt>Goal</dt><dd>{form.goal}</dd></div><div><dt>Run inputs</dt><dd>{form.inputs}</dd></div><div><dt>Approval</dt><dd>{form.approvals}</dd></div></dl></div>}
        </div>
        {error && <p className="creation-error">{error}</p>}
        <footer><button onClick={() => setStep((current) => Math.max(0, current - 1))} disabled={step === 0}>Back</button>{step < steps.length - 1 ? <button className="creation-next" onClick={() => setStep(step + 1)} disabled={(step === 0 && (!form.name.trim() || !/^https:\/\//.test(form.websiteUrl))) || (step === 1 && !form.goal.trim())}>Continue <ArrowRight size={14} /></button> : <button className="creation-next" onClick={() => void create()} disabled={saving}>{saving ? <LoaderCircle className="spin" size={14} /> : <Sparkles size={14} />} {saving ? 'Creating…' : 'Create workflow'}</button>}</footer>
      </section>
    </div>
  </main>
}
