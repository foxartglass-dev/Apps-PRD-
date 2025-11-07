import React from 'react'

export default function FabScrollBottom() {
  function scrollBottom() {
    const target = document.getElementById('combined-export-anchor') || document.body
    const top = target === document.body ? document.body.scrollHeight : target.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <button
      aria-label="Scroll to bottom"
      onClick={scrollBottom}
      style={{
        position: 'fixed',
        right: '16px',
        bottom: '16px',
        zIndex: 9999,
        padding: '10px 12px',
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.2)',
        background: 'linear-gradient(180deg,#3b82f6,#2563eb)',
        color: '#fff',
        boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
        cursor: 'pointer',
        fontWeight: 600,
      }}
      title="Scroll to bottom"
    >
      ↓ Bottom
    </button>
  )
}
