import { Monitor } from "lucide-react";

type ScheduleBuilderMobileNoticeProps = {
  title: string;
};

export function ScheduleBuilderMobileNotice({ title }: ScheduleBuilderMobileNoticeProps) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 py-12 md:hidden">
      <div className="bg-muted/40 flex max-w-md flex-col items-center rounded-lg border border-dashed p-8 text-center">
        <Monitor className="text-muted-foreground mb-4 size-12" strokeWidth={1.5} />
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          The schedule builder uses drag-and-drop on a wide layout and is not supported on
          phones or small tablets. Open this page on a laptop or desktop computer to build or
          edit the schedule.
        </p>
      </div>
    </div>
  );
}
