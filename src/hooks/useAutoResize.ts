import { useEffect } from 'react'

export function resizeTextarea(el: HTMLTextAreaElement) {
  // Natural auto-resize: reset then grow to scrollHeight
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

export default function useAutoResize(selector = 'textarea.autoresize') {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLTextAreaElement>(selector))
    nodes.forEach((el) => {
      // initial pass
      resizeTextarea(el)
      // on input
      const onInput = () => resizeTextarea(el)
      el.addEventListener('input', onInput)
      // on font load / late paint reflow
      const ro = new ResizeObserver(() => resizeTextarea(el))
      ro.observe(el)

      // cleanup
      ;(el as any).__autoCleanup = () => {
        el.removeEventListener('input', onInput)
        ro.disconnect()
      }
    })

    return () => {
      nodes.forEach((el) => {
        const clean = (el as any).__autoCleanup as (() => void) | undefined
        if (clean) clean()
      })
    }
  }, [selector])
}
