/** Selection limits, mirrored by the Host's own validation. */
export const MAX_SELECTION = 1200
export const MAX_CONTEXT = 2000

/** The block of text a selection sits in, so the explainer sees local context. */
export function surroundingText(selection) {
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
