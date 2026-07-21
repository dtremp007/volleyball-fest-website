import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Image,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
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
import { NativeSelect } from "~/components/ui/native-select";
import { Textarea } from "~/components/ui/textarea";
import type { CmsValueType } from "~/lib/db/schema/cms.schema";
import { useTRPC } from "~/trpc/react";

export const Route = createFileRoute("/(authenticated)/seasons/$seasonId/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage categories, player positions, and site content
        </p>
      </div>

      <div className="flex flex-col gap-8">
        <CategoriesSection />
        <PositionsSection />
        <CmsSection />
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
              onSave={(data) => updateMutation.mutate({ id: category.id, data })}
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

// ============================================================================
// CMS Section
// ============================================================================

interface CmsEntry {
  id: string;
  name: string;
  value: string | null;
  valueType: CmsValueType;
  meta: string | null;
  parentId: string | null;
}

function CmsSection() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: entries = [], isLoading } = useQuery(trpc.cms.getAll.queryOptions());
  const { data: rootEntries = [] } = useQuery(trpc.cms.getRoots.queryOptions());

  const [isAdding, setIsAdding] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const createMutation = useMutation({
    ...trpc.cms.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.cms.getAll.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.cms.getRoots.queryKey() });
      setIsAdding(false);
      toast.success("Content entry created");
    },
    onError: () => toast.error("Failed to create content entry"),
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getChildren = (parentId: string) => {
    return entries.filter((e) => e.parentId === parentId);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-5" />
          Site Content (CMS)
        </CardTitle>
        <CardDescription>
          Manage editable content for the website like hero text, images, and other
          dynamic content
        </CardDescription>
        <CardAction>
          <Button size="sm" onClick={() => setIsAdding(true)} disabled={isAdding}>
            <Plus className="size-4" />
            Add Content Group
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2">
          {isAdding && (
            <CmsRootForm
              onSave={(data) => createMutation.mutate(data)}
              onCancel={() => setIsAdding(false)}
              isPending={createMutation.isPending}
            />
          )}
          {rootEntries.map((entry) => (
            <CmsEntryTree
              key={entry.id}
              entry={entry}
              entries={entries}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
              getChildren={getChildren}
              level={0}
            />
          ))}
          {rootEntries.length === 0 && !isAdding && !isLoading && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No content entries yet. Add a content group to get started.
            </p>
          )}
          {isLoading && (
            <p className="text-muted-foreground py-4 text-center text-sm">
              Loading content...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface CmsRootFormProps {
  onSave: (data: { name: string; valueType: CmsValueType; meta?: string }) => void;
  onCancel: () => void;
  isPending?: boolean;
}

function CmsRootForm({ onSave, onCancel, isPending }: CmsRootFormProps) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    onSave({
      name: name.trim().toLowerCase().replace(/\s+/g, "_"),
      valueType: "object",
      meta: JSON.stringify({ label: label.trim() || name.trim() }),
    });
  };

  return (
    <div className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-lg p-3">
      <Input
        placeholder="Key (e.g., hero)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="min-w-[120px] flex-1"
        disabled={isPending}
      />
      <Input
        placeholder="Display Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="min-w-[150px] flex-1"
        disabled={isPending}
      />
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={handleSave} disabled={isPending}>
          <Check className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onCancel} disabled={isPending}>
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

interface CmsEntryTreeProps {
  entry: CmsEntry;
  entries: CmsEntry[];
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  getChildren: (parentId: string) => CmsEntry[];
  level: number;
}

function CmsEntryTree({
  entry,
  entries,
  expandedIds,
  onToggleExpand,
  getChildren,
  level,
}: CmsEntryTreeProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingChild, setIsAddingChild] = useState(false);

  const children = getChildren(entry.id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(entry.id);
  const isObject = entry.valueType === "object";

  const updateMutation = useMutation({
    ...trpc.cms.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.cms.getAll.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.cms.getRoots.queryKey() });
      setIsEditing(false);
      toast.success("Content updated");
    },
    onError: () => toast.error("Failed to update content"),
  });

  const createMutation = useMutation({
    ...trpc.cms.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.cms.getAll.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.cms.getRoots.queryKey() });
      setIsAddingChild(false);
      if (!isExpanded) onToggleExpand(entry.id);
      toast.success("Content field added");
    },
    onError: () => toast.error("Failed to add content field"),
  });

  const deleteMutation = useMutation({
    ...trpc.cms.delete.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.cms.getAll.queryKey() });
      queryClient.invalidateQueries({ queryKey: trpc.cms.getRoots.queryKey() });
      toast.success("Content deleted");
    },
    onError: () => toast.error("Failed to delete content"),
  });

  const meta = entry.meta ? JSON.parse(entry.meta) : {};
  const label = meta.label || entry.name;

  if (isEditing && !isObject) {
    return (
      <div style={{ paddingLeft: level * 16 }}>
        <CmsValueEditor
          entry={entry}
          onSave={(value) => updateMutation.mutate({ id: entry.id, data: { value } })}
          onCancel={() => setIsEditing(false)}
          isPending={updateMutation.isPending}
        />
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: level * 16 }}>
      <div className="hover:bg-muted/50 flex items-center gap-2 rounded-lg p-2 transition-colors">
        {/* Expand/collapse toggle for objects with children */}
        {isObject ? (
          <Button
            size="icon"
            variant="ghost"
            className="size-6"
            onClick={() => onToggleExpand(entry.id)}
          >
            {isExpanded || hasChildren ? (
              isExpanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )
            ) : (
              <div className="size-4" />
            )}
          </Button>
        ) : (
          <div className="flex size-6 items-center justify-center">
            {entry.valueType === "file" ? (
              <Image className="text-muted-foreground size-4" />
            ) : (
              <FileText className="text-muted-foreground size-4" />
            )}
          </div>
        )}

        {/* Entry info */}
        <div className="flex flex-1 items-center gap-3 overflow-hidden">
          <span className="font-medium">{label}</span>
          <span className="text-muted-foreground font-mono text-xs">{entry.name}</span>
          {!isObject && entry.value && (
            <span className="text-muted-foreground truncate text-sm">
              {entry.valueType === "file" ? (
                <span className="text-blue-500">📎 {entry.value.split("/").pop()}</span>
              ) : entry.value.length > 50 ? (
                `${entry.value.slice(0, 50)}...`
              ) : (
                entry.value
              )}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1">
          {isObject && (
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => setIsAddingChild(true)}
              title="Add field"
            >
              <Plus className="size-4" />
            </Button>
          )}
          {!isObject && (
            <Button
              size="icon"
              variant="ghost"
              className="size-7"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="size-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="size-7"
            onClick={() => deleteMutation.mutate({ id: entry.id })}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Add child form */}
      {isAddingChild && (
        <div className="mt-1" style={{ paddingLeft: 16 }}>
          <CmsChildForm
            parentId={entry.id}
            onSave={(data) => createMutation.mutate(data)}
            onCancel={() => setIsAddingChild(false)}
            isPending={createMutation.isPending}
          />
        </div>
      )}

      {/* Children */}
      {isExpanded &&
        children.map((child) => (
          <CmsEntryTree
            key={child.id}
            entry={child}
            entries={entries}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            getChildren={getChildren}
            level={level + 1}
          />
        ))}
    </div>
  );
}

