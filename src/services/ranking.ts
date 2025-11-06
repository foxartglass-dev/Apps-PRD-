import { z } from 'zod'

export const RiceReq = z.object({ title: z.string(), context: z.string().optional() })
export const RiceResp = z.object({ R: z.number(), I: z.number(), C: z.number(), E: z.number(), score: z.number() })
export type RiceRespT = z.infer<typeof RiceResp>

export async function apiRice(input: { title: string; context?: string }): Promise<RiceRespT> {
  const r = await fetch('/api/ai/rice', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input)
  })
  const j = await r.json()
  if (!r.ok) throw new Error(j?.error || 'rice failed')
  return RiceResp.parse(j)
}
