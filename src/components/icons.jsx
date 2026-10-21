import React from 'react'
// Custom sparkle glyphs, matching the plugin icon (see icon.svg); inherit the button's color.
export function SparkleIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor" aria-hidden={true}
      style={{ display: 'block', flex: '0 0 auto' }}>
      <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
      <path d="M20 1.6c.45 2.1 1.05 2.7 3.15 3.15-2.1.45-2.7 1.05-3.15 3.15-.45-2.1-1.05-2.7-3.15-3.15 2.1-.45 2.7-1.05 3.15-3.15z" />
      <circle cx={4.6} cy={19.4} r={2.2} />
    </svg>
  )
}

/** Up-arrow send button, matching the composer's circular button in DSH. */
export function SendIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </svg>
  )
}

export function CloseIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden={true}
      style={{ display: 'block' }}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}
