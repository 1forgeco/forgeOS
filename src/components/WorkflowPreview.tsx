export function WorkflowPreview() {
  return <div className="workflow-preview">
    <div className="preview-top"><div className="preview-dots"><i /><i /><i /></div><b>Lead response flow</b><span className="preview-status">Active</span></div>
    <div className="preview-body">
      <div className="flow-node"><span className="node-icon">◒</span><div><strong>New enquiry</strong><small>WhatsApp · just now</small></div></div>
      <div className="flow-node"><span className="node-icon ai">✦</span><div><strong>AI qualifies lead</strong><small>Intent + requirements</small></div></div>
      <div className="flow-node"><span className="node-icon">↗</span><div><strong>Team gets brief</strong><small>CRM · new opportunity</small></div></div>
    </div>
  </div>
}
