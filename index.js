/**
 * Host half of Quick Explain.
 *
 * A temporary side conversation lives entirely in this process:
 *   - it never appends events to the user's Session, so the main conversation is untouched;
 *   - it calls the model through ctx.llm.stream with its own message list;
 *   - it is dropped when the user closes the panel (or after IDLE_TTL_MS of silence).
 *
 * The Client half talks to this file through one POST route on the shared /api channel.
 */
export const name = 'quick-explain'

// The two services this plugin cannot work without.
export const inject = ['llm', 'connection']

const ROUTE = '/api/quick-explain'
const IDLE_TTL_MS = 30 * 60 * 1000
const SWEEP_MS = 60 * 1000
const MAX_QUOTE = 4000
const MAX_CONTEXT = 4000
const MAX_TOKENS = 2048
const MAX_HISTORY = 12

const SYSTEM = [
  'You are a private side-explainer inside an AI coding assistant.',
  'The user highlighted a fragment of their ongoing conversation and opened a temporary side chat only to understand it.',
  'Explain the fragment clearly and briefly: what it means here, why it appears, and what it implies.',
  'If the fragment is a term, define it. If it is code, say what it does. If it is a claim, explain the reasoning behind it.',
  'The side chat must never pretend to continue the main task, never ask the user to resume it, and never speak for the main assistant.',
  'Keep answers short (usually under 200 words).',
  'Write plain text: no **bold**, no headings, no bullet syntax. Inline code in backticks is fine.',
  'Answer in the language of the selected fragment and the user question (usually Chinese).',
].join('\n')

/** One side conversation. */
function createThread(id, quote, context) {
  const thread = {
    id,
    quote,
    context,
    messages: [],
    state: 'thinking',
    text: '',
    error: undefined,
    controller: undefined,
    updatedAt: Date.now(),
  }
  thread.messages.push({
    role: 'user',
    content: [{
      type: 'text',
      text: firstTurn(quote, context),
    }],
  })
  return thread
}

function firstTurn(quote, context) {
  const lines = ['I selected this fragment in our conversation:', '"""', quote, '"""']
  if (context !== undefined && context !== '') {
    lines.push('', 'The text around it is:', '"""', context, '"""')
  }
  lines.push('', 'Explain what the fragment means here.')
  return lines.join('\n')
}

/** Keep the quoted first turn plus the most recent turns, so long side chats stay inside the window. */
function trimHistory(thread) {
  if (thread.messages.length <= MAX_HISTORY) return
  const [first, ...rest] = thread.messages
  thread.messages = [first, ...rest.slice(rest.length - (MAX_HISTORY - 1))]
}

