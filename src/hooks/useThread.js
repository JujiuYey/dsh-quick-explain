import React from 'react'
import { call, errorMessage } from '../api.js'

/**
 * The side conversation itself: thread identity, turns, and the poll loop that
 * follows the Host while a turn is generating. Owns start/ask/retry/close.
 */
export function useThread(copy) {
  const [threadId, setThreadId] = React.useState(null)
  const [turns, setTurns] = React.useState([])
  const [draft, setDraft] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState(null)
  const [revision, setRevision] = React.useState(0)

  const threadRef = React.useRef(null)
  const selectionRef = React.useRef(null)
  React.useEffect(() => { threadRef.current = threadId }, [threadId])

  const dropThread = React.useCallback(() => {
    const id = threadRef.current
    threadRef.current = null
    if (id !== null) void call('close', { threadId: id }).catch(() => undefined)
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
          } else if (nextState === 'cancelled') {
            setError(copy.cancelled)
          }
        }
      } catch (failure) {
        if (cancelled) return
        setBusy(false)
        setError(errorMessage(failure))
      }
    }
    timer = window.setTimeout(tick, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [threadId, revision, copy])

  /** Open a fresh thread for a selection; the panel opens around this. */
  const begin = React.useCallback(async (selection) => {
    dropThread()
    selectionRef.current = selection
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
      setError(errorMessage(failure))
      setTurns([{ q: null, a: '', state: 'error' }])
    }
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
      setError(errorMessage(failure))
      setBusy(false)
      setTurns((previous) => previous.slice(0, -1))
    }
  }, [draft, busy, threadId])

  /** Retry the failed turn with the same question (or the same selection for the first turn). */
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
          setError(errorMessage(failure))
        })
      return
    }
    if (selectionRef.current !== null) void begin(selectionRef.current)
  }, [busy, turns, threadId, begin])

  const close = React.useCallback(() => {
    dropThread()
    setThreadId(null)
    setTurns([])
    setDraft('')
    setBusy(false)
    setError(null)
  }, [dropThread])

  const canRetry = !busy && error !== null && (threadId !== null || selectionRef.current !== null)

  return { threadId, turns, draft, setDraft, busy, error, canRetry, begin, ask, retry, close }
}
