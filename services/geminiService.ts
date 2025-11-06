
import { GoogleGenAI, Type } from "@google/genai";
import { Product, Feature, IdeaChunk, PromptTemplates } from '../types';

let ai: GoogleGenAI | null = null;
const getAi = () => {
    if (!ai) {
        if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};

const cleanJsonString = (rawText: string): string => {
    const startIndex = rawText.indexOf('{');
    const endIndex = rawText.lastIndexOf('}');
    if (startIndex === -1 || endIndex === -1) {
        throw new Error("Invalid JSON response: No curly braces found.");
    }
    return rawText.substring(startIndex, endIndex + 1);
};


export const classifyBrainDump = async (
    product: Product,
    brainDumpText: string,
    prompts: PromptTemplates
) => {
    try {
        const aiInstance = getAi();
        const input = {
            product_context: {
                name: product.name,
                mission: product.mission || "",
                roadmap_mvp: product.roadmap?.mvp || "",
                roadmap_next: product.roadmap?.next || "",
                roadmap_later: product.roadmap?.later || "",
                tech_preferences: product.techPreferences || "",
            },
            feature_list: product.features.map(f => ({ id: f.id, name: f.name, summary: f.summary || "" })),
            brain_dump_text: brainDumpText,
        };
        
        const response = await aiInstance.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `INPUT JSON: ${JSON.stringify(input)}`,
            config: {
                systemInstruction: prompts.brainDumpPrompt,
                responseMimeType: "application/json",
            }
        });

        const rawJson = response.text.trim();
        return JSON.parse(rawJson);

    } catch (error) {
        console.error("Error classifying brain dump:", error);
        throw new Error("Failed to process brain dump. The model returned an unexpected response.");
    }
};

export const shapeFeatureSpec = async (
    product: Product,
    feature: Feature,
    relatedChunks: IdeaChunk[],
    prompts: PromptTemplates
) => {
    try {
        const aiInstance = getAi();
        const input = {
            product_context: {
                name: product.name,
                mission: product.mission || "",
                roadmap_mvp: product.roadmap?.mvp || "",
                roadmap_next: product.roadmap?.next || "",
                roadmap_later: product.roadmap?.later || "",
                tech_preferences: product.techPreferences || "",
            },
            feature: {
                id: feature.id,
                name: feature.name,
                current_shape_spec: feature.shapeSpec || "",
            },
            related_chunks: relatedChunks.map(c => ({ text: c.text, createdAt: c.createdAt })),
        };

        const response = await aiInstance.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `INPUT JSON: ${JSON.stringify(input)}`,
            config: {
                systemInstruction: prompts.featureShapePrompt,
                responseMimeType: "application/json"
            }
        });
        
        const rawJson = response.text.trim();
        return JSON.parse(rawJson);
    } catch (error) {
        console.error("Error shaping feature spec:", error);
        throw new Error("Failed to shape feature. The model returned an unexpected response.");
    }
};
