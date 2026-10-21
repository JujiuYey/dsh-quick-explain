import React from 'react'
import { CloseIcon } from './icons.jsx'
import { Thinking } from './Thinking.jsx'
import { RichAnswer } from './RichAnswer.jsx'
import { Composer } from './Composer.jsx'

/**
 * The floating card: a comet border, quote, turns, error/retry, composer, footer.
 *
 * The border is one SVG rounded rect whose single lit dash travels the edge with
 * `stroke-dashoffset`; there is no static outline, so the card only shows a line
 * where the light currently is.
 */
export function Panel({ copy, at, quote, turns, busy, error, canRetry, draft, scrollRef, onChange, onAsk, onRetry, onClose }) {
  // Pop up next to the selection; flip to the left when there is no room on the right.
  const width = Math.min(400, window.innerWidth - 24)
  const maxHeight = Math.min(560, window.innerHeight - 24)
  let left = at.x + 16
  if (left + width > window.innerWidth - 12) left = Math.max(12, at.x - width - 16)
  const top = Math.min(Math.max(at.y - 32, 12), Math.max(12, window.innerHeight - maxHeight - 12))

  // The SVG needs the real pixel box and the theme's corner radius.
  const panelRef = React.useRef(null)
  const [box, setBox] = React.useState({ w: 0, h: 0, r: 16 })
  React.useLayoutEffect(() => {
    const element = panelRef.current
    if (!element) return undefined
    const measure = () => {
      const rect = element.getBoundingClientRect()
      const radius = parseFloat(getComputedStyle(element).borderTopLeftRadius)
      setBox((previous) => {
        const next = { w: rect.width, h: rect.height, r: Number.isFinite(radius) ? radius : 16 }
        if (previous.w === next.w && previous.h === next.h && previous.r === next.r) return previous
        return next
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const body = []
  turns.forEach((turn, index) => {
    if (turn.q !== null && turn.q !== undefined) {
      body.push(<div key={`q${index}`} className="qe-q">{turn.q}</div>)
    }
    if (turn.state === 'thinking' && turn.a === '') {
      body.push(<Thinking key={`t${index}`} copy={copy} />)
    } else if (turn.a !== '') {
      body.push(<RichAnswer key={`a${index}`} text={turn.a} />)
    }
  })

  return (
    <aside
      ref={panelRef}
      className="qe-panel"
      data-quick-explain-ui={true}
      role="dialog"
      aria-label={copy.title}
      style={{ left, top, maxHeight }}
      onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}
    >
      {box.w > 0 && (
        <svg className="qe-edge" viewBox={`0 0 ${box.w + 8} ${box.h + 8}`} aria-hidden="true">
          <defs>
            <linearGradient
              id="qe-comet-grad"
              gradientUnits="userSpaceOnUse"
              x1={box.w * 0.15}
              y1="0"
              x2={box.w * 0.85}
              y2={box.h}
            >
              <stop offset="0%" style={{ stopColor: 'var(--dsw-alias-brand-primary, #4d6bfe)', stopOpacity: 0 }} />
              <stop offset="40%" style={{ stopColor: 'var(--dsw-alias-brand-primary, #4d6bfe)', stopOpacity: 0.75 }} />
              <stop offset="100%" style={{ stopColor: 'var(--dsw-alias-brand-primary, #4d6bfe)', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
          <rect
            className="qe-comet"
            x={4}
            y={4}
            width={box.w}
            height={box.h}
            rx={box.r}
            ry={box.r}
            pathLength={100}
          />
        </svg>
      )}
      <div className="qe-inner">
        <header className="qe-header">
          <div>
            <div className="qe-title">{copy.title}</div>
            <div className="qe-sub">{copy.subtitle}</div>
          </div>
          <button
            type="button"
            className="qe-iconbtn"
            aria-label={copy.close}
            title={copy.close}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </header>
        <div ref={scrollRef} className="qe-body">
          <div className="qe-quote">{quote}</div>
          {body}
          {error !== null && (
            <div className="qe-error">
              <span>{error}</span>
              {canRetry && (
                <button type="button" className="qe-retry" onClick={onRetry}>
                  {copy.retry}
                </button>
              )}
            </div>
          )}
        </div>
        <Composer copy={copy} draft={draft} busy={busy} onChange={onChange} onAsk={onAsk} />
        <div className="qe-footer">{copy.footer}</div>
      </div>
    </aside>
  )
}
