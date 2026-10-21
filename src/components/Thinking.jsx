import React from 'react'
export function Thinking({ copy }) {
  return (
    <div className="qe-think">
      <span>{copy.thinking}</span>
      <span className="qe-dots" aria-hidden={true}>
        <span className="qe-dot" />
        <span className="qe-dot" />
        <span className="qe-dot" />
      </span>
    </div>
  )
}
