import { ChatMarkdown } from "~/components/assistant/markdown";
import { AssistantToolPart } from "~/components/assistant/tool-part";
import type { AssistantUIMessage } from "~/lib/assistant/tools";
import { cn } from "~/lib/utils";

function isToolPart(
  part: AssistantUIMessage["parts"][number],
): part is AssistantUIMessage["parts"][number] & {
  type: `tool-${string}`;
  toolCallId: string;
  state: string;
  output?: unknown;
  errorText?: string;
} {
  return part.type.startsWith("tool-") && "toolCallId" in part;
}

export function AssistantChatMessage({ message }: { message: AssistantUIMessage }) {
  if (message.role === "user") {
    const text = message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("");

    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap">
          {text}
        </div>
      </div>
    );
  }

  if (message.role !== "assistant") {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {message.parts.map((part) => {
        if (part.type === "text" && part.text.trim()) {
          return <ChatMarkdown key={`${message.id}-text-${part.text}`} text={part.text} />;
        }
        if (isToolPart(part)) {
          return (
            <AssistantToolPart
              key={part.toolCallId}
              type={part.type}
              state={part.state}
              output={"output" in part ? part.output : undefined}
              errorText={"errorText" in part ? part.errorText : undefined}
            />
          );
        }
        return null;
      })}
    </div>
  );
}

export function AssistantThinking({ className }: { className?: string }) {
  return <p className={cn("text-muted-foreground text-sm", className)}>Thinking…</p>;
}
