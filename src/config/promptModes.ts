export type SprinklePos = 'head' | 'middle' | 'tail'
export type TargetId = 'studio_frontend' | 'cloud_fullstack' | 'custom'

export type PromptMode = {
  id: TargetId
  label: string
  // Preamble (top of prompt)
  preamble: string
  // Enforcement line that forbids placeholders, forces wiring, and defines output format
  enforcement: string
  // Sprinkle instructions: where to repeat the enforcement; e.g. head + middle twice
  sprinkle: { positions: SprinklePos[]; repeatsPerMiddle?: number }
  // Connection points to include for the target (affects the body block)
  connectionPoints: {
    scaffoldBackendEndpoints?: boolean
    returnDiffSummary?: boolean
    returnFinalSrcTree?: boolean
    addFrontendWiringNotes?: boolean
    addBackendAttachmentStubs?: boolean
  }
  // Body template with tokens to fill (title, brief, etc.)
  bodyTemplate: string
  // Closing line(s)
  closing: string
}

export type PromptConfig = {
  activeModeId: TargetId
  modes: PromptMode[]
}

const LS_KEY = 'prompt.modes.v1'

const DEFAULT_MODES: PromptMode[] = [
  {
    id: 'studio_frontend',
    label: 'Google AI Studio (Frontend-only)',
    preamble:
`You are editing my React (Vite+TS) app *inside Google AI Studio*. Write COMPLETE, RUNNABLE code that compiles here. Use the project’s existing helpers as-is. Do not modify env/proxy. Do not invent files not referenced in the final tree.`,
    enforcement:
`**STRICT RULES — NO PLACEHOLDERS.** Do not leave stubs, TODOs, or pseudo-code. Fully wire UI state, handlers, and effects. Keep endpoints as connection points only (frontend-ready hooks), do not add real DB/auth. **Return only:** (1) a concise diff summary, and (2) the final src/ tree.`,
    sprinkle: { positions: ['head', 'middle', 'middle', 'tail'], repeatsPerMiddle: 2 },
    connectionPoints: {
      scaffoldBackendEndpoints: true,
      returnDiffSummary: true,
      returnFinalSrcTree: true,
      addFrontendWiringNotes: true,
      addBackendAttachmentStubs: true
    },
    bodyTemplate:
`**Target:** Google AI Studio (frontend-only). Build UI and client services; prepare clean connection points for backend (e.g., api client interfaces) without calling external secrets.

**Project Brief:** {{BRIEF}}

**Tasks:**
- Implement UI and handlers fully; show spinners/disable states; persist to local storage.
- Provide connection points for future backend: interface methods, typed payloads, clear folder paths.
- When generating code, replace entire files where requested. Ensure TypeScript has zero errors.
- Keep exports/imports aligned with current project.
`,
    closing:
`**Deliverables:** concise diff summary + final src/ tree only.`
  },
  {
    id: 'cloud_fullstack',
    label: 'Cloud Code (Fullstack)',
    preamble:
`You are editing a fullstack app for deployment (Vite React + Express). Code must compile locally and be deploy-ready.`,
    enforcement:
`**STRICT RULES — NO PLACEHOLDERS.** Fully wire endpoints, DB adapters (with proper env access), and UI calls. No stubs. Return only diff summary + final src tree.`,
    sprinkle: { positions: ['head', 'middle', 'tail'], repeatsPerMiddle: 1 },
    connectionPoints: {
      scaffoldBackendEndpoints: true,
      returnDiffSummary: true,
      returnFinalSrcTree: true,
      addFrontendWiringNotes: true,
      addBackendAttachmentStubs: false
    },
    bodyTemplate:
`**Target:** Cloud deployment (DigitalOcean) with future Supabase, Square, and Auth.
**Requirements:**
- Implement server endpoints and wire client services.
- Prepare env keys and health checks; do not expose secrets in browser.
- Provide migration-safe structures for future Supabase/Auth/Square.

**Project Brief:** {{BRIEF}}`,
    closing:
`**Deliverables:** diff summary + final src/ tree (no extra prose).`
  },
  {
    id: 'custom',
    label: 'Custom',
    preamble: 'You are editing my project. Write COMPLETE, RUNNABLE code.',
    enforcement:
'**NO PLACEHOLDERS**. Fully wired. Return diff summary + final src/ tree.',
    sprinkle: { positions: ['head'], repeatsPerMiddle: 0 },
    connectionPoints: { scaffoldBackendEndpoints: false, returnDiffSummary: true, returnFinalSrcTree: true, addFrontendWiringNotes: false, addBackendAttachmentStubs: false },
    bodyTemplate:
'**Project Brief:** {{BRIEF}}\n\n**Tasks:** {{TASKS}}',
    closing: 'Return diff summary + final src/ tree.'
  }
]

export function loadPromptConfig(): PromptConfig {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { activeModeId: 'studio_frontend', modes: DEFAULT_MODES }
}

export function savePromptConfig(next: PromptConfig) {
  localStorage.setItem(LS_KEY, JSON.stringify(next))
  return next
}

export function composePrompt(input: { mode: PromptMode; brief: string; extraTasks?: string }) {
  const { mode, brief, extraTasks } = input
  const head = [mode.preamble, mode.enforcement].join('\n\n')

  // Sprinkle enforcement per settings
  const middleChunks: string[] = []
  const middleRepeat = Math.max(0, mode.sprinkle.repeatsPerMiddle || 0)
  for (let i = 0; i < middleRepeat; i++) {
    middleChunks.push(mode.enforcement)
  }

  const body = mode.bodyTemplate
    .replace('{{BRIEF}}', brief || '(empty)')
    .replace('{{TASKS}}', extraTasks || '')

  const tail = [mode.closing, mode.sprinkle.positions.includes('tail') ? mode.enforcement : ''].filter(Boolean).join('\n\n')

  const parts: string[] = []
  if (mode.sprinkle.positions.includes('head')) parts.push(head)
  parts.push(body)
  if (mode.sprinkle.positions.includes('middle')) parts.push(middleChunks.join('\n\n'))
  parts.push(tail)

  return parts.filter(Boolean).join('\n\n')
}
