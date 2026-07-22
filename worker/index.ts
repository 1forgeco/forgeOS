import { runBookingTurn, type BookingAgentResponse, type BookingSession } from '../src/features/agent-builder/runtime/bookingAgent'

type D1PreparedStatement = {
  bind: (...values: unknown[]) => D1PreparedStatement
  run: () => Promise<unknown>
}

type WorkerEnv = {
  ASSETS: { fetch: (request: Request) => Promise<Response> }
  DB?: { prepare: (query: string) => D1PreparedStatement; batch: (statements: D1PreparedStatement[]) => Promise<unknown> }
}

type ChatPayload = {
  message?: string
  session?: BookingSession
  sessionId?: string
}

const corsHeaders = (request: Request) => ({
  'Access-Control-Allow-Origin': request.headers.get('Origin') ?? '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Vary': 'Origin',
})

async function saveTurn(env: WorkerEnv, sessionId: string, message: string, result: BookingAgentResponse) {
  if (!env.DB) return
  const statements = [
    env.DB.prepare('INSERT INTO agent_messages (session_id, role, message) VALUES (?, ?, ?)').bind(sessionId, 'visitor', message),
    env.DB.prepare('INSERT INTO agent_messages (session_id, role, message) VALUES (?, ?, ?)').bind(sessionId, 'agent', result.reply),
  ]

  if (result.booking) {
    statements.push(env.DB.prepare(`
      INSERT OR IGNORE INTO booking_requests
        (reference, session_id, service_id, service_name, preferred_date, preferred_time, customer_name, customer_email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      result.booking.reference,
      sessionId,
      result.booking.serviceId,
      result.booking.serviceName,
      result.booking.preferredDate,
      result.booking.preferredTime,
      result.booking.customerName,
      result.booking.customerEmail,
    ))
  }
  await env.DB.batch(statements)
}

async function handleAgentChat(request: Request, env: WorkerEnv) {
  let payload: ChatPayload
  try {
    payload = await request.json() as ChatPayload
  } catch {
    return Response.json({ error: 'Send a valid JSON request.' }, { status: 400, headers: corsHeaders(request) })
  }

  const message = payload.message?.trim() ?? ''
  if (message.length > 1_000) {
    return Response.json({ error: 'Keep each message below 1,000 characters.' }, { status: 400, headers: corsHeaders(request) })
  }

  const sessionId = payload.sessionId?.slice(0, 100) || crypto.randomUUID()
  const result = runBookingTurn(message, payload.session)
  await saveTurn(env, sessionId, message || '[conversation opened]', result)
  return Response.json({ ...result, sessionId }, { headers: { ...corsHeaders(request), 'Cache-Control': 'no-store' } })
}

export default {
  async fetch(request: Request, env: WorkerEnv) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return new Response(null, { status: 204, headers: corsHeaders(request) })
    }

    if (url.pathname === '/api/health') {
      return Response.json({ ok: true, agent: 'demo-booking', storage: env.DB ? 'connected' : 'preview' }, { headers: corsHeaders(request) })
    }

    if (url.pathname === '/api/agents/demo-booking/chat' && request.method === 'POST') {
      try {
        return await handleAgentChat(request, env)
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Unexpected agent error'
        return Response.json({ error: detail }, { status: 500, headers: corsHeaders(request) })
      }
    }

    const response = await env.ASSETS.fetch(request)
    if (response.status !== 404 || request.method !== 'GET') return response

    url.pathname = '/index.html'
    return env.ASSETS.fetch(new Request(url, request))
  },
}
