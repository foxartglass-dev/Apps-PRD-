export type RiceScore = { R: number; I: number; C: number; E: number; score: number }
export type Section = { id: string; title: string; md: string }
export type BacklogItem = {
  title: string;
  problem?: string;
  outcome?: string;
  acceptance: string[];
  rice?: RiceScore;
}
export type AgentOSDoc = { 
  brief: string;
  sections: Section[]; 
  backlog: BacklogItem[];
  features: { title: string; md: string; }[];
}
export type LinkHint = { label: string; url: string }
export type OutlineInput = { brief: string; links?: LinkHint[] }