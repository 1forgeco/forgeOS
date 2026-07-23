import { DEFAULT_EDGES, DEFAULT_NODES } from '../../agent-builder/data/defaultWorkflow'
import type { AgentEdge, AgentNode } from '../../agent-builder/types'
import type { AgentTemplate } from '../types'

const DEFAULT_APPROVALS = 'payment, purchase, submit form, send message, publish, delete, accept terms, create appointment, transfer call'

function template(value: Omit<AgentTemplate, 'runtimeMode' | 'requiredConnections' | 'approvalDefaults'> & Partial<Pick<AgentTemplate, 'runtimeMode' | 'requiredConnections' | 'approvalDefaults'>>): AgentTemplate {
  return {
    runtimeMode: 'general',
    requiredConnections: [],
    approvalDefaults: DEFAULT_APPROVALS,
    ...value,
  }
}

export const AGENT_TEMPLATES: AgentTemplate[] = [
  template({
    id: 'executive-assistant', slug: 'executive-assistant', name: 'Executive Assistant', shortName: 'Executive assistant',
    description: 'Prioritizes inbox work, prepares context-aware replies, creates meeting briefs, and proposes conflict-free calendar actions for approval.',
    outcome: 'Open the day with a prioritized inbox and prepared next actions.', category: 'Operations', availability: 'beta',
    accent: '#6f5be8', softAccent: '#efecff', exampleSites: ['Gmail', 'Outlook', 'Google Calendar'],
    capabilities: ['Inbox triage', 'Reply drafts', 'Calendar planning', 'Meeting briefs'], risk: 'Protected', defaultUrl: 'https://mail.google.com',
    defaultGoal: 'Review the supplied inbox or meeting context, separate urgent replies from FYI and noise, prepare accurate drafts in my voice, identify calendar conflicts, and return a concise priority brief. Never send or book without approval.',
    defaultInputs: 'request, email or meeting context, writing style, working hours, scheduling preferences',
    runtimeMode: 'executive-assistant', requiredConnections: ['Gmail or Outlook', 'Google or Outlook Calendar'],
    approvalDefaults: 'send message, create appointment, reschedule appointment, delete, accept terms',
  }),
  template({
    id: 'social-media-manager', slug: 'social-media-manager', name: 'Social Media Manager', shortName: 'Social manager',
    description: 'Builds a brand-aware content plan, drafts platform-specific posts, prepares creative briefs, and learns from supplied performance evidence.',
    outcome: 'Turn a brand brief into an approval-ready publishing calendar.', category: 'Marketing', availability: 'beta',
    accent: '#e5678d', softAccent: '#ffedf3', exampleSites: ['LinkedIn', 'Instagram', 'Facebook', 'X'],
    capabilities: ['Brand voice', 'Content calendar', 'Platform drafts', 'Performance review'], risk: 'Protected', defaultUrl: 'https://www.linkedin.com',
    defaultGoal: 'Create an on-brand content plan for the requested period. Produce platform-specific hooks, captions, calls to action, creative directions, and suggested timing. Use performance evidence when supplied. Nothing may publish without approval.',
    defaultInputs: 'campaign goal, audience, brand voice, offers, channels, date range, past performance',
    runtimeMode: 'social-media', requiredConnections: ['LinkedIn, Meta, or X publishing account'],
    approvalDefaults: 'publish, send message, delete, accept terms, payment',
  }),
  template({
    id: 'sales-outreach', slug: 'sales-outreach', name: 'Sales Outreach Agent', shortName: 'Sales outreach',
    description: 'Defines an ICP, researches prospects, scores fit, prepares evidence-backed personalization, and builds approval-controlled follow-up sequences.',
    outcome: 'Create a qualified prospect list and thoughtful outreach sequence.', category: 'Sales', availability: 'beta',
    accent: '#2f8c77', softAccent: '#e6f7f2', exampleSites: ['Company websites', 'LinkedIn', 'Gmail', 'Outlook'],
    capabilities: ['ICP research', 'Lead scoring', 'Personalization', 'Follow-up planning'], risk: 'Protected', defaultUrl: 'https://www.google.com',
    defaultGoal: 'Find prospects matching the ideal customer profile, verify each match from public evidence, score fit, explain the evidence, and prepare personalized outreach plus a measured follow-up sequence. Never invent contact facts or send without approval.',
    defaultInputs: 'ideal customer profile, industries, job titles, regions, offer, proof points, number of leads',
    runtimeMode: 'sales-outreach', requiredConnections: ['Approved lead source', 'Gmail or Outlook', 'Calendar'],
    approvalDefaults: 'send message, create appointment, publish, purchase, accept terms',
  }),
  template({
    id: 'seo-writer', slug: 'seo-writer', name: 'SEO Content Agent', shortName: 'SEO content',
    description: 'Researches search intent and competitors, builds a topic brief, writes grounded content, and prepares CMS-ready metadata and internal links.',
    outcome: 'Produce an evidence-backed article ready for editorial approval.', category: 'Marketing', availability: 'beta',
    accent: '#3a8abf', softAccent: '#e8f5fd', exampleSites: ['WordPress', 'Webflow', 'Shopify', 'Wix'],
    capabilities: ['Search intent', 'Content briefs', 'Full drafts', 'On-page SEO'], risk: 'Moderate', defaultUrl: 'https://www.google.com',
    defaultGoal: 'Research the requested topic and search intent, identify a realistic angle, create a complete useful article in the brand voice, and include title, description, headings, FAQ, source links, and internal-link suggestions. Do not fabricate statistics or publish without approval.',
    defaultInputs: 'business website, topic, audience, location, brand voice, target length, conversion goal',
    runtimeMode: 'seo-writer', requiredConnections: ['CMS connection for publishing'],
    approvalDefaults: 'publish, delete, accept terms, purchase',
  }),
  template({
    id: 'receptionist', slug: 'receptionist', name: 'AI Receptionist', shortName: 'Receptionist',
    description: 'Answers customer questions from an approved business brief, qualifies intent, proposes appointments, and escalates urgent or uncertain requests.',
    outcome: 'Turn an incoming conversation into an answered question, qualified lead, or ready-to-approve booking.', category: 'Support', availability: 'beta',
    accent: '#d78039', softAccent: '#fff1e6', exampleSites: ['Web chat', 'Calendar', 'Phone with telephony connection'],
    capabilities: ['Business Q&A', 'Lead capture', 'Booking', 'Urgent handoff'], risk: 'Protected', defaultUrl: 'https://calendar.google.com',
    defaultGoal: 'Handle the incoming customer request using only the approved business facts. Answer clearly, collect the minimum useful contact and booking details, offer real available times when connected, and escalate emergencies, uncertainty, complaints, or requests for a person.',
    defaultInputs: 'caller or visitor message, business facts, services, hours, prices, service area, escalation rules',
    runtimeMode: 'receptionist', requiredConnections: ['Telephony or web chat', 'Google or Outlook Calendar', 'SMS provider'],
    approvalDefaults: 'create appointment, reschedule appointment, transfer call, send message, payment, accept terms',
  }),
  template({
    id: 'legal-assistant', slug: 'legal-assistant', name: 'Legal Document Assistant', shortName: 'Legal assistant',
    description: 'Explains clauses in plain language, extracts obligations and dates, flags unusual risk, and prepares first drafts for professional review.',
    outcome: 'Understand a document and know exactly what deserves human legal review.', category: 'Documents', availability: 'beta',
    accent: '#73579d', softAccent: '#f2ecf8', exampleSites: ['Google Drive', 'Google Docs', 'Approved document URLs'],
    capabilities: ['Clause extraction', 'Plain language', 'Risk flags', 'Draft preparation'], risk: 'Protected', defaultUrl: 'https://docs.google.com',
    defaultGoal: 'Review the supplied document or request, explain it in plain language, extract parties, dates, money, obligations, termination, renewal, liability, indemnity, IP, confidentiality, governing law, and missing terms. Distinguish facts from concerns and questions for a licensed lawyer. Never sign or claim to provide legal advice.',
    defaultInputs: 'document text or approved file link, jurisdiction, your role, business context, questions',
    runtimeMode: 'legal-assistant', requiredConnections: ['Google Drive or approved file source'],
    approvalDefaults: 'accept terms, sign, send message, publish, delete, payment',
  }),
  template({
    id: 'product-research', slug: 'product-research', name: 'Product Research Agent', shortName: 'Product research',
    description: 'Researches search results and product pages, checks specifications, age, price, ratings and review evidence, then ranks the strongest choices for different use cases.',
    outcome: 'Get an evidence-backed shortlist instead of a search page.', category: 'Research', availability: 'available',
    accent: '#6958df', softAccent: '#eeebff', exampleSites: ['Amazon', 'Flipkart', 'Retail sites'],
    capabilities: ['Multi-page research', 'Evidence scoring', 'Use-case ranking'], risk: 'Low', defaultUrl: 'https://www.amazon.in',
    defaultGoal: 'Research the strongest matching products, inspect the leading product pages, compare price, rating, review confidence, specifications, availability and launch recency, then recommend the best overall, best value and best use-case choices with evidence and direct links.',
    defaultInputs: 'product, maximum budget, must-have features, intended use, launch-date preference',
    runtimeMode: 'product-research',
  }),
  template({
    id: 'booking-assistant', slug: 'booking-assistant', name: 'Booking Assistant', shortName: 'Booking',
    description: 'Finds suitable services or appointments and pauses before confirming anything.',
    outcome: 'Turn a request into a ready-to-confirm booking.', category: 'Planning', availability: 'coming-soon',
    accent: '#248d70', softAccent: '#e5f7f0', exampleSites: ['Calendly', 'Service sites', 'Clinics'],
    capabilities: ['Search', 'Availability', 'Approval'], risk: 'Moderate', defaultUrl: 'https://www.google.com',
    defaultGoal: 'Find suitable appointment options matching my requirements and ask before confirming a time.',
    defaultInputs: 'service, preferred date, preferred time, location',
  }),
  template({
    id: 'travel-planner', slug: 'travel-planner', name: 'Travel Planning Agent', shortName: 'Travel planner',
    description: 'Researches destinations, stays, transport, and activities within a budget.',
    outcome: 'Create a practical shortlist for an upcoming trip.', category: 'Planning', availability: 'coming-soon',
    accent: '#197fc4', softAccent: '#e5f4fc', exampleSites: ['Booking.com', 'Maps', 'Travel sites'],
    capabilities: ['Research', 'Filter', 'Summarize'], risk: 'Low', defaultUrl: 'https://www.booking.com',
    defaultGoal: 'Find well-rated accommodation matching my dates, destination, and budget. Return the best three options.',
    defaultInputs: 'destination, dates, travellers, maximum budget',
  }),
  template({
    id: 'form-assistant', slug: 'form-assistant', name: 'Form Assistant', shortName: 'Form assistant',
    description: 'Prepares repetitive forms and pauses before every final submission.',
    outcome: 'Complete routine forms with fewer mistakes.', category: 'Productivity', availability: 'coming-soon',
    accent: '#d06b3f', softAccent: '#fff0e8', exampleSites: ['Portals', 'Applications', 'Admin tools'],
    capabilities: ['Read', 'Type', 'Review'], risk: 'Protected', defaultUrl: 'https://example.com',
    defaultGoal: 'Fill the form using the information provided, highlight missing fields, and ask before submitting.',
    defaultInputs: 'full name, email, phone, form-specific details',
  }),
  template({
    id: 'website-research', slug: 'website-research', name: 'Website Research Agent', shortName: 'Website research',
    description: 'Visits approved sources and turns page information into a structured brief.',
    outcome: 'Get useful answers with the source pages attached.', category: 'Research', availability: 'coming-soon',
    accent: '#7650a7', softAccent: '#f2eafb', exampleSites: ['Documentation', 'Directories', 'Public sites'],
    capabilities: ['Navigate', 'Extract', 'Summarize'], risk: 'Low', defaultUrl: 'https://en.wikipedia.org',
    defaultGoal: 'Research the requested topic on this website and return a concise structured summary with source links.',
    defaultInputs: 'research topic, questions to answer',
  }),
  template({
    id: 'price-monitor', slug: 'price-monitor', name: 'Price Monitoring Agent', shortName: 'Price monitor',
    description: 'Rechecks selected product pages and records meaningful price changes.',
    outcome: 'Know when a watched item reaches the right price.', category: 'Monitoring', availability: 'coming-soon',
    accent: '#c25478', softAccent: '#ffebf2', exampleSites: ['Product pages', 'Travel listings', 'Marketplaces'],
    capabilities: ['Schedule', 'Extract', 'Notify'], risk: 'Low', defaultUrl: 'https://example.com',
    defaultGoal: 'Check the selected page for a price change and notify me when it falls below my target.',
    defaultInputs: 'page URL, target price, check frequency',
  }),
  template({
    id: 'custom-browser', slug: 'custom-browser-agent', name: 'Custom Browser Agent', shortName: 'Custom agent',
    description: 'Starts with a safe general workflow that you can reshape around your own task.',
    outcome: 'Build an agent for a workflow unique to you.', category: 'Custom', availability: 'available',
    accent: '#25262c', softAccent: '#ececef', exampleSites: ['Any approved HTTPS site'],
    capabilities: ['Custom goal', 'Browser tools', 'Approvals'], risk: 'Moderate', defaultUrl: 'https://www.google.com',
    defaultGoal: 'Describe the outcome this agent should accomplish on the selected website.',
    defaultInputs: 'information that changes on every run',
  }),
]

