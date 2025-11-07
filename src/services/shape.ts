import { z } from 'zod'

export const SectionId = z.enum(['mission','users','scope','non_goals','success','milestones','risks'])
export type SectionIdT = z.infer<typeof SectionId>

export const SectionArrayItem = z.object({
  id: SectionId,
  title: z.string().default(''),
  md: z.string().default(''),
})
export const SectionsArray = z.array(SectionArrayItem)

export const SectionObj = z.object({ md: z.string().default('') })
export const SectionsObject = z.object({
  mission: SectionObj.optional(),
  users: SectionObj.optional(),
  scope: SectionObj.optional(),
  non_goals: SectionObj.optional(),
  success: SectionObj.optional(),
  milestones: SectionObj.optional(),
  risks: SectionObj.optional(),
}).partial()

const titles: Record<SectionIdT,string> = {
  mission: 'Mission & Context',
  users: 'Target Users',
  scope: 'In-Scope',
  non_goals: 'Out of Scope',
  success: 'Success Metrics',
  milestones: 'Milestones',
  risks: 'Risks & Mitigations',
}

export function normalizeSections(input: unknown) {
  const a = SectionsArray.safeParse(input)
  if (a.success) return a.data
  const o = SectionsObject.safeParse(input)
  if (o.success) {
    const m = o.data
    return (Object.keys(titles) as SectionIdT[])
      .filter(k => m[k])
      .map(k => ({ id: k, title: titles[k], md: m[k]!.md || '' }))
  }
  throw new Error('Invalid sections shape')
}

export const BacklogItem = z.object({
  title: z.string(),
  problem: z.string().optional(),
  outcome: z.string().optional(),
  acceptance: z.array(z.string()).default([]),
  bucket: z.enum(['Now','Next','Later']).optional(),
  rice: z.object({ R:z.number(), I:z.number(), C:z.number(), E:z.number(), score:z.number() }).optional(),
})
export const BacklogArray = z.array(BacklogItem)

export const FeatureSpec = z.object({ title:z.string(), md:z.string().default('') })

export const ImportDoc = z.object({
  brief: z.string().default(''),
  sections: z.any(),
  backlog: BacklogArray.default([]),
  features: z.array(FeatureSpec).default([]),
})

export function normalizeDoc(raw: unknown) {
  const base = ImportDoc.parse(raw)
  const sections = normalizeSections(base.sections)
  return { brief: base.brief || '', sections, backlog: base.backlog || [], features: base.features || [] }
}

export const EMPTY_DOC = { brief: '', sections: [], backlog: [], features: [] }
