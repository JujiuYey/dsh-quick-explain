/**
 * Client half of Quick Explain.
 *
 * It watches text selections in the page and, when the user asks, opens a small
 * side panel that talks to the Host plugin through /api/quick-explain.
 * Nothing here writes to the main Session: the panel is a separate, disposable
 * conversation rendered above the app.
 */
window.__ModuleLoader__.load({
  id: 'dsh-quick-explain',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const ROUTE = '/api/quick-explain'
    const MAX_SELECTION = 1200
    const MAX_CONTEXT = 2000
    const ZH = String(navigator.language || '').toLowerCase().startsWith('zh')
    const copy = ZH
      ? {
          chip: '💡 解释',
          chipLabel: '解释选中的内容',
          title: '临时解释',
          subtitle: '独立对话 · 不会影响主对话',
          close: '关闭',
          thinking: '正在思考…',
          placeholderBusy: '正在生成…',
          placeholder: '继续追问（⌘/Ctrl+Enter 发送）',
          send: '追问',
          footer: '关闭后这段对话即丢弃，不会写入主对话。',
          cancelled: '已取消。',
          failed: '生成失败',
        }
      : {
          chip: '💡 Explain',
          chipLabel: 'Explain the selected text',
          title: 'Quick explain',
          subtitle: 'Separate chat · the main conversation is untouched',
          close: 'Close',
          thinking: 'Thinking…',
          placeholderBusy: 'Generating…',
          placeholder: 'Ask a follow-up (Cmd/Ctrl+Enter to send)',
          send: 'Ask',
          footer: 'Closing discards this chat; nothing is written to the main conversation.',
          cancelled: 'Cancelled.',
          failed: 'Generation failed',
        }

    const token = {
      panel: 'var(--dsw-alias-bg-layer-2, #ffffff)',
      soft: 'var(--dsw-alias-bg-layer-1, #f6f6f8)',
      border: 'var(--dsw-alias-border-l2, rgba(0, 0, 0, 0.12))',
      text: 'var(--dsw-alias-label-primary, #16161a)',
      sub: 'var(--dsw-alias-label-secondary, #5f6066)',
      dim: 'var(--dsw-alias-label-tertiary, #8a8b91)',
      brand: 'var(--dsw-alias-brand-primary, #4d6bfe)',
      bubble: 'var(--dsw-alias-bg-mask-1, rgba(0, 0, 0, 0.05))',
      danger: 'var(--dsw-alias-state-warn-label, #d24b45)',
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

    const styles = {
      chip: {
        position: 'fixed',
        zIndex: 90,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        borderRadius: 8,
        border: `1px solid ${token.border}`,
        background: token.panel,
        color: token.text,
        fontSize: 12,
        lineHeight: '18px',
        fontFamily: 'inherit',
        cursor: 'pointer',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.14)',
        userSelect: 'none',
      },
      panel: {
        position: 'fixed',
        right: 12,
        top: 'calc(var(--dsh-frame-overlay-top, 68px) + 4px)',
        bottom: 16,
        width: 384,
        maxWidth: 'calc(100vw - 24px)',
        zIndex: 91,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 14,
        border: `1px solid ${token.border}`,
        background: token.panel,
        color: token.text,
        boxShadow: '0 18px 48px rgba(0, 0, 0, 0.22)',
        overflow: 'hidden',
        fontFamily: 'inherit',
        fontSize: 13.5,
      },
      header: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '12px 14px 10px',
        borderBottom: `1px solid ${token.border}`,
      },
      title: { fontSize: 14, fontWeight: 600, lineHeight: '20px' },
      subtitle: { fontSize: 11.5, color: token.sub, lineHeight: '16px', marginTop: 1 },
      closeButton: {
        marginLeft: 'auto',
        border: 'none',
        background: 'transparent',
        color: token.sub,
        cursor: 'pointer',
        fontSize: 18,
        lineHeight: '20px',
        padding: '0 2px',
        borderRadius: 6,
        fontFamily: 'inherit',
      },
      quote: {
        margin: '10px 14px 0',
        padding: '8px 10px',
        borderLeft: `3px solid ${token.brand}`,
        background: token.soft,
        color: token.sub,
        borderRadius: 6,
        fontSize: 12,
        lineHeight: '18px',
        whiteSpace: 'pre-wrap',
        maxHeight: 108,
        overflowY: 'auto',
        flex: '0 0 auto',
      },
      body: {
        flex: '1 1 auto',
        minHeight: 0,
        overflowY: 'auto',
        padding: '10px 14px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      },
      question: {
        alignSelf: 'flex-end',
        maxWidth: '92%',
        padding: '6px 10px',
        borderRadius: 10,
        background: token.bubble,
        whiteSpace: 'pre-wrap',
        lineHeight: 1.55,
      },
      answer: {
        whiteSpace: 'pre-wrap',
        lineHeight: 1.62,
      },
      think: { color: token.dim, lineHeight: 1.6 },
      error: { color: token.danger, lineHeight: 1.55, whiteSpace: 'pre-wrap' },
      composer: {
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        padding: '10px 12px',
        borderTop: `1px solid ${token.border}`,
        background: token.soft,
      },
      input: {
        flex: '1 1 auto',
        resize: 'none',
        minHeight: 36,
        maxHeight: 120,
        padding: '8px 10px',
        borderRadius: 8,
        border: `1px solid ${token.border}`,
        background: token.panel,
        color: token.text,
        fontFamily: 'inherit',
        fontSize: 13,
        lineHeight: 1.5,
        outline: 'none',
      },
      send: {
        flex: '0 0 auto',
        padding: '7px 12px',
        borderRadius: 8,
        border: 'none',
        background: token.brand,
        color: '#fff',
        fontFamily: 'inherit',
        fontSize: 13,
        cursor: 'pointer',
      },
      sendDisabled: { opacity: 0.45, cursor: 'default' },
      footer: {
        padding: '0 14px 10px',
        color: token.dim,
        fontSize: 11,
        lineHeight: '16px',
      },
    }

    function QuickExplain() {
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
      const scrollRef = React.useRef(null)
      const inputRef = React.useRef(null)
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
              if (nextState === 'error') setError(value.error ?? copy.failed)
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

      const onComposerKeyDown = (event) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
          event.preventDefault()
          void ask()
        }
      }

      const elements = []

      if (chip !== null) {
        elements.push(h('button', {
          key: 'chip',
          type: 'button',
          'data-quick-explain-ui': true,
          'aria-label': copy.chipLabel,
          title: copy.chipLabel,
          onMouseDown: (event) => event.preventDefault(),
          onClick: () => { void start(chip) },
          style: {
            ...styles.chip,
            top: Math.max(10, chip.y - 42),
            left: Math.max(8, Math.min(window.innerWidth - 84, chip.x - 34)),
          },
        }, copy.chip))
      }

      if (open) {
        const body = []
        turns.forEach((turn, index) => {
          if (turn.q !== null && turn.q !== undefined) {
            body.push(h('div', { key: `q${index}`, style: styles.question }, turn.q))
          }
          if (turn.state === 'thinking' && turn.a === '') {
            body.push(h('div', { key: `t${index}`, style: styles.think }, copy.thinking))
          } else if (turn.a !== '') {
            body.push(h('div', { key: `a${index}`, style: styles.answer }, turn.a))
          }
          if (turn.state === 'error' && turn.error !== undefined) {
            body.push(h('div', { key: `e${index}`, style: styles.error }, turn.error))
          }
        })

        elements.push(h('section', {
          key: 'panel',
          'data-quick-explain-ui': true,
          role: 'dialog',
          'aria-label': copy.title,
          onKeyDown: (event) => { if (event.key === 'Escape') close() },
          style: styles.panel,
        }, [
          h('div', { key: 'header', style: styles.header }, [
            h('div', { key: 'titles' }, [
              h('div', { key: 'title', style: styles.title }, copy.title),
              h('div', { key: 'sub', style: styles.subtitle }, copy.subtitle),
            ]),
            h('button', {
              key: 'close',
              type: 'button',
              'aria-label': copy.close,
              title: copy.close,
              onClick: close,
              style: styles.closeButton,
            }, '×'),
          ]),
          h('div', { key: 'quote', style: styles.quote }, quote),
          h('div', { key: 'body', ref: scrollRef, style: styles.body }, [
            ...body,
            error !== null ? h('div', { key: 'err', style: styles.error }, error) : null,
          ].filter(Boolean)),
          h('div', { key: 'composer', style: styles.composer }, [
            h('textarea', {
              key: 'input',
              ref: inputRef,
              value: draft,
              rows: 1,
              placeholder: busy ? copy.placeholderBusy : copy.placeholder,
              disabled: busy,
              onChange: (event) => setDraft(event.target.value),
              onKeyDown: onComposerKeyDown,
              style: styles.input,
            }),
            h('button', {
              key: 'send',
              type: 'button',
              onClick: () => { void ask() },
              disabled: busy || draft.trim() === '',
              style: { ...styles.send, ...((busy || draft.trim() === '') ? styles.sendDisabled : {}) },
            }, copy.send),
          ]),
          h('div', { key: 'footer', style: styles.footer }, copy.footer),
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
