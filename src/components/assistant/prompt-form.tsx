import { ArrowUp, Square } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "~/components/ui/input-group";
import { NativeSelect, NativeSelectOption } from "~/components/ui/native-select";
import type { AssistantModel } from "~/lib/assistant/models";

export function AssistantPromptForm({
  models,
  model,
  onModelChange,
  isBusy,
  disabled,
  onSubmit,
  onStop,
}: {
  models: readonly AssistantModel[];
  model: string;
  onModelChange: (model: string) => void;
  isBusy: boolean;
  disabled?: boolean;
  onSubmit: (text: string) => void;
  onStop: () => void;
}) {
  const [input, setInput] = useState("");

  function handleSubmit(event?: { preventDefault: () => void }) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || isBusy || disabled) return;
    onSubmit(text);
    setInput("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <InputGroup className="bg-background items-end">
        <InputGroupTextarea
          value={input}
          disabled={disabled}
          placeholder="Ask about matchups or the schedule…"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              handleSubmit();
            }
          }}
        />
        <InputGroupAddon align="block-end" className="justify-between">
          <NativeSelect
            value={model}
            disabled={disabled}
            className="h-8 w-auto min-w-40"
            onChange={(event) => onModelChange(event.target.value)}
            aria-label="Model"
          >
            {models.map((item) => (
              <NativeSelectOption key={item.id} value={item.id}>
                {item.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {isBusy ? (
            <InputGroupButton
              type="button"
              size="icon-sm"
              variant="default"
              onClick={onStop}
              aria-label="Stop"
            >
              <Square className="size-3.5" />
            </InputGroupButton>
          ) : (
            <InputGroupButton
              type="submit"
              size="icon-sm"
              variant="default"
              disabled={!input.trim() || disabled}
              aria-label="Send"
            >
              <ArrowUp />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
      <div className="flex justify-end">
        <Button type="submit" size="sm" className="sr-only">
          Send
        </Button>
      </div>
    </form>
  );
}
