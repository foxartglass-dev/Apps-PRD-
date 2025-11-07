import type { AgentOSDoc } from '../types/agentos'
import { EMPTY_DOC, normalizeDoc } from '../services/shape'

const KEY = 'prd_doc_v1'
const BRIEF_KEY = 'prd_brief_v1'
const SNAP_KEY = 'prd_snaps_v1'

export function saveLocal(doc: AgentOSDoc) {
  localStorage.setItem(KEY, JSON.stringify(doc))
  // Clean up old brief key after it's been migrated into the main doc
  if (localStorage.getItem(BRIEF_KEY)) {
    localStorage.removeItem(BRIEF_KEY);
  }
}

export function loadLocal(): AgentOSDoc {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY_DOC
    const parsed = JSON.parse(raw)
    const normalized = normalizeDoc(parsed)

    // For migration: if doc has no brief, check old brief key
    if (!normalized.brief) {
      const oldBrief = localStorage.getItem(BRIEF_KEY);
      if (oldBrief) normalized.brief = oldBrief;
    }
    return normalized;
  } catch (e) {
    console.warn('Failed to load project from localStorage, starting fresh.', e);
    return EMPTY_DOC
  }
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
    const t = localStorage.getItem(`${SNAP_KEY}:${id}`); 
    if (!t) return null;
    return normalizeDoc(JSON.parse(t));
  } catch { return null }
}