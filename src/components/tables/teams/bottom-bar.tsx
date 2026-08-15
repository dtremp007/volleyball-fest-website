import { Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "~/components/ui/button";
import { CopyToSeasonDialog } from "./copy-to-season-dialog";
import { MoveToCategoryDialog } from "./move-to-category-dialog";

type Props = {
  selectedCount: number;
  selectedTeamIds: string[];
  onClearSelection: () => void;
  onDeleteSelected?: () => void;
};

export function BottomBar({
  selectedCount,
  selectedTeamIds,
  onClearSelection,
  onDeleteSelected,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-2 sm:bottom-6"
    >
      <div className="bg-background border-border pointer-events-auto mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-2 rounded-lg border px-3 py-2.5 shadow-lg sm:gap-3 sm:px-4 sm:py-3">
        <span className="text-sm font-medium whitespace-nowrap">
          {selectedCount} team{selectedCount !== 1 ? "s" : ""} selected
        </span>

        <div className="bg-border hidden h-4 w-px sm:block" aria-hidden />

        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="gap-1.5"
          >
            <X className="size-4 shrink-0" />
            Clear
          </Button>

          <MoveToCategoryDialog
            selectedTeamIds={selectedTeamIds}
            onSuccess={onClearSelection}
          />

          <CopyToSeasonDialog
            selectedTeamIds={selectedTeamIds}
            onSuccess={onClearSelection}
          />

          {onDeleteSelected && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDeleteSelected}
              className="gap-1.5"
            >
              <Trash2 className="size-4 shrink-0" />
              Delete
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function BottomBarWrapper({
  show,
  selectedTeamIds,
  ...props
}: Props & { show: boolean }) {
  return (
    <AnimatePresence>
      {show && <BottomBar selectedTeamIds={selectedTeamIds} {...props} />}
    </AnimatePresence>
  );
}
