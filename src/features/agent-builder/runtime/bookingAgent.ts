type BookingNodeKind =
  | 'websiteChat'
  | 'collectRequirements'
  | 'searchCatalog'
  | 'filterRank'
  | 'checkAvailability'
  | 'requestConfirmation'
  | 'createBooking'
  | 'sendConfirmation'

export type BookingService = {
  id: string
  name: string
  description: string
  duration: string
  price: string
  availableTimes: string[]
  keywords: string[]
}

export type BookingSession = {
  stage: 'choose-service' | 'choose-date' | 'choose-time' | 'collect-name' | 'collect-email' | 'confirm' | 'booked'
  serviceId?: string
  preferredDate?: string
  preferredTime?: string
  customerName?: string
  customerEmail?: string
  bookingReference?: string
}

export type BookingRecord = {
  reference: string
  serviceId: string
  serviceName: string
  preferredDate: string
  preferredTime: string
  customerName: string
  customerEmail: string
}

export type BookingAgentResponse = {
  reply: string
  session: BookingSession
  quickReplies: string[]
  activeSteps: BookingNodeKind[]
  booking?: BookingRecord
}

export const BOOKING_SERVICES: BookingService[] = [
  {
    id: 'strategy-consultation',
    name: 'Strategy consultation',
    description: 'Clarify the problem, priorities, and best next step with a 1forge specialist.',
    duration: '45 minutes',
    price: '₹2,500',
    availableTimes: ['Tuesday · 4:00 PM', 'Thursday · 4:00 PM', 'Thursday · 6:00 PM'],
    keywords: ['strategy', 'consultation', 'consult', 'planning', 'advice'],
  },
  {
    id: 'automation-audit',
    name: 'Automation audit',
    description: 'Map repetitive work and identify the highest-value automation opportunities.',
    duration: '60 minutes',
    price: '₹5,000',
    availableTimes: ['Wednesday · 11:00 AM', 'Friday · 3:00 PM'],
    keywords: ['automation', 'audit', 'workflow', 'process', 'operations'],
  },
  {
    id: 'website-discovery',
    name: 'Website discovery call',
    description: 'Discuss a new website, app, or product experience with the studio.',
    duration: '30 minutes',
    price: 'Free',
    availableTimes: ['Monday · 12:00 PM', 'Tuesday · 2:00 PM', 'Friday · 5:00 PM'],
    keywords: ['website', 'site', 'app', 'design', 'product'],
  },
]

export const EMPTY_BOOKING_SESSION: BookingSession = { stage: 'choose-service' }

function findService(message: string) {
  const normalized = message.toLowerCase()
  return BOOKING_SERVICES.find((service) => service.name.toLowerCase() === normalized)
    ?? BOOKING_SERVICES.find((service) => service.keywords.some((keyword) => normalized.includes(keyword)))
}

function findDate(message: string) {
  const match = message.match(/\b(today|tomorrow|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)
  return match?.[0]
}

function findTime(message: string) {
  const exact = message.match(/\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b/i)
  if (exact) return exact[0].replace(/\s+/g, ' ').toUpperCase()
  const broad = message.match(/\b(morning|afternoon|evening)\b/i)
  return broad?.[0]
}

function findEmail(message: string) {
  return message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]
}

