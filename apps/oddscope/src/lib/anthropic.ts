import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "./env";
import {
  analysisSchema,
  extractionSchema,
  type ExtractionResult,
  type ModelAnalysis,
} from "./schemas";
import { parseLooseJson } from "./json";
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildAnalysisPrompt,
  buildAnalysisUserMessage,
} from "./prompts";

/**
 * The analysis pipeline.
 *
 * Two sequential calls: one that reads the screenshot and does nothing else,
 * and one that researches the fixture and prices it. They are kept separate on
 * purpose — a model asked to transcribe and reason in one pass will quietly
 * round an odd to fit its argument.
 *
 * Every call in this file runs server-side. The API key is read through env,
 * which is `server-only`, so importing any of this into a client component is
 * a build error rather than a leak.
 */

let cachedClient: Anthropic | null = null;

function client(): Anthropic {
  if (!cachedClient) {
    cachedClient = new Anthropic({
      apiKey: env.anthropicApiKey,
      maxRetries: 2,
      timeout: 5 * 60 * 1000,
    });
  }
  return cachedClient;
}

/** Failures we can explain to a user, as opposed to a stack trace. */
export class PipelineError extends Error {
  constructor(
    message: string,
    readonly stage: "extraction" | "analysis",
    readonly retryable = true,
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

export type ProgressStage = "reading" | "identifying" | "researching" | "calculating";

export { parseLooseJson };

const MAX_PAUSE_CONTINUATIONS = 4;

function textOf(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");
}

/** Split a data URL into the media type and bare base64 the API expects. */
function decodeDataUrl(dataUrl: string): { mediaType: string; data: string } {
  const match = /^data:(image\/[a-zA-Z+]+);base64,(.+)$/.exec(dataUrl);
  if (!match) {
    throw new PipelineError(
      "That file did not arrive as a readable image. Try uploading it again.",
      "extraction",
      false,
    );
  }
  const declared = match[1].toLowerCase();
  // The API names it image/jpeg; browsers and phones both emit image/jpg.
  const mediaType = declared === "image/jpg" ? "image/jpeg" : declared;
  return { mediaType, data: match[2] };
}

// ---------------------------------------------------------------------------
// Call 1 — extraction
// ---------------------------------------------------------------------------

export async function extractOdds(imageDataUrl: string): Promise<ExtractionResult> {
  const { mediaType, data } = decodeDataUrl(imageDataUrl);

  const run = async (): Promise<ExtractionResult> => {
    const message = await client().messages.create({
      model: env.anthropicModel,
      max_tokens: 8000,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/png" | "image/jpeg" | "image/webp",
                data,
              },
            },
            {
              type: "text",
              text: "Read every legible odd in this screenshot and return the JSON.",
            },
          ],
        },
      ],
    });

    if (message.stop_reason === "refusal") {
      throw new PipelineError(
        "The screenshot could not be processed. Try a different image.",
        "extraction",
        false,
      );
    }

    const parsed = extractionSchema.safeParse(parseLooseJson(textOf(message)));
    if (!parsed.success) {
      throw new SyntaxError("Extraction JSON did not match the expected shape.");
    }
    return parsed.data;
  };

  // One retry: malformed JSON from a model is usually not reproducible.
  try {
    return await run();
  } catch (error) {
    if (error instanceof PipelineError) throw error;
    try {
      return await run();
    } catch (retryError) {
      throw toPipelineError(retryError, "extraction");
    }
  }
}

// ---------------------------------------------------------------------------
// Call 2 — enrichment and analysis
// ---------------------------------------------------------------------------

