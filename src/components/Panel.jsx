import { CloseIcon } from './icons.jsx'
import { Thinking } from './Thinking.jsx'
import { RichAnswer } from './RichAnswer.jsx'
import { Composer } from './Composer.jsx'

/** The right-edge sheet: quote, turns, error/retry, composer, footer. */
export function Panel({ copy, quote, turns, busy, error, canRetry, draft, scrollRef, onChange, onAsk, onRetry, onClose }) {
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
      className="qe-panel"
      data-quick-explain-ui={true}
      role="dialog"
      aria-label={copy.title}
      onKeyDown={(event) => { if (event.key === 'Escape') onClose() }}
    >
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
    </aside>
  )
}
