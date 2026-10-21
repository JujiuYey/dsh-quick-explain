import React from 'react'

/** Follow the language DSH itself applies to <html lang>, not the OS default. */
export function useIsZh() {
  const read = () => String(document.documentElement.lang || navigator.language || '')
    .toLowerCase()
    .startsWith('zh')
  const [isZh, setIsZh] = React.useState(read)
  React.useEffect(() => {
    const observer = new MutationObserver(() => setIsZh(read()))
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
    return () => observer.disconnect()
  }, [])
  return isZh
}
