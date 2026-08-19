import { createFileRoute } from "@tanstack/react-router";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  streamText,
  toUIMessageStream,
  validateUIMessages,
} from "ai";
import {
  ASSISTANT_MODELS,
  DEFAULT_ASSISTANT_MODEL,
  isAssistantConfigured,
  isAssistantModelAllowed,
} from "~/lib/assistant/models";
import { buildAssistantSystemPrompt } from "~/lib/assistant/system-prompt";
import { createAssistantTools, type AssistantUIMessage } from "~/lib/assistant/tools";
import { auth } from "~/lib/auth/auth";
import { db } from "~/lib/db";
import { getAssistantSeasonOverview } from "~/lib/db/queries/assistant";
import { getSeasonById } from "~/lib/db/queries/season";

const MAX_OUTPUT_TOKENS = 8192;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function requireSession(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user) {
    return null;
  }
  return session;
}

async function handleGet({ request }: { request: Request }) {
  const session = await requireSession(request);
  if (!session) {
    return jsonError("Sign in to use the season assistant.", 401);
  }

  return Response.json({
    configured: isAssistantConfigured(),
    models: ASSISTANT_MODELS,
    defaultModel: DEFAULT_ASSISTANT_MODEL,
  });
}

async function handlePost({ request }: { request: Request }) {
  const session = await requireSession(request);
  if (!session) {
    return jsonError("Sign in to use the season assistant.", 401);
  }

  if (!isAssistantConfigured()) {
    return jsonError(
      "The assistant is not configured. Add AI_GATEWAY_API_KEY for local development, or deploy on Vercel with AI Gateway.",
      503,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const payload = body as { seasonId?: unknown; model?: unknown; messages?: unknown };
  const seasonId = typeof payload.seasonId === "string" ? payload.seasonId : "";
  if (!seasonId) {
    return jsonError("seasonId is required.", 400);
  }

  const season = await getSeasonById(db, seasonId);
  if (!season) {
    return jsonError("Season not found.", 404);
  }

  const modelId =
    typeof payload.model === "string" ? payload.model : DEFAULT_ASSISTANT_MODEL;
  if (!isAssistantModelAllowed(modelId)) {
    return jsonError(`Model ${modelId} is not available.`, 400);
  }

  const tools = createAssistantTools(seasonId);
  let messages: AssistantUIMessage[];
  try {
    messages = await validateUIMessages<AssistantUIMessage>({
      messages: payload.messages,
      tools,
    });
  } catch {
    return jsonError("Invalid messages.", 400);
  }

  const overview = await getAssistantSeasonOverview(db, seasonId);
  const result = streamText({
    model: modelId,
    system: buildAssistantSystemPrompt(overview),
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: isStepCount(8),
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    abortSignal: request.signal,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      onError: () => "Something went wrong. Please try again.",
    }),
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      GET: handleGet,
      POST: handlePost,
    },
  },
});
