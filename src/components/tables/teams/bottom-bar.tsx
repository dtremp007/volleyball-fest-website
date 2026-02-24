import { Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "~/components/ui/button";
import { CopyToSeasonDialog } from "./copy-to-season-dialog";

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
      className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2"
    >
      <div className="bg-background border-border flex items-center gap-3 rounded-lg border px-4 py-3 shadow-lg">
        <span className="text-sm font-medium">
          {selectedCount} team{selectedCount !== 1 ? "s" : ""} selected
        </span>

        <div className="bg-border h-4 w-px" />

        <Button variant="ghost" size="sm" onClick={onClearSelection} className="gap-1.5">
          <X className="size-4" />
          Clear
        </Button>

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
            <Trash2 className="size-4" />
            Delete
          </Button>
        )}
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
