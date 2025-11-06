import type { AgentOSDoc } from '../types/agentos'
const KEY = 'prd_doc_v1'
const SNAP_KEY = 'prd_snaps_v1'

export function saveLocal(doc: AgentOSDoc) {
  localStorage.setItem(KEY, JSON.stringify(doc))
}

export function loadLocal(): AgentOSDoc | null {
  try { const t = localStorage.getItem(KEY); return t ? JSON.parse(t) : null } catch { return null }
}

export function listSnapshots(): { id: string; ts: number; title: string }[] {
  try {
    const t = localStorage.getItem(SNAP_KEY); return t ? JSON.parse(t) : []
  } catch { return [] }
}

export function saveSnapshot(doc: AgentOSDoc, title = 'Snapshot') {
  const snaps = listSnapshots()
  const id = crypto.randomUUID()
  snaps.unshift({ id, ts: Date.now(), title })
  localStorage.setItem(`${SNAP_KEY}:${id}`, JSON.stringify(doc))
  localStorage.setItem(SNAP_KEY, JSON.stringify(snaps.slice(0, 50)))
}

export function loadSnapshot(id: string): AgentOSDoc | null {
  try {
    const t = localStorage.getItem(`${SNAP_KEY}:${id}`); return t ? JSON.parse(t) : null
  } catch { return null }
}
