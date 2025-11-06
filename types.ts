
export interface AppState {
  products: Product[];
  prompts: PromptTemplates;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  summary?: string;
  mission?: string;
  targetUsers?: string;
  coreProblem?: string;
  roadmap?: {
    mvp?: string;
    next?: string;
    later?: string;
  };
  techPreferences?: string;
  features: Feature[];
  ideaChunks: IdeaChunk[];
  changeLog: string[];
  lastUpdated: string;
}

export interface Feature {
  id: string;
  productId: string;
  name: string;
  status: "draft" | "shaped";
  summary?: string;
  shapeSpec?: string;
  ideaChunkIds: string[];
  completeness?: number;
}

export interface IdeaChunk {
  id: string;
  productId: string;
  featureId?: string;
  title?: string;
  text: string;
  createdAt: string;
  tags?: string[];
}

export interface PromptTemplates {
  brainDumpPrompt: string;
  featureShapePrompt: string;
}
