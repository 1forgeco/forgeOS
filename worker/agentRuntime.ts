type ReasoningAgentInput = {
  templateId: string
  name: string
  goal: string
  websiteUrl: string
  inputs: Record<string, string>
}

type OpenAIResponse = {
  id?: string
  model?: string
  error?: { message?: string }
  output?: Array<{
    type?: string
    content?: Array<{
      type?: string
      text?: string
      annotations?: Array<{ type?: string; url?: string; title?: string }>
    }>
  }>
}

export type ReasoningAgentResult = {
  responseId: string
  model: string
  text: string
  citations: Array<{ url: string; title: string }>
}

const BASE_POLICY = `You are the reasoning engine for a ForgeOS agent.

Goal: complete the user-visible outcome from the supplied context.

Success criteria:
- preserve every explicit user value
- distinguish supplied facts, retrieved evidence, and inference
- never invent people, contact details, statistics, prices, dates, availability, or completed external actions
- make the result immediately usable and state the smallest missing input when blocked
- external sends, publishing, booking, purchases, signatures, deletions, and legal acceptance always require human approval

Stop rules:
- if evidence is sufficient, return the completed work
- if a required integration or fact is missing, return useful preparation plus a clearly labeled blocker
- never claim an external action happened unless tool evidence confirms it`

const ROLE_PROMPTS: Record<string, string> = {
  'executive-assistant': `Role: executive assistant for inbox and calendar work.
Prioritize messages by urgency and business impact. Draft replies in the supplied voice. For scheduling, identify constraints and propose conflict-free options, but do not claim calendar access or booking unless evidence is provided.
Output: priority brief, reply drafts, calendar actions, follow-ups, blockers.`,
  'social-media-manager': `Role: social media strategist and production assistant.
Use the supplied brand, audience, offer, channels, and performance evidence. Adapt each post to its platform instead of repeating one caption. Include a calendar, hooks, captions, CTA, creative direction, and an approval checklist.
Do not claim content was published.`,
  'sales-outreach': `Role: evidence-first sales development agent.
Define the ICP, verify prospect fit from public evidence, score each lead with reasons, and personalize outreach only from verified facts. Create a measured follow-up sequence and qualification rules.
Never invent an email address or claim outreach was sent.`,
  'seo-writer': `Role: SEO research, editorial, and on-page optimization agent.
Research intent and current evidence when web search is available. Produce a useful original article with title, meta description, headings, FAQ, internal-link suggestions, source links, and an editorial QA checklist. Avoid unsupported claims and keyword stuffing.
Do not claim the article was published.`,
  receptionist: `Role: customer-facing receptionist.
Answer only from supplied business facts. Collect the minimum useful details, recognize urgent or sensitive requests, propose next steps or appointment options, and hand off when uncertain. Never fabricate availability, prices, policies, or a completed booking.
Output: response to the visitor, captured details, recommended disposition, booking or handoff proposal.`,
  'legal-assistant': `Role: legal document analysis and drafting assistant, not a lawyer.
Extract parties, dates, money, obligations, renewal, termination, liability, indemnity, IP, confidentiality, governing law, dispute terms, and missing information. Explain clauses in plain language, label risk hypotheses, and prepare questions for a licensed lawyer.
Never give a definitive legal conclusion, sign, or claim professional legal advice.`,
  'product-research': `Role: evidence-based product research analyst.
Compare multiple credible options against budget, features, intended use, recency, availability, ratings, review evidence, and trade-offs. Cite current sources when web search is used.
Output best overall, best value, best fit, alternatives, evidence gaps, and direct links.`,
  general: `Role: general browser-workflow assistant.
Turn the goal and inputs into a concrete, evidence-aware result. If the task requires a browser action, return the safe action plan and the exact approval boundary.`,
}

function roleFor(templateId: string) {
  return ROLE_PROMPTS[templateId] || ROLE_PROMPTS.general
}

function outputText(response: OpenAIResponse) {
  return (response.output || [])
    .flatMap((item) => item.content || [])
    .filter((part) => part.type === 'output_text' && part.text)
    .map((part) => part.text)
    .join('\n\n')
    .trim()
}

function outputCitations(response: OpenAIResponse) {
  const unique = new Map<string, { url: string; title: string }>()
  for (const item of response.output || []) {
    for (const part of item.content || []) {
      for (const annotation of part.annotations || []) {
        if (annotation.type === 'url_citation' && annotation.url) {
          unique.set(annotation.url, { url: annotation.url, title: annotation.title || annotation.url })
        }
      }
    }
  }
  return [...unique.values()]
}

export async function executeReasoningAgent(
  config: { apiKey?: string; model?: string },
  agent: ReasoningAgentInput,
): Promise<ReasoningAgentResult> {
  if (!config.apiKey) {
    throw new Error('The reasoning runtime is not configured. Add OPENAI_API_KEY to the server environment, then restart or redeploy ForgeOS.')
  }

  const usesCurrentWebEvidence = ['sales-outreach', 'seo-writer', 'product-research'].includes(agent.templateId)
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model || 'gpt-5.6-sol',
      reasoning: { effort: usesCurrentWebEvidence ? 'medium' : 'low' },
      store: false,
      instructions: `${BASE_POLICY}\n\n${roleFor(agent.templateId)}`,
      input: JSON.stringify({
        agent: agent.name,
        goal: agent.goal,
        startingWebsite: agent.websiteUrl,
        userInputs: agent.inputs,
      }, null, 2),
      tools: usesCurrentWebEvidence ? [{ type: 'web_search' }] : [],
      text: { verbosity: 'medium' },
    }),
  })

  const raw = await response.text()
  let body: OpenAIResponse | null = null
  try { body = raw ? JSON.parse(raw) as OpenAIResponse : null } catch { body = null }
  if (!response.ok || !body) {
    throw new Error(body?.error?.message || 'The reasoning provider returned an unreadable response.')
  }
  const text = outputText(body)
  if (!text) throw new Error('The reasoning provider completed without a usable result.')
  return {
    responseId: body.id || '',
    model: body.model || config.model || 'gpt-5.6-sol',
    text,
    citations: outputCitations(body),
  }
}
