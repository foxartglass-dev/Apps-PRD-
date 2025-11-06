import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { z } from 'zod'
import { GoogleGenerativeAI } from '@google/generative-ai'

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

function model() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('Missing GEMINI_API_KEY')
  const genAI = new GoogleGenerativeAI(key)
  return genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' })
}

function parseJson(text: string) {
  try { return JSON.parse(text) } catch {
    const m = text.match(/```json\\s*([\\s\\S]*?)```/i)
    if (!m) throw new Error('Model did not return JSON')
    return JSON.parse(m[1])
  }
}

app.post('/api/ai/outline', async (req, res) => {
  try {
    const { brief, links } = InputOutline.parse(req.body)
    const prompt = `${SYS_OUTLINE}

User Input:
${JSON.stringify({ brief, links, requiredSections: SECTIONS.map(s=>s.id) }, null, 2)}

Return JSON now.`
    const resp = await model().generateContent(prompt)
    const json = parseJson(resp.response.text())
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

app.post('/api/ai/feature', async (req, res) => {
  try {
    const { title, context, constraints } = InputFeature.parse(req.body)
    const prompt = `${SYS_FEATURE}

Feature Pitch:
${JSON.stringify({ title, context, constraints }, null, 2)}

Return JSON now.`
    const resp = await model().generateContent(prompt)
    const json = parseJson(resp.response.text())
    const safe = BacklogItem.parse(json)
    res.json(safe)
  } catch (e:any) {
    res.status(400).json({ error: e.message || 'feature failed' })
  }
})

const port = process.env.PORT || 8787
app.listen(port, () => console.log(\`API listening on http://localhost:\${port}\`))