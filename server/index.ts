import 'dotenv/config'
// Fix: Import express default export and Request/Response types to resolve type errors.
import express, { Request, Response } from 'express'
import cors from 'cors'
import { z } from 'zod'
// Fix: Update to the new Gemini SDK and types.
import { GoogleGenAI } from '@google/genai'

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

// Contracts
const Section = z.object({ id: z.string(), title: z.string(), md: z.string() })
const BacklogItem = z.object({
  title: z.string(),
  problem: z.string().optional(),
  outcome: z.string().optional(),
  acceptance: z.array(z.string()).default([])
})
const AgentOSDoc = z.object({
  sections: z.array(Section),
  backlog: z.array(BacklogItem).default([])
})

const InputOutline = z.object({
  brief: z.string().min(10, 'Brief must be at least 10 chars'),
  links: z.array(z.object({ label: z.string(), url: z.string().url() })).default([])
})

const InputFeature = z.object({
  title: z.string().min(3),
  context: z.string().optional(),
  constraints: z.string().optional()
})

const SECTIONS = [
  { id: 'mission', title: 'Mission' },
  { id: 'users', title: 'Users & Jobs' },
  { id: 'scope', title: 'Scope' },
  { id: 'non_goals', title: 'Non-Goals' },
  { id: 'success', title: 'Success Criteria' },
  { id: 'milestones', title: 'Milestones' },
  { id: 'risks', title: 'Risks & Mitigations' }
] as const

const SYS_OUTLINE = `You output STRICT JSON (no prose) for an Agent-OS style PRD.
Shape:
{
  "sections":[{"id":"mission","title":"Mission","md":"..."} ...],
  "backlog":[{"title":"...","problem":"...","outcome":"...","acceptance":["Given...When...Then..."]}]
}
Rules:
- IDs: mission, users, scope, non_goals, success, milestones, risks.
- Put content in Markdown in "md". No YAML/frontmatter. No code fences in values.
- Be concise; use bullets; add TODOs if info is missing.`

const SYS_FEATURE = `You output STRICT JSON for a feature mini-spec.
Shape:
{
  "title":"...",
  "problem":"...",
  "outcome":"...",
  "acceptance":["Given...When...Then..."]
}
Keep 3–6 clear acceptance bullets.`

// Fix: Update Gemini API initialization and usage according to new SDK guidelines.
if (!process.env.API_KEY) {
  throw new Error('API_KEY environment variable not set');
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
// Fix: Use recommended model, as gemini-1.5-flash is deprecated.
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

function parseJson(text: string) {
  try { return JSON.parse(text) } catch {
    const m = text.match(/```json\s*([\s\S]*?)```/i)
    if (!m) throw new Error('Model did not return JSON')
    return JSON.parse(m[1])
  }
}

// Fix: Add explicit Request and Response types to handlers.
app.post('/api/ai/outline', async (req: Request, res: Response) => {
  try {
    const { brief, links } = InputOutline.parse(req.body)
    const prompt = `User Input:
${JSON.stringify({ brief, links, requiredSections: SECTIONS.map(s=>s.id) }, null, 2)}

Return JSON now.`
    // Fix: Use updated generateContent call.
    const resp = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: SYS_OUTLINE,
        responseMimeType: 'application/json'
      }
    })
    // Fix: Use `response.text` to get the text response.
    const json = parseJson(resp.text)
    const parsed = AgentOSDoc.parse(json)
    const normalized = {
      sections: SECTIONS.map(s => {
        const found = parsed.sections.find(x => x.id === s.id)
        return { id: s.id, title: s.title, md: found?.md || '' }
      }),
      backlog: parsed.backlog
    }
    res.json(normalized)
  } catch (e:any) {
    res.status(400).json({ error: e.message || 'outline failed' })
  }
})