export function apply(ctx, config = {}) {
  const threads = new Map()
  let counter = 0

  const fail = (message, code = 'explain/error') => {
    throw Object.assign(new Error(message), { code })
  }

  // The model a new request uses: the user's configured default, else the first served model.
  async function resolveRoute() {
    const defaults = ctx.get?.('agentDefaultModel')
    const selection = defaults?.currentSelection?.()
    if (selection?.provider !== undefined && selection?.model !== undefined) return selection
    for (const provider of ctx.llm.listProviders()) {
      const models = await ctx.llm.listModels(provider.id).catch(() => [])
      const model = models?.at(0)
      if (model !== undefined) return { provider: provider.id, model: model.id }
    }
    fail('没有可用的模型。请先在 DSH 设置里选择一个模型。', 'explain/no-model')
  }

  // Explanations do not need deep thinking, and thinking tokens share the output budget,
  // so ask for the least the model offers: 'off' when it has one, else its lowest level.
  async function lowestEffort(route) {
    const info = await ctx.llm.resolveModelInfo?.(route.provider, route.model).catch(() => undefined)
    const efforts = info?.reasoning?.efforts ?? []
    if (efforts.length === 0) return undefined
    const off = efforts.find((entry) => entry.id === 'off')
    return off?.id ?? efforts.at(0)?.id
  }

  // One model call for the latest turn of a thread. Runs in the background; the Client polls.
  async function run(thread) {
    thread.state = 'thinking'
    thread.text = ''
    thread.error = undefined
    thread.updatedAt = Date.now()
    const controller = new AbortController()
    thread.controller = controller
    let finish
    try {
      const route = await resolveRoute()
      const effort = await lowestEffort(route)
      // A budget spent entirely on thinking yields an empty answer; retry wider once.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        thread.text = ''
        finish = undefined
        for await (const chunk of ctx.llm.stream({
          provider: route.provider,
          model: route.model,
          ...(effort === undefined ? {} : { reasoningEffort: effort }),
          system: SYSTEM,
          messages: thread.messages,
          maxTokens: attempt === 0 ? MAX_TOKENS : MAX_TOKENS * 2,
          signal: controller.signal,
        })) {
          if (chunk.type === 'text-delta') thread.text += chunk.text
          else if (chunk.type === 'finish') finish = chunk
        }
        if (finish?.kind === 'error' || finish?.kind === 'aborted') break
        if (thread.text.trim() !== '') break
        if (finish?.kind !== 'max-tokens') break
      }
    } catch (error) {
      if (controller.signal.aborted) {
        thread.state = 'cancelled'
        return
      }
      thread.state = 'error'
      thread.error = error?.message ?? String(error)
      return
    }
    if (finish?.kind === 'error') {
      thread.state = 'error'
      thread.error = finish.failure?.message ?? '模型调用失败'
      return
    }
    if (finish?.kind === 'aborted' || controller.signal.aborted) {
      thread.state = 'cancelled'
      return
    }
    const text = thread.text.trim()
    if (text === '') {
      thread.state = 'error'
      thread.error = '模型这次只输出了思考过程，没有给出回答，请重试一次。'
      return
    }
    thread.messages.push({ role: 'assistant', content: [{ type: 'text', text }] })
    trimHistory(thread)
    thread.state = 'done'
    thread.updatedAt = Date.now()
  }

  function threadOf(threadId) {
    const thread = threads.get(threadId)
    if (thread === undefined) fail('这个临时对话已经关闭了，请重新选中文字。', 'explain/not-found')
    return thread
  }

  async function handle(endpoint, payload) {
    switch (endpoint) {
      case 'start': {
        const quote = String(payload?.quote ?? '').trim()
        if (quote === '') fail('没有选中文字。', 'explain/invalid')
        if (quote.length > MAX_QUOTE) fail('选中的内容太长了，请只选中需要解释的部分。', 'explain/invalid')
        const context = String(payload?.context ?? '').trim().slice(0, MAX_CONTEXT)
        counter += 1
        const id = `qe-${Date.now().toString(36)}-${counter}`
        const thread = createThread(id, quote, context)
        threads.set(id, thread)
        void run(thread)
        return { threadId: id }
      }
      case 'ask': {
        const thread = threadOf(String(payload?.threadId ?? ''))
        if (thread.state === 'thinking') fail('上一个回答还在生成中。', 'explain/busy')
        const question = String(payload?.question ?? '').trim()
        if (question === '') fail('问题是空的。', 'explain/invalid')
        thread.messages.push({ role: 'user', content: [{ type: 'text', text: question }] })
        trimHistory(thread)
        void run(thread)
        return true
      }
      case 'poll': {
        const thread = threadOf(String(payload?.threadId ?? ''))
        thread.updatedAt = Date.now()
        return {
          state: thread.state,
          text: thread.text,
          error: thread.error,
        }
      }
      case 'close': {
        const thread = threads.get(String(payload?.threadId ?? ''))
        if (thread !== undefined) {
          thread.controller?.abort()
          threads.delete(thread.id)
        }
        return true
      }
      default:
        fail(`Unknown endpoint ${String(endpoint)}`, 'explain/not-found')
    }
  }

  // One exact POST route on the shared /api channel; the browser authenticates with its own credentials.
  ctx.effect(() => ctx.connection.fetch.register({
    path: ROUTE,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: async (request) => {
      let body
      try {
        body = await request.json()
      } catch {
        body = {}
      }
      let result
      try {
        const value = await handle(String(body?.endpoint ?? ''), body?.payload)
        result = { ok: true, value }
      } catch (error) {
        result = { ok: false, error: { code: error?.code ?? 'explain/error', message: error?.message ?? String(error) } }
      }
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    },
  }), 'quick-explain: api route')

  // Drop side conversations nobody came back to, and abort their model calls.
  ctx.effect(() => {
    const timer = setInterval(() => {
      const now = Date.now()
      for (const thread of threads.values()) {
        if (now - thread.updatedAt < IDLE_TTL_MS) continue
        thread.controller?.abort()
        threads.delete(thread.id)
      }
    }, SWEEP_MS)
    return () => {
      clearInterval(timer)
      for (const thread of threads.values()) thread.controller?.abort()
      threads.clear()
    }
  }, 'quick-explain: idle sweep')
}
