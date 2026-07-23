import { DEFAULT_EDGES, DEFAULT_NODES } from '../../agent-builder/data/defaultWorkflow'
import type { AgentEdge, AgentNode } from '../../agent-builder/types'
import type { AgentTemplate } from '../types'

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'product-research', slug: 'product-research', name: 'Product Research Agent', shortName: 'Product research',
    description: 'Researches search results and product pages, checks specifications, age, price, ratings and review evidence, then ranks the strongest choices for different use cases.',
    outcome: 'Get an evidence-backed shortlist instead of a search page.', category: 'Research', availability: 'available',
    accent: '#6958df', softAccent: '#eeebff', exampleSites: ['Amazon', 'Flipkart', 'Retail sites'],
    capabilities: ['Multi-page research', 'Evidence scoring', 'Use-case ranking'], risk: 'Low', defaultUrl: 'https://www.amazon.in',
    defaultGoal: 'Research the strongest matching products, inspect the leading product pages, compare price, rating, review confidence, specifications, availability and launch recency, then recommend the best overall, best value and best use-case choices with evidence and direct links.',
    defaultInputs: 'product, maximum budget, must-have features, intended use, launch-date preference',
  },
  {
    id: 'booking-assistant', slug: 'booking-assistant', name: 'Booking Assistant', shortName: 'Booking',
    description: 'Finds suitable services or appointments and pauses before confirming anything.',
    outcome: 'Turn a request into a ready-to-confirm booking.', category: 'Planning', availability: 'coming-soon',
    accent: '#248d70', softAccent: '#e5f7f0', exampleSites: ['Calendly', 'Service sites', 'Clinics'],
    capabilities: ['Search', 'Availability', 'Approval'], risk: 'Moderate', defaultUrl: 'https://www.google.com',
    defaultGoal: 'Find suitable appointment options matching my requirements and ask before confirming a time.',
    defaultInputs: 'service, preferred date, preferred time, location',
  },
  {
    id: 'travel-planner', slug: 'travel-planner', name: 'Travel Planning Agent', shortName: 'Travel planner',
    description: 'Researches destinations, stays, transport, and activities within a budget.',
    outcome: 'Create a practical shortlist for an upcoming trip.', category: 'Planning', availability: 'coming-soon',
    accent: '#197fc4', softAccent: '#e5f4fc', exampleSites: ['Booking.com', 'Maps', 'Travel sites'],
    capabilities: ['Research', 'Filter', 'Summarize'], risk: 'Low', defaultUrl: 'https://www.booking.com',
    defaultGoal: 'Find well-rated accommodation matching my dates, destination, and budget. Return the best three options.',
    defaultInputs: 'destination, dates, travellers, maximum budget',
  },
  {
    id: 'form-assistant', slug: 'form-assistant', name: 'Form Assistant', shortName: 'Form assistant',
    description: 'Prepares repetitive forms and pauses before every final submission.',
    outcome: 'Complete routine forms with fewer mistakes.', category: 'Productivity', availability: 'coming-soon',
    accent: '#d06b3f', softAccent: '#fff0e8', exampleSites: ['Portals', 'Applications', 'Admin tools'],
    capabilities: ['Read', 'Type', 'Review'], risk: 'Protected', defaultUrl: 'https://example.com',
    defaultGoal: 'Fill the form using the information provided, highlight missing fields, and ask before submitting.',
    defaultInputs: 'full name, email, phone, form-specific details',
  },
  {
    id: 'website-research', slug: 'website-research', name: 'Website Research Agent', shortName: 'Website research',
    description: 'Visits approved sources and turns page information into a structured brief.',
    outcome: 'Get useful answers with the source pages attached.', category: 'Research', availability: 'coming-soon',
    accent: '#7650a7', softAccent: '#f2eafb', exampleSites: ['Documentation', 'Directories', 'Public sites'],
    capabilities: ['Navigate', 'Extract', 'Summarize'], risk: 'Low', defaultUrl: 'https://en.wikipedia.org',
    defaultGoal: 'Research the requested topic on this website and return a concise structured summary with source links.',
    defaultInputs: 'research topic, questions to answer',
  },
  {
    id: 'price-monitor', slug: 'price-monitor', name: 'Price Monitoring Agent', shortName: 'Price monitor',
    description: 'Rechecks selected product pages and records meaningful price changes.',
    outcome: 'Know when a watched item reaches the right price.', category: 'Monitoring', availability: 'coming-soon',
    accent: '#c25478', softAccent: '#ffebf2', exampleSites: ['Product pages', 'Travel listings', 'Marketplaces'],
    capabilities: ['Schedule', 'Extract', 'Notify'], risk: 'Low', defaultUrl: 'https://example.com',
    defaultGoal: 'Check the selected page for a price change and notify me when it falls below my target.',
    defaultInputs: 'page URL, target price, check frequency',
  },
  {
    id: 'custom-browser', slug: 'custom-browser-agent', name: 'Custom Browser Agent', shortName: 'Custom agent',
    description: 'Starts with a safe general workflow that you can reshape around your own task.',
    outcome: 'Build an agent for a workflow unique to you.', category: 'Custom', availability: 'available',
    accent: '#25262c', softAccent: '#ececef', exampleSites: ['Any approved HTTPS site'],
    capabilities: ['Custom goal', 'Browser tools', 'Approvals'], risk: 'Moderate', defaultUrl: 'https://www.google.com',
    defaultGoal: 'Describe the outcome this agent should accomplish on the selected website.',
    defaultInputs: 'information that changes on every run',
  },
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
  if (template.id === 'product-research') {
    update('taskGoal', 'completionCriteria', 'Inspect up to five leading product pages and return evidence-backed recommendations for best overall, best value, and best fit. Include price, rating, review count, important features, availability, launch/date evidence when present, trade-offs, and direct links.')
    update('browserAgent', 'runtimeMode', 'product-research')
    update('browserAgent', 'maximumSteps', '45')
    update('browserAgent', 'instructions', 'Research several candidates instead of stopping at search. Prefer verified product details over card text, penalize weak review evidence, respect the budget, and explain why each recommendation fits a different use case.')
  }
  return { nodes, edges: DEFAULT_EDGES.map((edge) => ({ ...edge })) as AgentEdge[] }
}
