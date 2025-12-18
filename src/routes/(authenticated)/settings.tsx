import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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

export const Route = createFileRoute("/(authenticated)/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage seasons, categories, and player positions
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <SeasonsSection />
        <CategoriesSection />
        <PositionsSection />
      </div>
    </div>
  );
}

// ============================================================================
// Seasons Section
// ============================================================================

function SeasonsSection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: seasons = [] } = useQuery(trpc.season.getAll.queryOptions());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const createMutation = useMutation({
    ...trpc.season.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.season.getAll.queryKey() });
      setIsAdding(false);
      toast.success("Season created");
    },
    onError: () => toast.error("Failed to create season"),
  });

  const updateMutation = useMutation({
    ...trpc.season.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.season.getAll.queryKey() });
      setEditingId(null);
      toast.success("Season updated");
    },
    onError: () => toast.error("Failed to update season"),
  });

  const deleteMutation = useMutation({
    ...trpc.season.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.season.getAll.queryKey() });
      toast.success("Season deleted");
    },
    onError: () => toast.error("Failed to delete season"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seasons</CardTitle>
        <CardDescription>
          Manage tournament seasons with start and end dates
        </CardDescription>
        <CardAction>
          <Button size="sm" onClick={() => setIsAdding(true)} disabled={isAdding}>
            <Plus className="size-4" />
            Add Season
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {isAdding && (
            <SeasonRow
              isNew
              onSave={(data) =>
                createMutation.mutate({
                  name: data.name,
                  startDate: data.startDate,
                  endDate: data.endDate,
                })
              }
              onCancel={() => setIsAdding(false)}
              isPending={createMutation.isPending}
            />
          )}
          {seasons.map((season) => (
            <SeasonRow
              key={season.id}
              season={season}
              isEditing={editingId === season.id}
              onEdit={() => setEditingId(season.id)}
              onSave={(data) =>
                updateMutation.mutate({ id: season.id, data })
              }
              onCancel={() => setEditingId(null)}
              onDelete={() => deleteMutation.mutate({ id: season.id })}
              isPending={updateMutation.isPending || deleteMutation.isPending}
            />
          ))}
          {seasons.length === 0 && !isAdding && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No seasons yet. Add one to get started.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface SeasonRowProps {
  season?: { id: string; name: string; startDate: string; endDate: string };
  isNew?: boolean;
  isEditing?: boolean;
  onEdit?: () => void;
  onSave: (data: { name: string; startDate: string; endDate: string }) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isPending?: boolean;
}

function SeasonRow({
  season,
  isNew,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  isPending,
}: SeasonRowProps) {
  const [name, setName] = useState(season?.name ?? "");
  const [startDate, setStartDate] = useState(season?.startDate ?? "");
  const [endDate, setEndDate] = useState(season?.endDate ?? "");

  const isEditMode = isNew || isEditing;

  const handleSave = () => {
    if (!name.trim() || !startDate || !endDate) {
      toast.error("All fields are required");
      return;
    }
    onSave({ name: name.trim(), startDate, endDate });
  };

  const handleCancel = () => {
    setName(season?.name ?? "");
    setStartDate(season?.startDate ?? "");
    setEndDate(season?.endDate ?? "");
    onCancel();
  };

  if (isEditMode) {
    return (
      <div className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-lg p-3">
        <Input
          placeholder="Season name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-[150px] flex-1"
          disabled={isPending}
        />
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-[150px]"
          disabled={isPending}
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-[150px]"
          disabled={isPending}
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
      <div className="flex flex-1 flex-wrap items-center gap-4">
        <span className="font-medium">{season?.name}</span>
        <span className="text-muted-foreground text-sm">
          {season?.startDate} — {season?.endDate}
        </span>
      </div>
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

// ============================================================================
// Categories Section
// ============================================================================

function CategoriesSection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: categories = [] } = useQuery(trpc.category.getAll.queryOptions());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const createMutation = useMutation({
    ...trpc.category.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.category.getAll.queryKey() });
      setIsAdding(false);
      toast.success("Category created");
    },
    onError: () => toast.error("Failed to create category"),
  });

  const updateMutation = useMutation({
    ...trpc.category.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.category.getAll.queryKey() });
      setEditingId(null);
      toast.success("Category updated");
    },
    onError: () => toast.error("Failed to update category"),
  });

  const deleteMutation = useMutation({
    ...trpc.category.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.category.getAll.queryKey() });
      toast.success("Category deleted");
    },
    onError: () => toast.error("Failed to delete category"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
        <CardDescription>
          Define league categories (e.g., Mixed, Women&apos;s, Men&apos;s)
        </CardDescription>
        <CardAction>
          <Button size="sm" onClick={() => setIsAdding(true)} disabled={isAdding}>
            <Plus className="size-4" />
            Add Category
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {isAdding && (
            <CategoryRow
              isNew
              onSave={(data) =>
                createMutation.mutate({
                  name: data.name,
                  description: data.description,
                })
              }
              onCancel={() => setIsAdding(false)}
              isPending={createMutation.isPending}
            />
          )}
          {categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              isEditing={editingId === category.id}
              onEdit={() => setEditingId(category.id)}
              onSave={(data) =>
                updateMutation.mutate({ id: category.id, data })
              }
              onCancel={() => setEditingId(null)}
              onDelete={() => deleteMutation.mutate({ id: category.id })}
              isPending={updateMutation.isPending || deleteMutation.isPending}
            />
          ))}
          {categories.length === 0 && !isAdding && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No categories yet. Add one to get started.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface CategoryRowProps {
  category?: { id: string; name: string; description: string };
  isNew?: boolean;
  isEditing?: boolean;
  onEdit?: () => void;
  onSave: (data: { name: string; description: string }) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isPending?: boolean;
}

function CategoryRow({
  category,
  isNew,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  isPending,
}: CategoryRowProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");

  const isEditMode = isNew || isEditing;

  const handleSave = () => {
    if (!name.trim() || !description.trim()) {
      toast.error("All fields are required");
      return;
    }
    onSave({ name: name.trim(), description: description.trim() });
  };

  const handleCancel = () => {
    setName(category?.name ?? "");
    setDescription(category?.description ?? "");
    onCancel();
  };

  if (isEditMode) {
    return (
      <div className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-lg p-3">
        <Input
          placeholder="Category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-[150px] flex-1"
          disabled={isPending}
        />
        <Input
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-w-[200px] flex-[2]"
          disabled={isPending}
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
      <div className="flex flex-1 flex-col gap-1">
        <span className="font-medium">{category?.name}</span>
        <span className="text-muted-foreground text-sm">{category?.description}</span>
      </div>
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
        <CardDescription>
          Player positions available for roster selection
        </CardDescription>
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
              onSave={(data) =>
                updateMutation.mutate({ id: position.id, data })
              }
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
