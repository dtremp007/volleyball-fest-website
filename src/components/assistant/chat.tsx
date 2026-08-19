import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageSquarePlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  AssistantChatMessage,
  AssistantThinking,
} from "~/components/assistant/chat-message";
import { AssistantPromptForm } from "~/components/assistant/prompt-form";
import { AssistantSuggestions } from "~/components/assistant/suggestions";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  ASSISTANT_MODELS,
  DEFAULT_ASSISTANT_MODEL,
  type AssistantModel,
} from "~/lib/assistant/models";
import type { AssistantUIMessage } from "~/lib/assistant/tools";

export function SeasonAssistantChat({
  seasonId,
  seasonName,
}: {
  seasonId: string;
  seasonName: string;
}) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [model, setModel] = useState<string>(DEFAULT_ASSISTANT_MODEL);
  const transport = useMemo(
    () =>
      new DefaultChatTransport<AssistantUIMessage>({
        api: "/api/chat",
        body: { seasonId },
      }),
    [seasonId],
  );
  const { messages, sendMessage, status, stop, error, setMessages } =
    useChat<AssistantUIMessage>({
      transport,
    });

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/chat")
      .then((response) => response.json())
      .then((data: { configured?: boolean }) => {
        if (!cancelled) setConfigured(Boolean(data.configured));
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isBusy = status === "submitted" || status === "streaming";
  const resolvedModel = ASSISTANT_MODELS.some((item) => item.id === model)
    ? model
    : DEFAULT_ASSISTANT_MODEL;

  function submit(text: string) {
    void sendMessage({ text }, { body: { model: resolvedModel, seasonId } });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assistant</h1>
          <p className="text-muted-foreground mt-2">
            Create irregular matchups and fix the {seasonName} schedule without wiping
            existing games.
          </p>
        </div>
        {messages.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setMessages([])}
          >
            <MessageSquarePlus />
            New chat
          </Button>
        ) : null}
      </div>

      {configured === false ? (
        <div className="border-border bg-muted/40 mb-4 rounded-lg border px-4 py-3 text-sm">
          <p className="font-medium">AI Gateway is not configured</p>
          <p className="text-muted-foreground mt-1">
            Add <code>AI_GATEWAY_API_KEY</code> locally, or deploy on Vercel with AI
            Gateway. The chat UI is ready; tools will run once a key is available.
          </p>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col rounded-xl border">
        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-4 p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-lg font-medium">
                    What should we do with this season?
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Start with pairing gaps, add rematches, or fill empty schedule slots.
                    Existing scored games stay put.
                  </p>
                </div>
                <AssistantSuggestions onSelect={submit} />
              </div>
            ) : (
              messages.map((message) => (
                <AssistantChatMessage key={message.id} message={message} />
              ))
            )}
            {status === "submitted" ? <AssistantThinking /> : null}
          </div>
        </ScrollArea>

        <div className="border-t p-3">
          {error ? (
            <p className="text-destructive mb-2 text-sm">{error.message}</p>
          ) : null}
          <AssistantPromptForm
            models={ASSISTANT_MODELS as readonly AssistantModel[]}
            model={resolvedModel}
            onModelChange={setModel}
            isBusy={isBusy}
            disabled={configured === false}
            onSubmit={submit}
            onStop={() => stop()}
          />
        </div>
      </div>
    </div>
  );
}
