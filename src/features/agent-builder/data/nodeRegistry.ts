import type { LucideIcon } from 'lucide-react'
import {
  BadgeCheck,
  CalendarCheck2,
  CalendarSearch,
  Database,
  ListChecks,
  MailCheck,
  MessageCircle,
  SlidersHorizontal,
  UserRoundCheck,
} from 'lucide-react'
import type { AgentNodeKind, NodeCategory, NodeConfig } from '../types'

export type ConfigField = {
  key: string
  label: string
  type: 'text' | 'textarea'
  hint?: string
}

export type NodeDefinition = {
  kind: AgentNodeKind
  label: string
  description: string
  category: NodeCategory
  icon: LucideIcon
  color: string
  softColor: string
  config: NodeConfig
  fields: ConfigField[]
}

export const NODE_REGISTRY: Record<AgentNodeKind, NodeDefinition> = {
  websiteChat: {
    kind: 'websiteChat',
    label: 'Website chat',
    description: 'Starts when a visitor sends a message.',
    category: 'Input',
    icon: MessageCircle,
    color: '#5f65f6',
    softColor: '#eef0ff',
    config: { welcomeMessage: 'Hi! Tell me what you would like help booking.' },
    fields: [{ key: 'welcomeMessage', label: 'Welcome message', type: 'textarea' }],
  },
  collectRequirements: {
    kind: 'collectRequirements',
    label: 'Collect requirements',
    description: 'Understands the request and asks for missing details.',
    category: 'Intelligence',
    icon: ListChecks,
    color: '#8867f2',
    softColor: '#f2edff',
    config: { requiredFields: 'service, location, preferred date, budget', instructions: 'Ask one concise question at a time.' },
    fields: [
      { key: 'requiredFields', label: 'Required information', type: 'text', hint: 'Separate fields with commas' },
      { key: 'instructions', label: 'Agent guidance', type: 'textarea' },
    ],
  },
  searchCatalog: {
    kind: 'searchCatalog',
    label: 'Search services',
    description: 'Finds matching options in a trusted catalogue.',
    category: 'Data',
    icon: Database,
    color: '#0b9f78',
    softColor: '#e5f8f2',
    config: { source: '1forge demo service catalogue', maximumResults: 10 },
    fields: [{ key: 'source', label: 'Catalogue source', type: 'text' }],
  },
  filterRank: {
    kind: 'filterRank',
    label: 'Filter & rank',
    description: 'Applies business rules and ranks the best matches.',
    category: 'Logic',
    icon: SlidersHorizontal,
    color: '#e8912f',
    softColor: '#fff3e5',
    config: { rules: 'Match service type first, then availability, price, and location.', resultCount: 3 },
    fields: [{ key: 'rules', label: 'Ranking rules', type: 'textarea' }],
  },
  checkAvailability: {
    kind: 'checkAvailability',
    label: 'Check availability',
    description: 'Checks live openings before suggesting a time.',
    category: 'Data',
    icon: CalendarSearch,
    color: '#1685d8',
    softColor: '#e8f4fd',
    config: { calendar: 'Demo calendar', timezone: 'Asia/Kolkata' },
    fields: [
      { key: 'calendar', label: 'Calendar', type: 'text' },
      { key: 'timezone', label: 'Timezone', type: 'text' },
    ],
  },
  requestConfirmation: {
    kind: 'requestConfirmation',
    label: 'Request confirmation',
    description: 'Shows the final choice before taking action.',
    category: 'Safety',
    icon: BadgeCheck,
    color: '#d04f81',
    softColor: '#ffedf4',
    config: { confirmationText: 'Confirm this service, date, time, and price before I book it?' },
    fields: [{ key: 'confirmationText', label: 'Confirmation message', type: 'textarea' }],
  },
  createBooking: {
    kind: 'createBooking',
    label: 'Create booking',
    description: 'Creates the approved event in the connected calendar.',
    category: 'Action',
    icon: CalendarCheck2,
    color: '#6357d7',
    softColor: '#efedff',
    config: { calendar: 'Demo calendar', eventTitle: '{{service}} — {{customer_name}}' },
    fields: [
      { key: 'calendar', label: 'Destination calendar', type: 'text' },
      { key: 'eventTitle', label: 'Event title', type: 'text' },
    ],
  },
  sendConfirmation: {
    kind: 'sendConfirmation',
    label: 'Send confirmation',
    description: 'Sends the booking details to the customer.',
    category: 'Action',
    icon: MailCheck,
    color: '#2a9a67',
    softColor: '#e9f8f0',
    config: { channel: 'Email', message: 'Your booking is confirmed. Here are the details: {{booking_summary}}' },
    fields: [
      { key: 'channel', label: 'Channel', type: 'text' },
      { key: 'message', label: 'Confirmation message', type: 'textarea' },
    ],
  },
  humanHandoff: {
    kind: 'humanHandoff',
    label: 'Human handoff',
    description: 'Routes exceptions to a person with full context.',
    category: 'Safety',
    icon: UserRoundCheck,
    color: '#db644d',
    softColor: '#fff0ed',
    config: { team: 'Customer care', reason: 'No reliable match or availability was found.' },
    fields: [
      { key: 'team', label: 'Assign to', type: 'text' },
      { key: 'reason', label: 'Handoff condition', type: 'textarea' },
    ],
  },
}

export const NODE_GROUPS: Array<{ category: NodeCategory; kinds: AgentNodeKind[] }> = [
  { category: 'Input', kinds: ['websiteChat'] },
  { category: 'Intelligence', kinds: ['collectRequirements'] },
  { category: 'Data', kinds: ['searchCatalog', 'checkAvailability'] },
  { category: 'Logic', kinds: ['filterRank'] },
  { category: 'Safety', kinds: ['requestConfirmation', 'humanHandoff'] },
  { category: 'Action', kinds: ['createBooking', 'sendConfirmation'] },
]
