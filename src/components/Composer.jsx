import React from 'react'
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
        <button
          type="button"
          className="qe-send"
          onClick={onAsk}
          disabled={busy || draft.trim() === ''}
        >
          {copy.send}
        </button>
      </div>
    </div>
  )
}
