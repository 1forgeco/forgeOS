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
    description: 'Opens the agent when someone messages from your website.',
    category: 'Start',
    icon: MessageCircle,
    color: '#5f65f6',
    softColor: '#eef0ff',
    config: { welcomeMessage: 'Hi! Tell me what you would like help booking.' },
    fields: [{ key: 'welcomeMessage', label: 'What should the agent say first?', type: 'textarea', hint: 'Keep this short and tell visitors what the agent can help with.' }],
  },
  collectRequirements: {
    kind: 'collectRequirements',
    label: 'Understand the visitor',
    description: 'Works out what the visitor needs and asks for missing details.',
    category: 'Understand',
    icon: ListChecks,
    color: '#8867f2',
    softColor: '#f2edff',
    config: { requiredFields: 'service, location, preferred date, budget', instructions: 'Ask one concise question at a time.' },
    fields: [
      { key: 'requiredFields', label: 'What information must the agent collect?', type: 'text', hint: 'Separate items with commas—for example: service, date, budget.' },
      { key: 'instructions', label: 'How should it ask questions?', type: 'textarea', hint: 'Describe how brief, friendly, or detailed the questions should be.' },
    ],
  },
  searchCatalog: {
    kind: 'searchCatalog',
    label: 'Search services',
    description: 'Looks through the services you allow the agent to recommend.',
    category: 'Look up',
    icon: Database,
    color: '#0b9f78',
    softColor: '#e5f8f2',
    config: { source: '1forge demo service catalogue', maximumResults: 10 },
    fields: [{ key: 'source', label: 'Where should it find your services?', type: 'text', hint: 'This demo currently uses the built-in 1forge service list.' }],
  },
  filterRank: {
    kind: 'filterRank',
    label: 'Choose the best match',
    description: 'Uses your rules to decide which options to show first.',
    category: 'Decide',
    icon: SlidersHorizontal,
    color: '#e8912f',
    softColor: '#fff3e5',
    config: { rules: 'Match service type first, then availability, price, and location.', resultCount: 3 },
    fields: [{ key: 'rules', label: 'How should it choose the best option?', type: 'textarea', hint: 'Write the priorities in order—for example: service match, availability, then price.' }],
  },
  checkAvailability: {
    kind: 'checkAvailability',
    label: 'Check availability',
    description: 'Checks available days and times before making a suggestion.',
    category: 'Look up',
    icon: CalendarSearch,
    color: '#1685d8',
    softColor: '#e8f4fd',
    config: { calendar: 'Demo calendar', timezone: 'Asia/Kolkata' },
    fields: [
      { key: 'calendar', label: 'Which calendar should it check?', type: 'text', hint: 'The demo uses example availability until a calendar is connected.' },
      { key: 'timezone', label: 'Which timezone should visitors see?', type: 'text', hint: 'Example: Asia/Kolkata or Europe/London.' },
    ],
  },
  requestConfirmation: {
    kind: 'requestConfirmation',
    label: 'Ask before booking',
    description: 'Shows the final details and waits for a clear yes.',
    category: 'Confirm or hand off',
    icon: BadgeCheck,
    color: '#d04f81',
    softColor: '#ffedf4',
    config: { confirmationText: 'Confirm this service, date, time, and price before I book it?' },
    fields: [{ key: 'confirmationText', label: 'What should the agent ask before saving?', type: 'textarea', hint: 'Make it clear that nothing is booked until the visitor confirms.' }],
  },
  createBooking: {
    kind: 'createBooking',
    label: 'Create booking',
    description: 'Saves the confirmed request so your team can complete it.',
    category: 'Take action',
    icon: CalendarCheck2,
    color: '#6357d7',
    softColor: '#efedff',
    config: { calendar: 'Demo calendar', eventTitle: '{{service}} — {{customer_name}}' },
    fields: [
      { key: 'calendar', label: 'Where should the booking be saved?', type: 'text', hint: 'The live demo stores a booking request; calendar sync comes next.' },
      { key: 'eventTitle', label: 'How should the booking be named?', type: 'text', hint: 'Keep the {{service}} and {{customer_name}} placeholders if you need them.' },
    ],
  },
  sendConfirmation: {
    kind: 'sendConfirmation',
    label: 'Send confirmation',
    description: 'Tells the visitor their request was saved and what happens next.',
    category: 'Take action',
    icon: MailCheck,
    color: '#2a9a67',
    softColor: '#e9f8f0',
    config: { channel: 'Email', message: 'Your booking is confirmed. Here are the details: {{booking_summary}}' },
    fields: [
      { key: 'channel', label: 'Where should confirmation be sent?', type: 'text', hint: 'Email is shown in the demo; outbound delivery will be connected later.' },
      { key: 'message', label: 'What should the confirmation say?', type: 'textarea', hint: 'Explain that the request was received and when the final time will be confirmed.' },
    ],
  },
  humanHandoff: {
    kind: 'humanHandoff',
    label: 'Send to a person',
    description: 'Stops automation and gives your team the conversation details.',
    category: 'Confirm or hand off',
    icon: UserRoundCheck,
    color: '#db644d',
    softColor: '#fff0ed',
    config: { team: 'Customer care', reason: 'No reliable match or availability was found.' },
    fields: [
      { key: 'team', label: 'Who should receive the request?', type: 'text', hint: 'Use a team name for now—for example: Customer care.' },
      { key: 'reason', label: 'When should the agent stop and ask for help?', type: 'textarea', hint: 'Describe situations the agent should not handle by itself.' },
    ],
  },
}

export const NODE_GROUPS: Array<{ category: NodeCategory; kinds: AgentNodeKind[] }> = [
  { category: 'Start', kinds: ['websiteChat'] },
  { category: 'Understand', kinds: ['collectRequirements'] },
  { category: 'Look up', kinds: ['searchCatalog', 'checkAvailability'] },
  { category: 'Decide', kinds: ['filterRank'] },
  { category: 'Confirm or hand off', kinds: ['requestConfirmation', 'humanHandoff'] },
  { category: 'Take action', kinds: ['createBooking', 'sendConfirmation'] },
]
