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
import { APPROVAL_CATALOG, DEFAULT_APPROVAL_STRING } from './approvalCatalog'

export type ConfigField = {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'multiselect' | 'taglist'
  hint?: string
  placeholder?: string
  options?: Array<{ label: string; value: string }>
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
      { key: 'allowedDomains', label: 'Which websites may it use?', type: 'taglist', placeholder: 'amazon.in', hint: 'Add one approved domain at a time. The agent is blocked everywhere else.' },
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
    fields: [{ key: 'fields', label: 'What should the user enter before each run?', type: 'taglist', placeholder: 'maximum budget', hint: 'Add each requested input as a separate field. Remove this node if the task never needs changing inputs.' }],
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
      runtimeMode: 'general',
      allowedActions: 'open pages, search, click, type, select, filter, sort, scroll, extract text',
      maximumSteps: 25,
      instructions: 'Use visible page information. Verify every page change. Never guess when a control is unclear.',
    },
    fields: [
      { key: 'runtimeMode', label: 'What kind of agent is this?', type: 'select', options: [
        { label: 'General browser agent', value: 'general' },
        { label: 'Product research agent', value: 'product-research' },
        { label: 'Executive assistant', value: 'executive-assistant' },
        { label: 'Social media manager', value: 'social-media' },
        { label: 'Sales outreach agent', value: 'sales-outreach' },
        { label: 'SEO writer', value: 'seo-writer' },
        { label: 'Receptionist', value: 'receptionist' },
        { label: 'Legal assistant', value: 'legal-assistant' },
      ], hint: 'The selected mode changes the agent’s reasoning instructions and completion checks.' },
      { key: 'allowedActions', label: 'What may the agent do?', type: 'multiselect', options: ['open pages', 'search', 'click', 'type', 'select', 'filter', 'sort', 'scroll', 'extract text'].map((value) => ({ label: value.replace(/\b\w/g, (letter) => letter.toUpperCase()), value })), hint: 'Click a capability to allow or block it. The agent cannot use an unselected action.' },
      { key: 'maximumSteps', label: 'Maximum actions in one run', type: 'select', options: [10, 25, 45, 75].map((value) => ({ label: `${value} actions`, value: String(value) })), hint: 'A limit prevents the agent from continuing indefinitely.' },
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
    config: { approvalActions: DEFAULT_APPROVAL_STRING },
    fields: [{ key: 'approvalActions', label: 'Which actions always need your approval?', type: 'multiselect', options: APPROVAL_CATALOG.map((value) => ({ label: value.replace(/\b\w/g, (letter) => letter.toUpperCase()), value })), hint: 'Click to require approval. Login, CAPTCHA, payment details and two-factor checks always require takeover.' }],
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
