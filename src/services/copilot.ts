import { PromptMode } from '../config/promptModes';

const getStudioRuntime = () => {
    const gm = (globalThis as any)?.google?.ai?.generativeLanguage ?? (globalThis as any)?.ai;
    if (!gm?.models?.generateContent) {
        throw new Error('Studio runtime not available or invalid in this environment.');
    }
    return gm;
};

export class CopilotParseError extends Error {
  public rawText?: string;
  constructor(message: string, rawText?: string) {
    super(message);
    this.name = 'CopilotParseError';
    this.rawText = rawText;
  }
}

const SYSTEM_PROMPT = `You are an AI assistant that edits a JSON object representing a prompt generation configuration.
The user will provide the current JSON object and a natural language instruction for how to change it.
You MUST respond with a STRICT JSON object with NO PROSE, MARKDOWN, OR EXPLANATION.

Your output shape MUST be:
{
  "updatedModeJson": "<stringified JSON of the modified PromptMode object>",
  "notes": "<short summary of changes made, as bullet points in a single string>"
}

RULES:
- The "updatedModeJson" value MUST be a valid JSON string that can be parsed back into a PromptMode object.
- Do not add, remove, or rename any top-level keys from the original PromptMode object.
- The "notes" should be a concise summary of what you changed.
`;

export async function runCopilot(input: {
  modeJson: string;
  instruction: string;
}): Promise<{ updatedMode: PromptMode; notes: string }> {
  const { modeJson, instruction } = input;
  const runtime = getStudioRuntime();

  const userPrompt = `Current PromptMode JSON:
\`\`\`json
${modeJson}
\`\`\`

Instruction: "${instruction}"

Return the updated JSON object now.`;

  const resp = await runtime.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: userPrompt,
    config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        maxOutputTokens: 4096,
    },
  });

  const rawText = resp.text;
  let parsedResponse: any;

  try {
    parsedResponse = JSON.parse(rawText);
  } catch (e) {
    throw new CopilotParseError(`Model returned invalid JSON.`, rawText);
  }

  if (!parsedResponse.updatedModeJson || typeof parsedResponse.updatedModeJson !== 'string') {
    throw new CopilotParseError(`Model response is missing 'updatedModeJson' string.`, rawText);
  }

  let updatedMode: PromptMode;
  try {
    updatedMode = JSON.parse(parsedResponse.updatedModeJson);
  } catch (e) {
    throw new CopilotParseError(`'updatedModeJson' could not be parsed into a valid object.`, rawText);
  }
  
  try {
    const originalMode = JSON.parse(modeJson);
    const originalKeys = Object.keys(originalMode).sort();
    const newKeys = Object.keys(updatedMode).sort();
    if (JSON.stringify(originalKeys) !== JSON.stringify(newKeys)) {
        throw new Error('Key mismatch between original and updated mode.');
    }
  } catch(e: any) {
      throw new CopilotParseError(e.message || 'The updated mode has a different structure than the original.', parsedResponse.updatedModeJson);
  }

  return {
    updatedMode,
    notes: parsedResponse.notes || "No notes provided.",
  };
}
