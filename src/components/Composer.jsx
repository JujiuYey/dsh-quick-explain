import React from 'react'
import { SendIcon } from './icons.jsx'

export function Composer({ copy, draft, busy, onChange, onAsk }) {
  const onKeyDown = (event) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      onAsk()
    }
  }
  return (
    <div className="qe-composer">
      <div className="qe-inputwrap">
        <textarea
          className="qe-input"
          value={draft}
          rows={1}
          placeholder={busy ? copy.placeholderBusy : copy.placeholder}
          disabled={busy}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="qe-sendrow">
          <button
            type="button"
            className="qe-send"
            onClick={onAsk}
            disabled={busy || draft.trim() === ''}
            aria-label={copy.send}
            title={copy.send}
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
