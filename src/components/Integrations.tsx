const integrations = ['WhatsApp', 'Google Workspace', 'Notion', 'Slack', 'HubSpot', 'Shopify', 'Airtable', 'Zapier']

export function Integrations() {
  return <section className="integrations"><div className="section-shell"><div className="integrations-header"><span className="section-index">Connections</span><h2>Works with the tools<br />your team already uses.</h2><p>And when the right connection does not exist yet, we can build it.</p></div><div className="integration-grid">{integrations.map((name, index) => <div className="integration" key={name}><span className={`integration-symbol s-${index}`}>{name.slice(0, 1)}</span>{name}</div>)}</div></div></section>
}
