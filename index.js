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
import { BlockAssembler, createAssistantMessage, createUserMessage } from '@deepseek-ai/dsh-llm'
import { appendFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const name = 'quick-explain'

// The two services this plugin cannot work without.
export const inject = ['llm', 'connection']

const ROUTE = '/api/quick-explain'
const IDLE_TTL_MS = 30 * 60 * 1000
const SWEEP_MS = 60 * 1000
const MAX_QUOTE = 4000
const MAX_CONTEXT = 4000
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
    route: undefined,
    state: 'thinking',
    text: '',
    error: undefined,
    errorCode: undefined,
    controller: undefined,
    updatedAt: Date.now(),
  }
  thread.messages.push(createUserMessage({
    content: [{ type: 'text', text: firstTurn(quote, context) }],
    source: { kind: 'user' },
  }))
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

  // Explanations do not need deep thinking, and thinking tokens share the output
  // budget with the answer. Prefer "off"; when the route reports no levels, still
  // try "off" — the adapter refuses an unsupported level before provider I/O and
  // the caller retries without it.
  async function preferredEffort(route) {
    const info = await ctx.llm.resolveModelInfo?.(route.provider, route.model).catch(() => undefined)
    const efforts = info?.reasoning?.efforts ?? []
    if (efforts.length === 0) return 'off'
    const off = efforts.find((entry) => entry.id === 'off')
    return off?.id ?? efforts.at(0)?.id
  }

  const isEffortRefusal = (failure) => failure?.code === 'UNSUPPORTED_REASONING_EFFORT'
    || /reasoning effort/i.test(String(failure?.message ?? ''))

  /** Re-send the last user turn with an explicit "answer only" nudge. */
  function withNudge(messages) {
    const last = messages.at(-1)
    if (last?.role !== 'user') return messages
    const blocks = last.content ?? []
    const text = String(blocks.at(-1)?.text ?? '')
    return [...messages.slice(0, -1), createUserMessage({
      content: [{ type: 'text', text: `${text}\n\n(Your previous reply came back empty. Reply with the final answer text only — no reasoning, no preamble.)` }],
      source: { kind: 'user' },
    })]
  }

  /** Run one model attempt, assembling durable blocks and replay metadata like the agent loop does. */
  async function streamOnce(thread, { effort, messages, signal }) {
    const assembler = new BlockAssembler()
    thread.text = ''
    try {
      for await (const chunk of ctx.llm.stream({
        provider: thread.route.provider,
        model: thread.route.model,
        ...(effort === undefined ? {} : { reasoningEffort: effort }),
        system: SYSTEM,
        messages,
        signal,
      })) {
        assembler.push(chunk)
        if (chunk.type === 'text-delta') thread.text += chunk.text
      }
    } catch (error) {
      const failure = { code: error?.code ?? 'INTERNAL', message: error?.message ?? String(error) }
      return { assembler, finish: { kind: 'error', failure }, failure, text: thread.text.trim() }
    }
    const finish = assembler.finish
    const failure = finish.kind === 'error' ? finish.failure : undefined
    return { assembler, finish, failure, text: thread.text.trim() }
  }

  /** A compact JSON line we can inspect when a side call still fails. */
  async function noteDiagnostic(thread, { effort, finish }) {
    try {
      const line = JSON.stringify({
        at: new Date().toISOString(),
        route: thread.route,
        effort,
        finish,
        textLen: thread.text.length,
        messages: thread.messages.map((message) => ({
          role: message.role,
          source: message.source?.kind,
          replay: message.source?.replayState === undefined ? undefined : true,
          blocks: message.content?.map((block) => block.type),
        })),
      })
      await appendFile(join(process.env.DSH_HOME ?? tmpdir(), 'quick-explain-debug.jsonl'), `${line}\n`)
    } catch {
      // Diagnostics must never take the side chat down.
    }
  }

  // One side conversation turn. Runs in the background; the Client polls.
  async function run(thread) {
    thread.state = 'thinking'
    thread.text = ''
    thread.error = undefined
    thread.errorCode = undefined
    thread.updatedAt = Date.now()
    const controller = new AbortController()
    thread.controller = controller
    const signal = controller.signal
    let effort
    let result
    try {
      thread.route = await resolveRoute()
      effort = await preferredEffort(thread.route)
      result = await streamOnce(thread, { effort, messages: thread.messages, signal })
      // The route may reject a level it does not serve; retry with the route default.
      if (result.failure !== undefined && isEffortRefusal(result.failure)) {
        effort = undefined
        result = await streamOnce(thread, { effort, messages: thread.messages, signal })
      }
      // An empty answer (some thinking-heavy replies) gets one explicit nudge.
      if (result.failure === undefined && result.finish.kind !== 'aborted' && result.text === '') {
        result = await streamOnce(thread, { effort, messages: withNudge(thread.messages), signal })
      }
    } catch (error) {
      if (signal.aborted) {
        thread.state = 'cancelled'
        return
      }
      thread.state = 'error'
      thread.errorCode = 'INTERNAL'
      thread.error = error?.message ?? String(error)
      return
    }
    const finish = result.finish
    if (signal.aborted || finish.kind === 'aborted') {
      thread.state = 'cancelled'
      return
    }
    if (result.failure !== undefined) {
      thread.state = 'error'
      thread.errorCode = result.failure.code
      thread.error = result.failure.message ?? '模型调用失败'
      await noteDiagnostic(thread, { effort, finish })
      return
    }
    if (result.text === '') {
      thread.state = 'error'
      thread.errorCode = 'EMPTY_RESPONSE'
      thread.error = '模型这次只输出了思考过程，没有给出回答，请重试一次。'
      await noteDiagnostic(thread, { effort, finish })
      return
    }
    // Keep the exact assistant content (including reasoning blocks and their replay
    // signatures): a follow-up request must replay them, or a thinking-enabled route
    // answers with an empty message.
    let message
    try {
      message = createAssistantMessage({
        content: result.assembler.blocks(),
        source: {
          provider: thread.route.provider,
          model: thread.route.model,
          ...(result.assembler.replayState === undefined ? {} : { replayState: result.assembler.replayState }),
        },
      })
    } catch (error) {
      thread.state = 'error'
      thread.errorCode = 'INTERNAL'
      thread.error = `无法保存模型回复：${error?.message ?? String(error)}`
      return
    }
    thread.messages.push(message)
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
        const last = thread.messages.at(-1)
        const userMessage = createUserMessage({
          content: [{ type: 'text', text: question }],
          source: { kind: 'user' },
        })
        if (last?.role === 'user' && thread.messages.length > 1) {
          // Retry of a failed turn: replace it instead of stacking user messages.
          thread.messages[thread.messages.length - 1] = userMessage
        } else {
          thread.messages.push(userMessage)
        }
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
          errorCode: thread.errorCode,
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