interface CmsChildFormProps {
  parentId: string;
  onSave: (data: {
    name: string;
    value?: string | null;
    valueType: CmsValueType;
    meta?: string;
    parentId: string;
  }) => void;
  onCancel: () => void;
  isPending?: boolean;
}

function CmsChildForm({ parentId, onSave, onCancel, isPending }: CmsChildFormProps) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [valueType, setValueType] = useState<CmsValueType>("string");
  const [value, setValue] = useState("");

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Field name is required");
      return;
    }
    onSave({
      name: name.trim().toLowerCase().replace(/\s+/g, "_"),
      value: valueType === "object" ? null : value || null,
      valueType,
      meta: JSON.stringify({ label: label.trim() || name.trim() }),
      parentId,
    });
  };

  return (
    <div className="bg-muted/50 flex flex-wrap items-center gap-2 rounded-lg p-3">
      <Input
        placeholder="Field key"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="min-w-[100px] flex-1"
        disabled={isPending}
      />
      <Input
        placeholder="Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="min-w-[100px] flex-1"
        disabled={isPending}
      />
      <NativeSelect
        value={valueType}
        onChange={(e) => setValueType(e.target.value as CmsValueType)}
        className="w-[120px]"
        disabled={isPending}
      >
        <option value="string">Text</option>
        <option value="number">Number</option>
        <option value="boolean">Yes/No</option>
        <option value="date">Date</option>
        <option value="file">File URL</option>
        <option value="object">Group</option>
      </NativeSelect>
      {valueType !== "object" && (
        <Input
          placeholder="Initial value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-w-[120px] flex-1"
          disabled={isPending}
        />
      )}
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={handleSave} disabled={isPending}>
          <Check className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onCancel} disabled={isPending}>
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

interface CmsValueEditorProps {
  entry: CmsEntry;
  onSave: (value: string | null) => void;
  onCancel: () => void;
  isPending?: boolean;
}

function CmsValueEditor({ entry, onSave, onCancel, isPending }: CmsValueEditorProps) {
  const [value, setValue] = useState(entry.value || "");
  const meta = entry.meta ? JSON.parse(entry.meta) : {};
  const label = meta.label || entry.name;

  const handleSave = () => {
    onSave(value || null);
  };

  const renderInput = () => {
    switch (entry.valueType) {
      case "boolean":
        return (
          <NativeSelect
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1"
            disabled={isPending}
          >
            <option value="true">Yes</option>
            <option value="false">No</option>
          </NativeSelect>
        );
      case "number":
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1"
            disabled={isPending}
          />
        );
      case "date":
        return (
          <Input
            type="date"
            value={value?.split("T")[0] || ""}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1"
            disabled={isPending}
          />
        );
      case "file":
        return (
          <Input
            type="url"
            placeholder="https://..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1"
            disabled={isPending}
          />
        );
      default:
        // Check if content is long
        if (value.length > 100 || value.includes("\n")) {
          return (
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="min-h-[80px] flex-1"
              disabled={isPending}
            />
          );
        }
        return (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1"
            disabled={isPending}
          />
        );
    }
  };

  return (
    <div className="bg-muted/50 flex flex-wrap items-start gap-2 rounded-lg p-3">
      <span className="text-muted-foreground pt-2 text-sm font-medium">{label}:</span>
      {renderInput()}
      <div className="flex gap-1">
        <Button size="icon" variant="ghost" onClick={handleSave} disabled={isPending}>
          <Check className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onCancel} disabled={isPending}>
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
