export const APPROVAL_CATALOG = [
  'payment',
  'purchase',
  'submit form',
  'send message',
  'publish',
  'delete',
  'accept terms',
  'create appointment',
  'reschedule appointment',
  'transfer call',
  'sign',
] as const

export type ApprovalAction = (typeof APPROVAL_CATALOG)[number]

export const DEFAULT_APPROVAL_ACTIONS: ApprovalAction[] = [
  'payment',
  'purchase',
  'submit form',
  'send message',
  'publish',
  'delete',
  'accept terms',
]

export const DEFAULT_APPROVAL_STRING = DEFAULT_APPROVAL_ACTIONS.join(', ')
