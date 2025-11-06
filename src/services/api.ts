import type { AgentOSDoc, BacklogItem, OutlineInput } from '../types/agentos'

export async function apiOutline(input: OutlineInput): Promise<AgentOSDoc> {
  const r = await fetch('/api/ai/outline', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input)
  })
  const j = await r.json()
  if (!r.ok) throw new Error(j?.error || 'outline failed')
  return j
}

export async function apiFeature(pitch: { title: string; context?: string; constraints?: string }): Promise<BacklogItem> {
  const r = await fetch('/api/ai/feature', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(pitch)
  })
  const j = await r.json()
  if (!r.ok) throw new Error(j?.error || 'feature failed')
  return j
}
