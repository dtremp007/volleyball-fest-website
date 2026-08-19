import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "~/lib/utils";

export function ChatMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <div
      className={cn(
        "[&_code]:bg-muted [&_pre]:bg-muted text-sm leading-relaxed [&_a]:underline [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-3 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5",
        className,
      )}
    >
      <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
    </div>
  );
}
