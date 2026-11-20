import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const DEFAULT_MODELS = [
  ...(process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : []),
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
];

const CALL_TIMEOUT_MS = 25_000;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in .env");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }
  return client;
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
 * Calls Gemini with JSON schema enforcement, a per-call timeout, Zod validation,
 * and automatic fallback across Flash models on 503/429/timeout.
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
  const modelsToTry = model
    ? [model, ...DEFAULT_MODELS.filter((m) => m !== model)]
    : [...new Set(DEFAULT_MODELS)];
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
