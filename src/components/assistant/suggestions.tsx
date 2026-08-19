import { Button } from "~/components/ui/button";

const SUGGESTIONS = [
  "Summarize pairing gaps and extra rematches",
  "Fill missing round-robin matchups so everyone plays once",
  "Add a rematch between two specific teams",
  "Fill empty schedule slots without moving existing games",
  "Show a game night and suggest a safer reorder",
];

export function AssistantSuggestions({
  onSelect,
}: {
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {SUGGESTIONS.map((prompt) => (
        <Button
          key={prompt}
          type="button"
          variant="outline"
          className="h-auto justify-start px-3 py-2 text-left text-sm whitespace-normal"
          onClick={() => onSelect(prompt)}
        >
          {prompt}
        </Button>
      ))}
    </div>
  );
}
