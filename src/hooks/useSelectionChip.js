import React from 'react'
import { MAX_SELECTION, surroundingText } from '../selection.js'

/**
 * Tracks text selections anywhere in the transcript and exposes a chip anchor
 * ({ text, context, x, y }) for the latest eligible one, or null.
 * Selections inside the panel's own UI and inside editable fields are ignored.
 */
export function useSelectionChip() {
  const [chip, setChip] = React.useState(null)

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

  return [chip, setChip]
}
