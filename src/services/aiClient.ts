import { loadConfig } from '../config/runtime';
import type { AgentOSDoc, BacklogItem, OutlineInput } from '../types/agentos';
import { AGENT_OS_SECTION_LIST } from '../constants/agentOSSections';

export type OutlineResp = AgentOSDoc;
export type FeatureResp = BacklogItem;
export type RefineResp = { sectionId: 'mission'|'users'|'scope'|'non_goals'|'success'|'milestones'|'risks'; md: string };
export type RiceResp = { R:number; I:number; C:number; E:number; score:number };

type AIClient = {
  outline(input: OutlineInput): Promise<OutlineResp>
  feature(title: string, brief: string): Promise<FeatureResp>
  refineSection(input: { sectionId: RefineResp['sectionId']; currentMd: string; brief: string }): Promise<RefineResp>
  rice(input: { title: string; context?: string }): Promise<RiceResp>
}

// Module-scope variable for diagnostics
let lastCallDetails: { rawText?: string; parseError?: string } = {};

export function getLastCallDetails() {
  return lastCallDetails;
}

// --- Server Backend ---
const serverBackend: AIClient = {
  async outline(input: OutlineInput): Promise<OutlineResp> {
    const r = await fetch('/api/ai/outline', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input)
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || 'outline failed');
    return j;
  },
  async feature(title: string, brief: string): Promise<FeatureResp> {
    const r = await fetch('/api/ai/feature', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title, context: brief })
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || 'feature failed');
    return j;
  },
  async refineSection(input): Promise<RefineResp> {
    const r = await fetch('/api/ai/refineSection', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input)
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || 'refine failed');
    return j;
  },
  async rice(input): Promise<RiceResp> {
    const r = await fetch('/api/ai/rice', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input)
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j?.error || 'rice failed');
    return j;
  }
};

// --- Studio Backend ---
const SYS_OUTLINE = `You output STRICT JSON (no prose) for an Agent-OS style PRD.
Shape:
{
  "sections":[{"id":"mission","title":"Mission","md":"..."} ...],
  "backlog":[{"title":"...","problem":"...","outcome":"...","acceptance":["Given...When...Then..."]}]
}
Rules:
- IDs: mission, users, scope, non_goals, success, milestones, risks.
- Put content in Markdown in "md". No YAML/frontmatter. No code fences in values.
- Be concise; use bullets; add TODOs if info is missing.`;

const SYS_FEATURE = `You output STRICT JSON for a feature mini-spec.
Shape:
{
  "title":"...",
  "problem":"...",
  "outcome":"...",
  "acceptance":["Given...When...Then..."]
}
Keep 3–6 clear acceptance bullets.`;

const SYS_REFINE = `You rewrite ONE section of an Agent-OS PRD.
Input: { "sectionId":"scope","currentMd":"...","brief":"..." }
Return STRICT JSON ONLY: { "sectionId":"scope","md":"<improved markdown>" }
Rules: concise bullets, preserve intent, no prose outside JSON.`;

const SYS_RICE = `Given a feature and context, estimate RICE.
Return JSON only: { "R":1|2|3|4|5, "I":1|2|3, "C":0.5|0.8|1.0, "E":1|2|3|4|5, "score": number }
Score = (R*I*C)/E rounded to 1 decimal.`;


function parseJson(text: string) {
    lastCallDetails = { rawText: text, parseError: undefined }; // Reset on new attempt
    try {
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
            return JSON.parse(text.substring(firstBrace, lastBrace + 1));
        }
        throw new Error("No JSON object found in response");
    } catch (e: any) {
        const m = text.match(/```json\s*([\s\S]*?)```/i);
        if (m) {
            try {
                return JSON.parse(m[1]);
            } catch (e2: any) {
                // Fall through to final error
            }
        }
        
        const parseError = e.message || 'Unknown parsing error';
        lastCallDetails.parseError = parseError;
        const error: any = new Error(`Failed to parse JSON response. ${parseError}`);
        error.name = 'ParseError';
        error.rawText = text;
        throw error;
    }
}

const getStudioRuntime = () => {
    const gm = (globalThis as any)?.google?.ai?.generativeLanguage ?? (globalThis as any)?.ai;
    if (!gm) {
        throw new Error('Studio runtime not available in this environment.');
    }
    if (!gm.models?.generateContent) {
        throw new Error('Studio runtime does not have the expected `models.generateContent` method.');
    }
    return gm;
};

const studioBackend: AIClient = {
    async outline(input: OutlineInput): Promise<OutlineResp> {
        const runtime = getStudioRuntime();
        const config = loadConfig();
        const prompt = `User Input:
${JSON.stringify({ brief: input.brief, links: input.links, requiredSections: AGENT_OS_SECTION_LIST.map(s => s.id) }, null, 2)}

Return JSON now.`;
        
        const modelConfig: any = { systemInstruction: SYS_OUTLINE, responseMimeType: 'application/json' };
        if (config.temperature !== undefined) modelConfig.temperature = config.temperature;
        if (config.maxTokens !== undefined) modelConfig.maxOutputTokens = config.maxTokens;
        
        const resp = await runtime.models.generateContent({
            model: config.modelId || 'gemini-2.5-flash',
            contents: prompt,
            config: modelConfig
        });
        return parseJson(resp.text);
    },
    async feature(title: string, brief: string): Promise<FeatureResp> {
        const runtime = getStudioRuntime();
        const config = loadConfig();
        const prompt = `Feature Pitch:
${JSON.stringify({ title, context: brief }, null, 2)}

Return JSON now.`;
        const modelConfig: any = { systemInstruction: SYS_FEATURE, responseMimeType: 'application/json' };
        if (config.temperature !== undefined) modelConfig.temperature = config.temperature;
        if (config.maxTokens !== undefined) modelConfig.maxOutputTokens = config.maxTokens;

        const resp = await runtime.models.generateContent({
            model: config.modelId || 'gemini-2.5-flash',
            contents: prompt,
            config: modelConfig
        });
        return parseJson(resp.text);
    },
    async refineSection(input): Promise<RefineResp> {
        const runtime = getStudioRuntime();
        const config = loadConfig();
        const prompt = `Input:\n${JSON.stringify(input, null, 2)}\n\nReturn JSON now.`;
        const modelConfig: any = { systemInstruction: SYS_REFINE, responseMimeType: 'application/json' };
        if (config.temperature !== undefined) modelConfig.temperature = config.temperature;
        if (config.maxTokens !== undefined) modelConfig.maxOutputTokens = config.maxTokens;

        const resp = await runtime.models.generateContent({
            model: config.modelId || 'gemini-2.5-flash',
            contents: prompt,
            config: modelConfig
        });
        return parseJson(resp.text);
    },
    async rice(input): Promise<RiceResp> {
        const runtime = getStudioRuntime();
        const config = loadConfig();
        const prompt = `Feature: ${input.title}\nContext: ${input.context ?? ''}`;
        const modelConfig: any = { systemInstruction: SYS_RICE, responseMimeType: 'application/json' };
        if (config.temperature !== undefined) modelConfig.temperature = config.temperature;
        if (config.maxTokens !== undefined) modelConfig.maxOutputTokens = config.maxTokens;

        const resp = await runtime.models.generateContent({
            model: config.modelId || 'gemini-2.5-flash',
            contents: prompt,
            config: modelConfig
        });
        return parseJson(resp.text);
    }
};

let client: AIClient | null = null;

export async function getAI(): Promise<AIClient> {
    // Re-evaluate every time in case Studio Mode was toggled
    const config = loadConfig();
    client = config.studioMode ? studioBackend : serverBackend;
    return client;
}