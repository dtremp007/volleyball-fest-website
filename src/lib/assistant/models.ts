export const ASSISTANT_MODELS = [
  { id: "openai/gpt-4.1-mini", name: "GPT-4.1 mini" },
  { id: "openai/gpt-4.1", name: "GPT-4.1" },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5" },
] as const;

export const DEFAULT_ASSISTANT_MODEL = ASSISTANT_MODELS[0].id;

export type AssistantModel = (typeof ASSISTANT_MODELS)[number];

export function isAssistantModelAllowed(id: string) {
  return ASSISTANT_MODELS.some((model) => model.id === id);
}

export function isAssistantConfigured() {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL);
}
