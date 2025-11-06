export type Section = { id: string; title: string; md: string }
export type BacklogItem = { title: string; problem?: string; outcome?: string; acceptance: string[] }
export type AgentOSDoc = { sections: Section[]; backlog: BacklogItem[] }
export type LinkHint = { label: string; url: string }
export type OutlineInput = { brief: string; links?: LinkHint[] }
