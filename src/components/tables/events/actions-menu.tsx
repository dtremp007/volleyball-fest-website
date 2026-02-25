import { useQueryClient } from "@tanstack/react-query";
import { ImageIcon, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  downloadScheduleImage,
  generateEventScheduleImage,
} from "~/lib/canvas/event-schedule-image";
import { useTRPC } from "~/trpc/react";
import type { EventRow } from "./columns";

type Props = {
  event: EventRow;
};

export function ActionsMenu({ event }: Props) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const handleDownloadImage = async () => {
    try {
      const eventData = await queryClient.fetchQuery(
        trpc.matchup.getEventById.queryOptions({ eventId: event.id }),
      );
      if (!eventData) {
        toast.error("Event not found");
        return;
      }
      const blob = await generateEventScheduleImage(
        eventData,
        window.location.origin,
      );
      downloadScheduleImage(blob, eventData.name);
      toast.success("Image downloaded");
    } catch (err) {
      console.error("Failed to generate schedule image:", err);
      toast.error("Failed to generate image");
    }
  };

  return (
    <div className="flex items-center justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              void handleDownloadImage();
            }}
            className="flex items-center"
          >
            <ImageIcon className="mr-2 size-4" />
            Download image
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