// Fix: Add explicit Request and Response types to handlers.
app.post('/api/ai/feature', async (req: Request, res: Response) => {
  try {
    const { title, context, constraints } = InputFeature.parse(req.body)
    const prompt = `Feature Pitch:
${JSON.stringify({ title, context, constraints }, null, 2)}

Return JSON now.`
    // Fix: Use updated generateContent call.
    const resp = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: SYS_FEATURE,
        responseMimeType: 'application/json'
      }
    })
    // Fix: Use `response.text` to get the text response.
    const json = parseJson(resp.text)
    const safe = BacklogItem.parse(json)
    res.json(safe)
  } catch (e:any) {
    res.status(400).json({ error: e.message || 'feature failed' })
  }
})

const RefineInput = z.object({
  sectionId: z.enum(['mission','users','scope','non_goals','success','milestones','risks']),
  currentMd: z.string().default(''),
  brief: z.string().default('')
})

const SYS_REFINE = `You rewrite ONE section of an Agent-OS PRD.
Input: { "sectionId":"scope","currentMd":"...","brief":"..." }
Return STRICT JSON ONLY: { "sectionId":"scope","md":"<improved markdown>" }
Rules: concise bullets, preserve intent, no prose outside JSON.`

app.post('/api/ai/refineSection', async (req: Request, res: Response) => {
  try {
    const { sectionId, currentMd, brief } = RefineInput.parse(req.body)
    const prompt = `Input:\n${JSON.stringify({ sectionId, currentMd, brief }, null, 2)}\n\nReturn JSON now.`
    // Fix: Use updated generateContent call.
    const resp = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: SYS_REFINE,
        responseMimeType: 'application/json'
      }
    })
    // Fix: Use `response.text` to get the text response.
    const json = parseJson(resp.text)
    const out = z.object({ sectionId: RefineInput.shape.sectionId, md: z.string() }).parse(json)
    res.json(out)
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'refine failed' })
  }
})

const RiceInput = z.object({
  title: z.string(),
  context: z.string().optional()
})

const RiceResp = z.object({
  R: z.number(),
  I: z.number(),
  C: z.number(),
  E: z.number(),
  score: z.number()
})

const SYS_RICE = `Given a feature and context, estimate RICE.
Return JSON only: { "R":1|2|3|4|5, "I":1|2|3, "C":0.5|0.8|1.0, "E":1|2|3|4|5, "score": number }
Score = (R*I*C)/E rounded to 1 decimal.`

// Fix: Add explicit Request and Response types to handlers.
app.post('/api/ai/rice', async (req: Request, res: Response) => {
  try {
    const { title, context } = RiceInput.parse(req.body)
    const prompt = `Feature: ${title}\nContext: ${context ?? ''}`
    // Fix: Use updated generateContent call.
    const resp = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        systemInstruction: SYS_RICE,
        responseMimeType: 'application/json'
      }
    })
    // Fix: Use `response.text` to get the text response.
    const json = parseJson(resp.text)
    const out = RiceResp.parse(json)
    res.json(out)
  } catch (e: any) {
    res.status(400).json({ error: e.message || 'rice failed' })
  }
})

app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const resp = await ai.models.generateContent({model: modelName, contents: 'pong'})
    const text = resp.text ?? ''
    res.json({
      ok: true,
      model: modelName,
      sample: (text || 'ok').slice(0, 20),
      configured: {
        supabase: !!process.env.VITE_SUPABASE_URL && !!process.env.VITE_SUPABASE_ANON_KEY,
        square: !!process.env.VITE_SQUARE_APP_ID && !!process.env.VITE_SQUARE_LOCATION_ID,
        authGoogle: !!process.env.VITE_AUTH_GOOGLE_CLIENT_ID && !!process.env.VITE_AUTH_GOOGLE_CLIENT_SECRET,
        authEmail: process.env.VITE_AUTH_EMAIL_ENABLED === '1'
      }
    })
  } catch (e:any) {
    res.status(500).json({ ok: false, error: e?.message || 'health failed' })
  }
})

const port = process.env.PORT || 8787
app.listen(port, () => console.log(`API listening on http://localhost:${port}`),)
