import type { AgentOSDoc, BacklogItem, OutlineInput } from '../types/agentos'
import { getAI } from './aiClient';
import { withTimeout } from './http';

export async function apiOutline(input: OutlineInput): Promise<AgentOSDoc> {
  const ai = await getAI();
  return withTimeout(() => ai.outline(input), 120000);
}

export async function apiFeature(pitch: { title: string; context?: string; constraints?: string }): Promise<BacklogItem> {
  const ai = await getAI();
  return withTimeout(() => ai.feature(pitch.title, pitch.context || ''), 60000);
}
