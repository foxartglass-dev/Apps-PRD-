import { z } from 'zod'
import { getAI } from './aiClient';
import { withTimeout } from './http';

export const RefineResp = z.object({
  sectionId: z.enum(['mission','users','scope','non_goals','success','milestones','risks']),
  md: z.string()
})
export type RefineRespT = z.infer<typeof RefineResp>

export async function apiRefineSection(input: { sectionId: RefineRespT['sectionId']; currentMd: string; brief: string }): Promise<RefineRespT> {
  const ai = await getAI();
  return withTimeout(() => ai.refineSection(input), 60000);
}