function findName(message: string, stage: BookingSession['stage']) {
  const named = message.match(/(?:my name is|call me)\s+([a-z][a-z .'-]{1,50})/i)?.[1]
  if (named) return named.trim().replace(/\b\w/g, (character) => character.toUpperCase())
  if (stage === 'collect-name' && !findEmail(message) && /^[a-z][a-z .'-]{1,50}$/i.test(message.trim())) {
    return message.trim().replace(/\b\w/g, (character) => character.toUpperCase())
  }
  return undefined
}

function serviceSummary(service: BookingService) {
  return `${service.name} · ${service.duration} · ${service.price}`
}

function createReference() {
  return `FG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

export function runBookingTurn(message: string, previous: BookingSession = EMPTY_BOOKING_SESSION): BookingAgentResponse {
  const value = message.trim()
  const normalized = value.toLowerCase()

  if (!value) {
    return {
      reply: 'Hi! I can help you choose the right 1forge service and request a time. What would you like help with?',
      session: { stage: 'choose-service' },
      quickReplies: BOOKING_SERVICES.map((service) => service.name),
      activeSteps: ['websiteChat'],
    }
  }

  if (/^(start over|new booking|reset)$/i.test(value)) return runBookingTurn('', EMPTY_BOOKING_SESSION)

  if (previous.stage === 'booked') {
    return {
      reply: `Your request ${previous.bookingReference ?? ''} is already saved. Start a new booking if you need another time.`,
      session: previous,
      quickReplies: ['Start over'],
      activeSteps: ['sendConfirmation'],
    }
  }

  const session: BookingSession = { ...previous }
  const selectedService = findService(value)
  if (selectedService) session.serviceId = selectedService.id
  session.preferredDate ??= findDate(value)
  session.preferredTime ??= findTime(value)
  session.customerEmail ??= findEmail(value)
  session.customerName ??= findName(value, previous.stage)

  const service = BOOKING_SERVICES.find((item) => item.id === session.serviceId)

  if (!service) {
    session.stage = 'choose-service'
    return {
      reply: normalized.includes('service')
        ? `Here are the services I can arrange:\n\n${BOOKING_SERVICES.map((item) => `• ${serviceSummary(item)}\n  ${item.description}`).join('\n\n')}`
        : 'Which type of help are you looking for? Choose an option below, or describe the problem in your own words.',
      session,
      quickReplies: BOOKING_SERVICES.map((item) => item.name),
      activeSteps: ['websiteChat', 'collectRequirements'],
    }
  }

  if (!session.preferredDate) {
    session.stage = 'choose-date'
    return {
      reply: `${serviceSummary(service)} sounds like the best match. Which day works for you?`,
      session,
      quickReplies: [...new Set(service.availableTimes.map((time) => time.split(' · ')[0]))],
      activeSteps: ['collectRequirements', 'searchCatalog', 'filterRank'],
    }
  }

  if (!session.preferredTime) {
    session.stage = 'choose-time'
    const matching = service.availableTimes.filter((time) => time.toLowerCase().startsWith(session.preferredDate?.toLowerCase() ?? ''))
    const options = matching.length > 0 ? matching : service.availableTimes
    return {
      reply: `I found these available times for ${service.name}. Which one should I hold?`,
      session,
      quickReplies: options,
      activeSteps: ['searchCatalog', 'filterRank', 'checkAvailability'],
    }
  }

  if (!session.customerName) {
    session.stage = 'collect-name'
    return {
      reply: 'Great choice. What name should I put on the booking request?',
      session,
      quickReplies: [],
      activeSteps: ['checkAvailability', 'collectRequirements'],
    }
  }

  if (!session.customerEmail) {
    session.stage = 'collect-email'
    return {
      reply: `Thanks, ${session.customerName}. What email should receive the confirmation?`,
      session,
      quickReplies: [],
      activeSteps: ['collectRequirements'],
    }
  }

  if (previous.stage !== 'confirm') {
    session.stage = 'confirm'
    return {
      reply: `Please confirm this request:\n\n${service.name}\n${session.preferredDate} at ${session.preferredTime}\n${session.customerName} · ${session.customerEmail}\n${service.price}\n\nNothing will be saved until you confirm.`,
      session,
      quickReplies: ['Confirm booking', 'Start over'],
      activeSteps: ['requestConfirmation'],
    }
  }

  if (!/\b(confirm|yes|book|go ahead)\b/i.test(value)) {
    return {
      reply: 'I have not saved anything yet. Confirm the booking or start over to change the details.',
      session,
      quickReplies: ['Confirm booking', 'Start over'],
      activeSteps: ['requestConfirmation'],
    }
  }

  const reference = createReference()
  const booking: BookingRecord = {
    reference,
    serviceId: service.id,
    serviceName: service.name,
    preferredDate: session.preferredDate,
    preferredTime: session.preferredTime,
    customerName: session.customerName,
    customerEmail: session.customerEmail,
  }

  return {
    reply: `Done — your booking request is saved as ${reference}. We’ll send the confirmed calendar time to ${session.customerEmail}.`,
    session: { ...session, stage: 'booked', bookingReference: reference },
    quickReplies: ['Start over'],
    activeSteps: ['requestConfirmation', 'createBooking', 'sendConfirmation'],
    booking,
  }
}
