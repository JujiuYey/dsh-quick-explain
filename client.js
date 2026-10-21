/**
 * Client half of Quick Explain.
 *
 * It watches text selections in the page and, when the user asks, opens a side
 * panel that talks to the Host plugin through /api/quick-explain.
 * Nothing here writes to the main Session: the panel is a separate, disposable
 * conversation rendered above the app.
 *
 * Styling deliberately borrows the app's own vocabulary — the same DESIGN tokens,
 * 0.5px hairlines and 14/22 content rhythm the transcript and composer use — so the
 * panel reads as part of DSH rather than a floating third-party card.
 */
window.__ModuleLoader__.load({
  id: 'dsh-quick-explain',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const ROUTE = '/api/quick-explain'
    const MAX_SELECTION = 1200
    const MAX_CONTEXT = 2000

    // Follow the language DSH itself applies to <html lang>, not the OS default.
    const COPY = {
      zh: {
        chip: '解释',
        chipLabel: '解释选中的内容',
        title: '临时解释',
        subtitle: '独立对话 · 不会影响主对话',
        close: '关闭',
        thinking: '正在思考',
        placeholderBusy: '正在生成…',
        placeholder: '继续追问（⌘/Ctrl+Enter 发送）',
        send: '追问',
        retry: '重试',
        footer: '关闭后这段对话即丢弃，不会写入主对话。',
        cancelled: '已取消。',
        failed: '生成失败',
        empty: '模型这次只输出了思考过程，没有给出回答，换一段或再试一次通常就好。',
      },
      en: {
        chip: 'Explain',
        chipLabel: 'Explain the selected text',
        title: 'Quick explain',
        subtitle: 'Separate chat · the main conversation is untouched',
        close: 'Close',
        thinking: 'Thinking',
        placeholderBusy: 'Generating…',
        placeholder: 'Ask a follow-up (Cmd/Ctrl+Enter to send)',
        send: 'Ask',
        retry: 'Retry',
        footer: 'Closing discards this chat; nothing is written to the main conversation.',
        cancelled: 'Cancelled.',
        failed: 'Generation failed',
        empty: 'The model only produced reasoning this time. Retry, or pick another model in settings.',
      },
    }

    // One stylesheet for the whole surface: hover, focus and motion need real CSS,
    // and every value comes from a DSH theme token so light/dark follow the app.
    const CSS = `
.qe-panel{position:fixed;top:0;right:0;bottom:0;width:min(420px,100vw);z-index:92;display:flex;flex-direction:column;
  background:var(--dsw-alias-bg-base,#fff);border-left:.5px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));
  color:var(--dsw-alias-label-primary,#16161a);font-family:inherit;font-size:var(--dsh-content-font-size,14px);
  animation:qe-slide .16s cubic-bezier(.2,.8,.2,1)}
@keyframes qe-slide{from{transform:translateX(14px);opacity:0}to{transform:none;opacity:1}}
.qe-header{height:52px;flex:none;display:flex;align-items:center;gap:8px;padding:0 10px 0 16px;
  border-bottom:.5px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12))}
.qe-title{font-size:14px;font-weight:600;line-height:20px}
.qe-sub{font-size:12px;line-height:16px;margin-top:1px;color:var(--dsw-alias-label-tertiary,#8a8b91)}
.qe-iconbtn{margin-left:auto;width:28px;height:28px;flex:none;padding:0;border:0;border-radius:var(--dsw-radius-sm,6px);
  background:transparent;color:var(--dsw-alias-label-secondary,#5f6066);display:grid;place-items:center;cursor:pointer}
.qe-iconbtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(38,49,72,.06))}
.qe-iconbtn:focus-visible,.qe-chip:focus-visible,.qe-send:focus-visible,.qe-retry:focus-visible{
  outline:calc(var(--dsw-focus-ring-width,1.5px)) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#4d6bfe));
  outline-offset:1px}
.qe-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:12px 16px 16px;display:flex;flex-direction:column;gap:14px}
.qe-quote{flex:none;max-height:120px;overflow-y:auto;padding:8px 12px;border-radius:var(--dsw-radius-md,8px);
  background:var(--dsw-alias-bg-layer-1,#f6f6f8);color:var(--dsw-alias-label-secondary,#5f6066);
  font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px));
  white-space:pre-wrap;word-break:break-word}
.qe-q{align-self:flex-end;max-width:88%;padding:8px 14px;border-radius:var(--dsw-radius-xl,16px);
  background:var(--dsw-specific-bubble,#e9f0ff);color:var(--dsw-alias-label-primary,#16161a);
  font-size:var(--dsh-content-font-size,14px);line-height:calc(22px + var(--dsh-content-font-delta,0px));
  white-space:pre-wrap;word-break:break-word}
.qe-a{font-size:var(--dsh-content-font-size,14px);line-height:calc(22px + var(--dsh-content-font-delta,0px));
  white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary,#16161a)}
.qe-code{font-family:var(--dsw-font-family-mono,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:.92em;
  padding:1px 4px;border-radius:4px;background:var(--dsw-alias-markdown-code-block,var(--dsw-alias-bg-layer-1,#f2f2f4))}
.qe-think{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-tertiary,#8a8b91);
  font-size:var(--dsh-content-font-size-secondary,13px);line-height:20px}
.qe-dots{display:inline-flex;align-items:center;gap:3px}
.qe-dot{width:4px;height:4px;border-radius:50%;background:currentColor;animation:qe-bounce 1.1s infinite ease-in-out}
.qe-dot:nth-child(2){animation-delay:.14s}
.qe-dot:nth-child(3){animation-delay:.28s}
@keyframes qe-bounce{0%,80%,100%{opacity:.25;transform:translateY(0)}35%{opacity:1;transform:translateY(-3px)}}
.qe-error{display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:var(--dsw-alias-state-error-primary,#c9433d);
  font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px))}
.qe-retry{height:26px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));
  border-radius:var(--dsw-radius-sm,6px);background:var(--dsw-alias-bg-layer-1,#f6f6f8);
  color:var(--dsw-alias-label-primary,#16161a);font:inherit;font-size:12px;cursor:pointer}
.qe-retry:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(38,49,72,.06))}
.qe-composer{flex:none;padding:10px 16px 12px;border-top:.5px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12))}
.qe-inputwrap{display:flex;align-items:flex-end;gap:8px;padding:6px 6px 6px 12px;overflow:hidden;
  background:var(--dsw-specific-input-major,#fff);border:.5px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));
  border-radius:var(--dsw-radius-lg,12px);box-shadow:var(--dsw-elevation-soft,0 4px 16px rgba(0,0,0,.04))}
.qe-input{flex:1 1 auto;min-height:32px;max-height:132px;padding:4px 0;resize:none;border:0;outline:none;
  background:transparent;color:var(--dsw-alias-label-primary,#16161a);font:inherit;
  font-size:var(--dsh-content-font-size,14px);line-height:calc(22px + var(--dsh-content-font-delta,0px))}
.qe-input::placeholder{color:var(--dsw-alias-label-tertiary,#8a8b91)}
.qe-send{flex:none;height:30px;padding:0 14px;border:0;border-radius:var(--dsw-radius-md,8px);
  background:var(--dsw-alias-button-primary-fill,var(--dsw-alias-brand-primary,#4d6bfe));
  color:var(--dsw-alias-label-primary-foreground,#fff);font:inherit;font-size:13px;font-weight:500;cursor:pointer}
.qe-send:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,var(--dsw-alias-brand-primary,#3b58e0))}
.qe-send:disabled{background:var(--dsw-alias-button-primary-dimmed,#e6e9f2);color:var(--dsw-alias-label-dimmed,#9a9ba2);cursor:default}
.qe-footer{flex:none;padding:0 16px 12px;color:var(--dsw-alias-label-tertiary,#8a8b91);font-size:11.5px;line-height:16px}
.qe-chip{position:fixed;z-index:90;display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 10px;
  border:0;border-radius:100px;background:var(--dsw-alias-button-floating-fill,var(--dsw-specific-input-major,#fff));
  color:var(--dsw-alias-label-primary,#16161a);box-shadow:var(--dsw-elevation-panel,0 3px 8px rgba(0,0,0,.08));
  font:inherit;font-size:12px;line-height:1;cursor:pointer;user-select:none}
.qe-chip:hover{background:var(--dsw-alias-button-floating-hover,var(--dsw-alias-bg-layer-2,#f2f2f4))}
.qe-chip svg{color:var(--dsw-alias-brand-primary,#4d6bfe)}
@media (prefers-reduced-motion:reduce){.qe-panel{animation:none}.qe-dot{animation:none;opacity:.55}}
`

    function useIsZh() {
      const read = () => String(document.documentElement.lang || navigator.language || '')
        .toLowerCase()
        .startsWith('zh')
      const [isZh, setIsZh] = React.useState(read)
      React.useEffect(() => {
        const observer = new MutationObserver(() => setIsZh(read()))
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
        return () => observer.disconnect()
      }, [])
      return isZh
    }

    async function call(endpoint, payload) {
      const response = await fetch(ROUTE, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint, payload: payload ?? null }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = await response.json()
      if (!body || body.ok !== true) throw new Error(body?.error?.message ?? '请求失败')
      return body.value
    }

    /** The block of text a selection sits in, so the explainer sees local context. */
    function surroundingText(selection) {
      try {
        const anchor = selection.anchorNode
        const element = anchor && (anchor.nodeType === 1 ? anchor : anchor.parentElement)
        if (!element) return ''
        const block = element.closest('p, li, pre, blockquote, h1, h2, h3, h4, h5, h6, td, th, figcaption, article')
        const text = (block ?? element).innerText ?? (block ?? element).textContent ?? ''
        return String(text).trim().slice(0, MAX_CONTEXT)
      } catch {
        return ''
      }
    }

    // Sparkles glyph from Lucide (ISC), stroke inherits the button's color.
    function SparkleIcon() {
      return h('svg', {
        width: 14,
        height: 14,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        style: { display: 'block', flex: '0 0 auto' },
      },
        h('path', { key: 'a', d: 'M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z' }),
        h('path', { key: 'b', d: 'M20 2v4' }),
        h('path', { key: 'c', d: 'M22 4h-4' }),
        h('circle', { key: 'd', cx: 4, cy: 20, r: 2 }),
      )
    }

    function CloseIcon() {
      return h('svg', {
        width: 16,
        height: 16,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        style: { display: 'block' },
      },
        h('path', { key: 'a', d: 'M18 6 6 18' }),
        h('path', { key: 'b', d: 'm6 6 12 12' }),
      )
    }

    function Thinking() {
      return h('div', { className: 'qe-think' }, [
        h('span', { key: 'label' }, COPY[useIsZh() ? 'zh' : 'en'].thinking),
        h('span', { key: 'dots', className: 'qe-dots', 'aria-hidden': true }, [
          h('span', { key: '1', className: 'qe-dot' }),
          h('span', { key: '2', className: 'qe-dot' }),
          h('span', { key: '3', className: 'qe-dot' }),
        ]),
      ])
    }

    // Minimal inline Markdown: **bold** and `code`. Everything else stays literal text.
    function inlineNodes(text, keyPrefix) {
      const nodes = []
      const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g
      let last = 0
      let match
      let index = 0
      while ((match = pattern.exec(text)) !== null) {
        if (match.index > last) nodes.push(text.slice(last, match.index))
        const piece = match[0]
        if (piece.startsWith('**')) nodes.push(h('strong', { key: `${keyPrefix}-b${index}` }, piece.slice(2, -2)))
        else nodes.push(h('code', { key: `${keyPrefix}-c${index}`, className: 'qe-code' }, piece.slice(1, -1)))
        index += 1
        last = match.index + piece.length
      }
      if (last < text.length) nodes.push(text.slice(last))
      return nodes
    }

    function RichAnswer({ text }) {
      const lines = String(text).split('\n')
      return h('div', { className: 'qe-a' }, lines.map((line, lineIndex) => h(
        'div',
        { key: lineIndex, style: line === '' ? { height: 8 } : undefined },
        line === '' ? null : inlineNodes(line, lineIndex),
      )))
    }

    function QuickExplain() {
      const copy = COPY[useIsZh() ? 'zh' : 'en']
      const [chip, setChip] = React.useState(null)
      const [open, setOpen] = React.useState(false)
      const [quote, setQuote] = React.useState('')
      const [threadId, setThreadId] = React.useState(null)
      const [turns, setTurns] = React.useState([])
      const [draft, setDraft] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState(null)
      const [revision, setRevision] = React.useState(0)

      const threadRef = React.useRef(null)
      const selectionRef = React.useRef(null)
      const scrollRef = React.useRef(null)
      React.useEffect(() => { threadRef.current = threadId }, [threadId])

      const dropThread = React.useCallback(() => {
        const id = threadRef.current
        threadRef.current = null
        if (id !== null) void call('close', { threadId: id }).catch(() => undefined)
      }, [])

      // Text selection: show a small "解释" chip next to it.
      React.useEffect(() => {
        const readSelection = () => {
          window.setTimeout(() => {
            const selection = window.getSelection()
            if (!selection || selection.isCollapsed || selection.rangeCount === 0) return
            const text = selection.toString().trim()
            if (text === '' || text.length > MAX_SELECTION) { setChip(null); return }
            const anchor = selection.anchorNode
            const element = anchor && (anchor.nodeType === 1 ? anchor : anchor.parentElement)
            if (!element) return
            // Ignore selections inside our own panel and inside editable fields.
            if (element.closest('[data-quick-explain-ui]')) return
            if (element.closest('textarea, input, [contenteditable="true"], [contenteditable=""]')) return
            const rect = selection.getRangeAt(0).getBoundingClientRect()
            if (rect.width === 0 && rect.height === 0) return
            setChip({ text, context: surroundingText(selection), x: rect.left + rect.width / 2, y: rect.top })
          }, 0)
        }
        const onPointerDown = (event) => {
          if (event.target instanceof Element && event.target.closest('[data-quick-explain-ui]')) return
          setChip(null)
        }
        const onScroll = () => setChip(null)
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setChip(null)
        }
        document.addEventListener('mouseup', readSelection, true)
        document.addEventListener('keyup', readSelection, true)
        document.addEventListener('mousedown', onPointerDown, true)
        document.addEventListener('scroll', onScroll, true)
        document.addEventListener('keydown', onKeyDown, true)
        return () => {
          document.removeEventListener('mouseup', readSelection, true)
          document.removeEventListener('keyup', readSelection, true)
          document.removeEventListener('mousedown', onPointerDown, true)
          document.removeEventListener('scroll', onScroll, true)
          document.removeEventListener('keydown', onKeyDown, true)
        }
      }, [])

      // Poll the Host while the latest turn is still generating.
      React.useEffect(() => {
        if (threadId === null) return
        let cancelled = false
        let timer
        const tick = async () => {
          try {
            const value = await call('poll', { threadId })
            if (cancelled) return
            const nextState = value.state === 'done'
              ? 'done'
              : value.state === 'error'
                ? 'error'
                : value.state === 'cancelled'
                  ? 'cancelled'
                  : 'thinking'
            setTurns((previous) => {
              const last = previous[previous.length - 1]
              if (!last || last.state !== 'thinking') return previous
              const next = previous.slice()
              next[next.length - 1] = {
                ...last,
                a: value.text ?? last.a,
                state: nextState,
                ...(value.error === undefined ? {} : { error: value.error }),
              }
              return next
            })
            if (nextState === 'thinking') {
              timer = window.setTimeout(tick, 350)
            } else {
              setBusy(false)
              if (nextState === 'error') {
                setError(value.errorCode === 'EMPTY_RESPONSE' ? copy.empty : (value.error ?? copy.failed))
              }
              else if (nextState === 'cancelled') setError(copy.cancelled)
            }
          } catch (failure) {
            if (cancelled) return
            setBusy(false)
            setError(failure?.message ?? String(failure))
          }
        }
        timer = window.setTimeout(tick, 250)
        return () => {
          cancelled = true
          window.clearTimeout(timer)
        }
      }, [threadId, revision])

      React.useEffect(() => {
        const element = scrollRef.current
        if (element) element.scrollTop = element.scrollHeight
      }, [turns, open])

      const start = React.useCallback(async (selection) => {
        dropThread()
        selectionRef.current = selection
        setChip(null)
        setOpen(true)
        setQuote(selection.text)
        setThreadId(null)
        setTurns([{ q: null, a: '', state: 'thinking' }])
        setDraft('')
        setError(null)
        setBusy(true)
        try {
          const value = await call('start', { quote: selection.text, context: selection.context })
          threadRef.current = value.threadId
          setThreadId(value.threadId)
          setRevision((count) => count + 1)
        } catch (failure) {
          setBusy(false)
          setError(failure?.message ?? String(failure))
          setTurns([{ q: null, a: '', state: 'error' }])
        }
      }, [dropThread])

      const close = React.useCallback(() => {
        dropThread()
        setOpen(false)
        setThreadId(null)
        setTurns([])
        setDraft('')
        setQuote('')
        setBusy(false)
        setError(null)
      }, [dropThread])

      const ask = React.useCallback(async () => {
        const question = draft.trim()
        if (question === '' || busy || threadId === null) return
        setDraft('')
        setBusy(true)
        setError(null)
        setTurns((previous) => [...previous, { q: question, a: '', state: 'thinking' }])
        try {
          await call('ask', { threadId, question })
          setRevision((count) => count + 1)
        } catch (failure) {
          setError(failure?.message ?? String(failure))
          setBusy(false)
          setTurns((previous) => previous.slice(0, -1))
        }
      }, [draft, busy, threadId])

      // Retry the failed turn with the same question (or the same selection for the first turn).
      const retry = React.useCallback(() => {
        if (busy) return
        setError(null)
        const last = turns[turns.length - 1]
        if (last && last.q !== null && last.q !== undefined) {
          setBusy(true)
          setTurns((previous) => {
            const next = previous.slice()
            next[next.length - 1] = { q: last.q, a: '', state: 'thinking' }
            return next
          })
          call('ask', { threadId, question: last.q })
            .then(() => setRevision((count) => count + 1))
            .catch((failure) => {
              setBusy(false)
              setError(failure?.message ?? String(failure))
            })
          return
        }
        if (selectionRef.current !== null) void start(selectionRef.current)
      }, [busy, turns, threadId, start])

      const onComposerKeyDown = (event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault()
          void ask()
        }
      }

      const retryable = open && error !== null && !busy && (threadId !== null || selectionRef.current !== null)

      const elements = [h('style', { key: 'css' }, CSS)]

      if (chip !== null) {
        elements.push(h('button', {
          key: 'chip',
          type: 'button',
          className: 'qe-chip',
          'data-quick-explain-ui': true,
          'aria-label': copy.chipLabel,
          title: copy.chipLabel,
          onMouseDown: (event) => event.preventDefault(),
          onClick: () => { void start(chip) },
          style: {
            top: Math.max(10, chip.y - 36),
            left: Math.max(8, Math.min(window.innerWidth - 96, chip.x - 36)),
          },
        }, [h(SparkleIcon, { key: 'icon' }), h('span', { key: 'label' }, copy.chip)]))
      }

      if (open) {
        const body = []
        turns.forEach((turn, index) => {
          if (turn.q !== null && turn.q !== undefined) {
            body.push(h('div', { key: `q${index}`, className: 'qe-q' }, turn.q))
          }
          if (turn.state === 'thinking' && turn.a === '') {
            body.push(h(Thinking, { key: `t${index}` }))
          } else if (turn.a !== '') {
            body.push(h(RichAnswer, { key: `a${index}`, text: turn.a }))
          }
        })

        elements.push(h('aside', {
          key: 'panel',
          className: 'qe-panel',
          'data-quick-explain-ui': true,
          role: 'dialog',
          'aria-label': copy.title,
          onKeyDown: (event) => { if (event.key === 'Escape') close() },
        }, [
          h('header', { key: 'header', className: 'qe-header' }, [
            h('div', { key: 'titles' }, [
              h('div', { key: 'title', className: 'qe-title' }, copy.title),
              h('div', { key: 'sub', className: 'qe-sub' }, copy.subtitle),
            ]),
            h('button', {
              key: 'close',
              type: 'button',
              className: 'qe-iconbtn',
              'aria-label': copy.close,
              title: copy.close,
              onClick: close,
            }, h(CloseIcon)),
          ]),
          h('div', { key: 'body', ref: scrollRef, className: 'qe-body' }, [
            h('div', { key: 'quote', className: 'qe-quote' }, quote),
            ...body,
            error !== null
              ? h('div', { key: 'err', className: 'qe-error' }, [
                  h('span', { key: 'text' }, error),
                  retryable
                    ? h('button', {
                        key: 'retry',
                        type: 'button',
                        className: 'qe-retry',
                        onClick: retry,
                      }, copy.retry)
                    : null,
                ].filter(Boolean))
              : null,
          ].filter(Boolean)),
          h('div', { key: 'composer', className: 'qe-composer' }, [
            h('div', { key: 'wrap', className: 'qe-inputwrap' }, [
              h('textarea', {
                key: 'input',
                className: 'qe-input',
                value: draft,
                rows: 1,
                placeholder: busy ? copy.placeholderBusy : copy.placeholder,
                disabled: busy,
                onChange: (event) => setDraft(event.target.value),
                onKeyDown: onComposerKeyDown,
              }),
              h('button', {
                key: 'send',
                type: 'button',
                className: 'qe-send',
                onClick: () => { void ask() },
                disabled: busy || draft.trim() === '',
              }, copy.send),
            ]),
          ]),
          h('div', { key: 'footer', className: 'qe-footer' }, copy.footer),
        ]))
      }

      return h(React.Fragment, null, ...elements)
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'quick-explain',
          order: 50,
        }, QuickExplain))
      },
    }
  },
})