export async function analyzeMatch(input: {
  extraction: unknown;
  notes?: string | null;
  onProgress?: (stage: ProgressStage) => void;
}): Promise<ModelAnalysis> {
  const userMessage = buildAnalysisUserMessage({
    extraction: input.extraction,
    notes: input.notes,
  });

  const run = async (): Promise<ModelAnalysis> => {
    const message = await streamWithWebSearch(userMessage, input.onProgress);

    if (message.stop_reason === "refusal") {
      throw new PipelineError(
        "The analysis could not be completed for this match.",
        "analysis",
        false,
      );
    }

    const parsed = analysisSchema.safeParse(parseLooseJson(textOf(message)));
    if (!parsed.success) {
      throw new SyntaxError("Analysis JSON did not match the expected shape.");
    }
    return parsed.data;
  };

  try {
    return await run();
  } catch (error) {
    if (error instanceof PipelineError) throw error;
    try {
      return await run();
    } catch (retryError) {
      throw toPipelineError(retryError, "analysis");
    }
  }
}

/**
 * Stream one analysis turn, resuming through `pause_turn`.
 *
 * Server-side tools run inside a sampling loop with its own iteration cap. When
 * that cap is reached the turn comes back paused rather than finished; sending
 * the conversation straight back resumes it. No extra user message is added —
 * the trailing server_tool_use block is what tells the API to continue.
 */
async function streamWithWebSearch(
  userMessage: string,
  onProgress?: (stage: ProgressStage) => void,
): Promise<Anthropic.Message> {
  const webSearchTool = {
    type: env.anthropicWebSearchTool,
    name: "web_search",
    max_uses: 8,
  } as unknown as Anthropic.ToolUnion;

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMessage }];

  let announcedResearch = false;
  let announcedCalculating = false;

  for (let attempt = 0; attempt <= MAX_PAUSE_CONTINUATIONS; attempt += 1) {
    const stream = client().messages.stream({
      model: env.anthropicModel,
      max_tokens: 32_000,
      system: buildAnalysisPrompt(),
      // Adaptive thinking: the model decides how much reasoning this fixture
      // needs. budget_tokens is deprecated on this model generation.
      thinking: { type: "adaptive" },
      tools: [webSearchTool],
      messages,
    });

    // Progress is derived from what the model is actually doing, not a timer.
    // A search starting means research; the first text block means the search
    // phase is over and it is writing the priced answer.
    stream.on("streamEvent", (event) => {
      if (event.type !== "content_block_start") return;
      const block = event.content_block;
      if (block.type === "server_tool_use" && !announcedResearch) {
        announcedResearch = true;
        onProgress?.("researching");
      } else if (block.type === "text" && !announcedCalculating) {
        announcedCalculating = true;
        onProgress?.("calculating");
      }
    });

    const message = await stream.finalMessage();

    if (message.stop_reason !== "pause_turn") return message;

    messages.push({ role: "assistant", content: message.content });
  }

  throw new PipelineError(
    "The analysis ran longer than expected. Try again in a moment.",
    "analysis",
  );
}

// ---------------------------------------------------------------------------

function toPipelineError(
  error: unknown,
  stage: "extraction" | "analysis",
): PipelineError {
  if (error instanceof PipelineError) return error;

  if (error instanceof Anthropic.AuthenticationError) {
    return new PipelineError(
      "The analysis service is not configured correctly. This is on us, not you.",
      stage,
      false,
    );
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new PipelineError(
      "The analysis service is busy right now. Try again in a minute.",
      stage,
    );
  }
  if (error instanceof Anthropic.APIConnectionError) {
    return new PipelineError(
      "We could not reach the analysis service. Check your connection and try again.",
      stage,
    );
  }
  if (error instanceof SyntaxError) {
    return new PipelineError(
      stage === "extraction"
        ? "We could not read that screenshot cleanly. Try a sharper, less cropped image."
        : "The analysis came back malformed twice in a row. Try again in a moment.",
      stage,
    );
  }
  if (error instanceof Anthropic.APIError) {
    return new PipelineError(
      "The analysis service returned an error. Try again in a moment.",
      stage,
    );
  }
  return new PipelineError("Something went wrong during analysis. Try again.", stage);
}
