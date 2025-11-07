import { z } from 'zod'
import { getAI } from './aiClient';
import { withTimeout } from './http';

export const RiceReq = z.object({ title: z.string(), context: z.string().optional() })
export const RiceResp = z.object({ R: z.number(), I: z.number(), C: z.number(), E: z.number(), score: z.number() })
export type RiceRespT = z.infer<typeof RiceResp>

export async function apiRice(input: { title: string; context?: string }): Promise<RiceRespT> {
  const ai = await getAI();
  return withTimeout(() => ai.rice(input), 30000);
}
