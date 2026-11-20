import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const isVertexMode = () =>
  process.env.USE_VERTEX_AI === "true" ||
  Boolean(process.env.GOOGLE_CLOUD_PROJECT) ||
  Boolean(process.env.VERTEX_API_KEY);

function getModelList(override?: string): string[] {
  const base = isVertexMode()
    ? ["gemini-2.5-flash", "gemini-3.5-flash-lite", "gemini-3.5-flash"]
    : ["gemini-3.5-flash-lite", "gemini-3.5-flash", "gemini-3.8-flash"];

  const list = [
    ...(override ? [override] : []),
    ...(process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []),
    ...base,
  ];
  return [...new Set(list)];
}

const CALL_TIMEOUT_MS = 25_000;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (client) return client;

  if (isVertexMode()) {
    const vertexApiKey = process.env.VERTEX_API_KEY?.trim();
    if (vertexApiKey) {
      client = new GoogleGenAI({ vertexai: true, apiKey: vertexApiKey });
      return client;
    }
    const project = process.env.GOOGLE_CLOUD_PROJECT?.trim();
    const location = process.env.GOOGLE_CLOUD_LOCATION?.trim() || "global";
    client = new GoogleGenAI({ vertexai: true, project, location });
    return client;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Set GEMINI_API_KEY or GOOGLE_CLOUD_PROJECT (Vertex AI) in .env");
  }
  client = new GoogleGenAI({ apiKey });
  return client;
}

export function isGeminiConfigured(): boolean {
  return Boolean(
    process.env.GEMINI_API_KEY?.trim() ||
      process.env.VERTEX_API_KEY?.trim() ||
      process.env.GOOGLE_CLOUD_PROJECT?.trim() ||
      process.env.USE_VERTEX_AI === "true",
  );
}

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("TIMEOUT")
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT after ${ms}ms`)), ms),
    ),
  ]);
}

export interface GenerateJsonOptions<T extends z.ZodTypeAny> {
  system: string;
  prompt: string;
  schema: T;
  model?: string;
  temperature?: number;
  maxRetries?: number;
}

/**
 * Calls Gemini (via Vertex AI when GOOGLE_CLOUD_PROJECT/USE_VERTEX_AI is set,
 * or AI Studio via GEMINI_API_KEY) with JSON schema enforcement and Zod validation.
 */
export async function generateJson<T extends z.ZodTypeAny>({
  system,
  prompt,
  schema,
  model,
  temperature = 0.4,
  maxRetries = 2,
}: GenerateJsonOptions<T>): Promise<z.infer<T>> {
  const ai = getClient();
  const responseJsonSchema = z.toJSONSchema(schema);
  const modelsToTry = getModelList(model);
  let currentPrompt = prompt;
  let lastError = "Unknown error";

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response;
    let lastApiErr: unknown;

    for (const candidateModel of modelsToTry) {
      try {
        response = await withTimeout(
          ai.models.generateContent({
            model: candidateModel,
            contents: currentPrompt,
            config: {
              systemInstruction: system,
              responseMimeType: "application/json",
              responseJsonSchema,
              temperature,
            },
          }),
          CALL_TIMEOUT_MS,
        );
        lastApiErr = undefined;
        break;
      } catch (err) {
        lastApiErr = err;
        if (isTransientError(err)) {
          await sleep(400);
          continue;
        }
        throw err;
      }
    }

    if (lastApiErr) {
      throw lastApiErr;
    }

    const text = response?.text?.trim() ?? "";
    try {
      const parsed = JSON.parse(text);
      const result = schema.safeParse(parsed);
      if (result.success) {
        return result.data;
      }
      lastError = result.error.issues
        .map((i) => `${i.path.join(".") || "root"}: ${i.message}`)
        .join("; ");
    } catch (e) {
      lastError = `Invalid JSON: ${(e as Error).message}`;
    }

    currentPrompt = `${prompt}\n\nYour previous response failed validation:\n${lastError}\nFix these exact issues and return valid JSON.`;
  }

  throw new Error(`Gemini output failed validation after ${maxRetries + 1} attempts: ${lastError}`);
}
