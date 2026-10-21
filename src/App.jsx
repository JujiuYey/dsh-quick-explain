import React from 'react'
import { COPY } from './i18n.js'
import { CSS } from './styles.js'
import { useIsZh } from './hooks/useIsZh.js'
import { useSelectionChip } from './hooks/useSelectionChip.js'
import { useThread } from './hooks/useThread.js'
import { Chip } from './components/Chip.jsx'
import { Panel } from './components/Panel.jsx'

/** Orchestrates chip → panel: the hooks own state, this only wires them together. */
export default function App() {
  const copy = COPY[useIsZh() ? 'zh' : 'en']
  const [chip, setChip] = useSelectionChip()
  const [open, setOpen] = React.useState(false)
  const [quote, setQuote] = React.useState('')
  const [at, setAt] = React.useState(null)
  const thread = useThread(copy)
  const scrollRef = React.useRef(null)

  React.useEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [thread.turns, open])

  const start = React.useCallback((selection) => {
    thread.begin(selection)
    setChip(null)
    setOpen(true)
    setAt({ x: selection.x, y: selection.y })
    setQuote(selection.text)
  }, [thread, setChip])

  const close = React.useCallback(() => {
    thread.close()
    setOpen(false)
    setQuote('')
  }, [thread])

  return (
    <>
      <style>{CSS}</style>
      {chip !== null && <Chip copy={copy} chip={chip} onStart={start} />}
      {open && (
        <Panel
          copy={copy}
          at={at ?? { x: window.innerWidth / 2, y: 120 }}
          quote={quote}
          turns={thread.turns}
          busy={thread.busy}
          error={thread.error}
          canRetry={thread.canRetry}
          draft={thread.draft}
          scrollRef={scrollRef}
          onChange={thread.setDraft}
          onAsk={() => void thread.ask()}
          onRetry={thread.retry}
          onClose={close}
        />
      )}
    </>
  )
}
