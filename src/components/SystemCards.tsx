const cards = [
  ['Every tool, in the loop', 'Connect WhatsApp, forms, documents, CRM, Sheets, email, and the systems you already use.', 'tools'],
  ['A clear view of the work', 'Bring requests, statuses, approvals, and follow-ups into one tailor-made control centre.', 'dashboard'],
  ['Human where it matters', 'Let the automation handle the routine. Keep approvals and exceptions with your team.', 'approval'],
  ['Smart enough to improve', 'Use the right model, prompts, and knowledge for each job — then make it better with feedback.', 'models'],
]

export function SystemCards() {
  return <div className="system-grid">{cards.map(([title, text, visual]) => <article className={`system-card system-${visual}`} key={title}><h3>{title}</h3><p>{text}</p><div className="system-visual" aria-hidden="true">{visual === 'tools' && <div className="tool-chain"><b>WA</b><i>+</i><b>CRM</b><i>+</i><b>✦</b></div>}{visual === 'dashboard' && <div className="mini-dashboard"><span /><span /><span /><div /></div>}{visual === 'approval' && <div className="approval-card"><small>Approval needed</small><strong>Send customer proposal?</strong><div><b>Approve</b><i>Review</i></div></div>}{visual === 'models' && <div className="model-orbit"><b>◒</b><b>✦</b><b>G</b><b>⌁</b><b>AI</b></div>}</div></article>)}</div>
}
