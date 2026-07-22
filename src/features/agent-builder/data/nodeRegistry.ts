import type { LucideIcon } from 'lucide-react'
import {
  BadgeCheck,
  Bot,
  CirclePlay,
  Flag,
  FormInput,
  Globe2,
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
  manualTrigger: {
    kind: 'manualTrigger',
    label: 'Start manually',
    description: 'Runs when you press Run in ForgeOS or the extension.',
    category: 'Start',
    icon: CirclePlay,
    color: '#5f65f6',
    softColor: '#eef0ff',
    config: { buttonLabel: 'Run agent' },
    fields: [{ key: 'buttonLabel', label: 'What should the run button say?', type: 'text', hint: 'Example: Find products or Fill this form.' }],
  },
  targetWebsite: {
    kind: 'targetWebsite',
    label: 'Choose website',
    description: 'Opens the website where the agent is allowed to work.',
    category: 'Define',
    icon: Globe2,
    color: '#1685d8',
    softColor: '#e8f4fd',
    config: { websiteUrl: 'https://www.amazon.in', allowedDomains: 'amazon.in' },
    fields: [
      { key: 'websiteUrl', label: 'Which page should the agent open?', type: 'text', hint: 'Enter a complete address, including https://.' },
      { key: 'allowedDomains', label: 'Which websites may it use?', type: 'text', hint: 'Separate domains with commas. The agent is blocked everywhere else.' },
    ],
  },
  taskGoal: {
    kind: 'taskGoal',
    label: 'Describe the goal',
    description: 'Explains the outcome to achieve instead of prescribing every click.',
    category: 'Define',
    icon: Flag,
    color: '#8867f2',
    softColor: '#f2edff',
    config: {
      goal: 'Find a black mechanical keyboard under ₹5,000 with at least four stars.',
      completionCriteria: 'Return the three best matching products with name, price, rating, and link.',
    },
    fields: [
      { key: 'goal', label: 'What should the agent accomplish?', type: 'textarea', hint: 'Describe the result in plain language. The agent plans the page actions.' },
      { key: 'completionCriteria', label: 'How will it know the job is finished?', type: 'textarea', hint: 'Be specific about the result that must be returned or the final page state.' },
    ],
  },
  requiredInputs: {
    kind: 'requiredInputs',
    label: 'Ask for inputs',
    description: 'Collects information that can change each time the agent runs.',
    category: 'Define',
    icon: FormInput,
    color: '#0b9f78',
    softColor: '#e5f8f2',
    config: { fields: 'search item, maximum budget, preferred colour' },
    fields: [{ key: 'fields', label: 'What should the user enter before each run?', type: 'textarea', hint: 'Separate fields with commas. Remove this node if the task never needs changing inputs.' }],
  },
  browserAgent: {
    kind: 'browserAgent',
    label: 'Browser agent',
    description: 'Reads the page, chooses actions, performs them, and checks the result.',
    category: 'Agent',
    icon: Bot,
    color: '#e8912f',
    softColor: '#fff3e5',
    config: {
      allowedActions: 'open pages, search, click, type, select, filter, sort, scroll, extract text',
      maximumSteps: 25,
      instructions: 'Use visible page information. Verify every page change. Never guess when a control is unclear.',
    },
    fields: [
      { key: 'allowedActions', label: 'Which browser actions may it use?', type: 'textarea', hint: 'These are capabilities, not fixed steps. Remove any action the agent should never take.' },
      { key: 'maximumSteps', label: 'Maximum actions in one run', type: 'text', hint: 'A limit prevents the agent from continuing indefinitely.' },
      { key: 'instructions', label: 'Extra rules for the agent', type: 'textarea', hint: 'Add website-specific guidance or things the agent must avoid.' },
    ],
  },
  approvalGate: {
    kind: 'approvalGate',
    label: 'Ask for approval',
    description: 'Pauses before actions that create risk or cannot be easily undone.',
    category: 'Safety',
    icon: BadgeCheck,
    color: '#d04f81',
    softColor: '#ffedf4',
    config: { approvalActions: 'payment, purchase, submit form, send message, publish, delete, accept terms' },
    fields: [{ key: 'approvalActions', label: 'Which actions always need your approval?', type: 'textarea', hint: 'Separate actions with commas. Login, CAPTCHA, payment and two-factor checks always require takeover.' }],
  },
  returnResult: {
    kind: 'returnResult',
    label: 'Return the result',
    description: 'Shows what was completed, evidence, and links to the user.',
    category: 'Finish',
    icon: BadgeCheck,
    color: '#2a9a67',
    softColor: '#e9f8f0',
    config: { resultFormat: 'A concise summary followed by a table of the three best matches with direct links.' },
    fields: [{ key: 'resultFormat', label: 'How should the final result be presented?', type: 'textarea', hint: 'Examples: table, short summary, extracted JSON, downloaded file, or confirmation number.' }],
  },
  humanTakeover: {
    kind: 'humanTakeover',
    label: 'Let me take over',
    description: 'Stops safely when login, CAPTCHA, payment, or uncertainty needs a person.',
    category: 'Safety',
    icon: UserRoundCheck,
    color: '#db644d',
    softColor: '#fff0ed',
    config: { fallbackInstructions: 'Pause on login, CAPTCHA, two-factor authentication, payment details, or after two failed attempts.' },
    fields: [{ key: 'fallbackInstructions', label: 'When should the agent stop and give you control?', type: 'textarea', hint: 'The current page remains open so the user can finish the sensitive step.' }],
  },
}

export const NODE_GROUPS: Array<{ category: NodeCategory; kinds: AgentNodeKind[] }> = [
  { category: 'Start', kinds: ['manualTrigger'] },
  { category: 'Define', kinds: ['targetWebsite', 'taskGoal', 'requiredInputs'] },
  { category: 'Agent', kinds: ['browserAgent'] },
  { category: 'Safety', kinds: ['approvalGate', 'humanTakeover'] },
  { category: 'Finish', kinds: ['returnResult'] },
]