export function getTemplate(idOrSlug: string) {
  return AGENT_TEMPLATES.find((template) => template.id === idOrSlug || template.slug === idOrSlug)
}

export function createWorkflowFromTemplate(template: AgentTemplate, overrides?: { url?: string; goal?: string; inputs?: string }) {
  const nodes = DEFAULT_NODES.map((node) => ({ ...node, data: { ...node.data, config: { ...node.data.config } } })) as AgentNode[]
  const update = (kind: string, key: string, value: string) => {
    const node = nodes.find((item) => item.data.kind === kind)
    if (node) node.data.config[key] = value
  }
  update('targetWebsite', 'websiteUrl', overrides?.url || template.defaultUrl)
  try { update('targetWebsite', 'allowedDomains', new URL(overrides?.url || template.defaultUrl).hostname.replace(/^www\./, '')) } catch { /* validation happens in the builder */ }
  update('taskGoal', 'goal', overrides?.goal || template.defaultGoal)
  update('requiredInputs', 'fields', overrides?.inputs || template.defaultInputs)
  update('browserAgent', 'runtimeMode', template.runtimeMode)
  update('approvalGate', 'approvalActions', template.approvalDefaults)
  update('browserAgent', 'instructions', `Complete the ${template.name} outcome using visible evidence and the configured connections. Required connections: ${template.requiredConnections.join(', ') || 'none'}. Stop before any approval-controlled action.`)
  if (template.id === 'product-research') {
    update('taskGoal', 'completionCriteria', 'Inspect up to five leading product pages and return evidence-backed recommendations for best overall, best value, and best fit. Include price, rating, review count, important features, availability, launch/date evidence when present, trade-offs, and direct links.')
    update('browserAgent', 'runtimeMode', 'product-research')
    update('browserAgent', 'maximumSteps', '45')
    update('browserAgent', 'instructions', 'Research several candidates instead of stopping at search. Prefer verified product details over card text, penalize weak review evidence, respect the budget, and explain why each recommendation fits a different use case.')
  }
  return { nodes, edges: DEFAULT_EDGES.map((edge) => ({ ...edge })) as AgentEdge[] }
}
