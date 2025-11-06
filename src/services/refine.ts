import { z } from 'zod'

export const RefineResp = z.object({
  sectionId: z.enum(['mission','users','scope','non_goals','success','milestones','risks']),
  md: z.string()
})
export type RefineRespT = z.infer<typeof RefineResp>

export async function apiRefineSection(input: { sectionId: RefineRespT['sectionId']; currentMd: string; brief: string }): Promise<RefineRespT> {
  const r = await fetch('/api/ai/refineSection', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input)
  })
  const j = await r.json()
  if (!r.ok) throw new Error(j?.error || 'refine failed')
  return RefineResp.parse(j)
}