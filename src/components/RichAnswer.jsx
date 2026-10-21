import React from 'react'
/** Minimal inline Markdown: **bold** and `code`. Everything else stays literal text. */
function inlineNodes(text, keyPrefix) {
  const nodes = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  let match
  let index = 0
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index))
    const piece = match[0]
    if (piece.startsWith('**')) nodes.push(<strong key={`${keyPrefix}-b${index}`}>{piece.slice(2, -2)}</strong>)
    else nodes.push(<code key={`${keyPrefix}-c${index}`} className="qe-code">{piece.slice(1, -1)}</code>)
    index += 1
    last = match.index + piece.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

export function RichAnswer({ text }) {
  const lines = String(text).split('\n')
  return (
    <div className="qe-a">
      {lines.map((line, lineIndex) => (
        <div key={lineIndex} style={line === '' ? { height: 8 } : undefined}>
          {line === '' ? null : inlineNodes(line, lineIndex)}
        </div>
      ))}
    </div>
  )
}
