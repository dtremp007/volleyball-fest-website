import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";
import {
  CategoriesDataTable,
  CategoryDetailsDrawer,
  NEW_CATEGORY_ID,
} from "~/components/tables/categories";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { useTRPC } from "~/trpc/react";

export const Route = createFileRoute("/(authenticated)/seasons/$seasonId/settings")({
  component: SettingsPage,
  validateSearch: z.object({
    categoryId: z.string().optional(),
  }),
});

function SettingsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage categories and player positions
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <CategoriesSection />
        <PositionsSection />
      </div>
    </div>
  );
}

// ============================================================================
// Categories Section
// ============================================================================

function CategoriesSection() {
  const navigate = Route.useNavigate();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            Define league categories and the colors used on schedule images and PDFs
          </CardDescription>
          <CardAction>
            <Button
              size="sm"
              onClick={() =>
                navigate({
                  search: (prev) => ({ ...prev, categoryId: NEW_CATEGORY_ID }),
                  replace: true,
                  resetScroll: false,
                })
              }
            >
              <Plus className="size-4" />
              Add Category
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <CategoriesDataTable />
        </CardContent>
      </Card>
      <CategoryDetailsDrawer />
    </>
  );
}

// ============================================================================
// Positions Section
// ============================================================================

function PositionsSection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: positions = [] } = useQuery(trpc.position.getAll.queryOptions());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const createMutation = useMutation({
    ...trpc.position.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.position.getAll.queryKey() });
      setIsAdding(false);
      toast.success("Position created");
    },
    onError: () => toast.error("Failed to create position"),
  });

  const updateMutation = useMutation({
    ...trpc.position.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.position.getAll.queryKey() });
      setEditingId(null);
      toast.success("Position updated");
    },
    onError: () => toast.error("Failed to update position"),
  });

  const deleteMutation = useMutation({
    ...trpc.position.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.position.getAll.queryKey() });
      toast.success("Position deleted");
    },
    onError: () => toast.error("Failed to delete position"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Positions</CardTitle>
        <CardDescription>Player positions available for roster selection</CardDescription>
        <CardAction>
          <Button size="sm" onClick={() => setIsAdding(true)} disabled={isAdding}>
            <Plus className="size-4" />
            Add Position
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {isAdding && (
            <PositionRow
              isNew
              onSave={(data) => createMutation.mutate({ name: data.name })}
              onCancel={() => setIsAdding(false)}
              isPending={createMutation.isPending}
            />
          )}
          {positions.map((position) => (
            <PositionRow
              key={position.id}
              position={position}
              isEditing={editingId === position.id}
              onEdit={() => setEditingId(position.id)}
              onSave={(data) => updateMutation.mutate({ id: position.id, data })}
              onCancel={() => setEditingId(null)}
              onDelete={() => deleteMutation.mutate({ id: position.id })}
              isPending={updateMutation.isPending || deleteMutation.isPending}
            />
          ))}
          {positions.length === 0 && !isAdding && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No positions yet. Add one to get started.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface PositionRowProps {
  position?: { id: string; name: string };
  isNew?: boolean;
  isEditing?: boolean;
  onEdit?: () => void;
  onSave: (data: { name: string }) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isPending?: boolean;
}

function PositionRow({
  position,
  isNew,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  isPending,
}: PositionRowProps) {
  const [name, setName] = useState(position?.name ?? "");

  const isEditMode = isNew || isEditing;

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    onSave({ name: name.trim() });
  };

  const handleCancel = () => {
    setName(position?.name ?? "");
    onCancel();
  };

  if (isEditMode) {
    return (
      <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
        <Input
          placeholder="Position name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
          disabled={isPending}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
        />
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={handleSave} disabled={isPending}>
            <Check className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={handleCancel} disabled={isPending}>
            <X className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="hover:bg-muted/50 flex items-center justify-between gap-4 rounded-lg p-3 transition-colors">
      <span className="font-medium">{position?.name}</span>
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={onEdit}>
          <Pencil className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onDelete}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
