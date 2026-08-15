import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "~/components/ui/drawer";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Skeleton } from "~/components/ui/skeleton";
import { Textarea } from "~/components/ui/textarea";
import { DEFAULT_CATEGORY_COLOR } from "~/lib/category-color";
import { Route } from "~/routes/(authenticated)/seasons/$seasonId/settings";
import { useTRPC } from "~/trpc/react";
import { createCategorySchema } from "~/validators/category.validators";

export const NEW_CATEGORY_ID = "new";

type CategoryDraft = {
  name: string;
  description: string;
  color: string;
};

function emptyDraft(): CategoryDraft {
  return {
    name: "",
    description: "",
    color: DEFAULT_CATEGORY_COLOR,
  };
}

function draftFromCategory(category: {
  name: string;
  description: string;
  color: string;
}): CategoryDraft {
  return {
    name: category.name,
    description: category.description,
    color: category.color,
  };
}

function normalizeHexColor(value: string) {
  const trimmed = value.trim();
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return `#${trimmed}`;
  }
  return trimmed;
}

export function CategoryDetailsDrawer() {
  const { categoryId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const trpc = useTRPC();
  const isCreating = categoryId === NEW_CATEGORY_ID;

  const { data: categories = [], isLoading } = useQuery(
    trpc.category.getAll.queryOptions(),
  );
  const category = isCreating
    ? null
    : (categories.find((item) => item.id === categoryId) ?? null);

  const closeDrawer = () => {
    navigate({
      search: (prev) => ({ ...prev, categoryId: undefined }),
      replace: true,
      resetScroll: false,
    });
  };

  if (!categoryId) {
    return (
      <Drawer open={false} onOpenChange={() => undefined} direction="right">
        <DrawerContent className="hidden" />
      </Drawer>
    );
  }

  if (!isCreating && isLoading && !category) {
    return (
      <CategoryDrawerShell
        title="Edit category"
        description="Update this category and the color used on schedules."
        onClose={closeDrawer}
      >
        <div className="space-y-4 p-4 sm:p-6">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-9 w-40" />
        </div>
      </CategoryDrawerShell>
    );
  }

  if (!isCreating && !category) {
    return (
      <CategoryDrawerShell
        title="Edit category"
        description="Update this category and the color used on schedules."
        onClose={closeDrawer}
      >
        <p className="text-muted-foreground p-4 text-sm sm:p-6">Category not found.</p>
      </CategoryDrawerShell>
    );
  }

  return (
    <CategoryFormDrawer
      key={categoryId}
      categoryId={categoryId}
      isCreating={isCreating}
      initialDraft={category ? draftFromCategory(category) : emptyDraft()}
      onClose={closeDrawer}
    />
  );
}

function CategoryDrawerShell({
  title,
  description,
  onClose,
  children,
  footer,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Drawer
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      direction="right"
    >
      <DrawerContent className="h-full w-full overflow-hidden data-[vaul-drawer-direction=right]:sm:max-w-xl">
        <DrawerHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription>{description}</DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close category details">
                <X className="size-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>
        <ScrollArea className="h-0 flex-1">{children}</ScrollArea>
        {footer}
      </DrawerContent>
    </Drawer>
  );
}

function CategoryFormDrawer({
  categoryId,
  isCreating,
  initialDraft,
  onClose,
}: {
  categoryId: string;
  isCreating: boolean;
  initialDraft: CategoryDraft;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<CategoryDraft>(initialDraft);

  const createMutation = useMutation({
    ...trpc.category.create.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.category.getAll.queryKey() });
      toast.success("Category created");
      onClose();
    },
    onError: () => toast.error("Failed to create category"),
  });

  const updateMutation = useMutation({
    ...trpc.category.update.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.category.getAll.queryKey() });
      toast.success("Category updated");
      onClose();
    },
    onError: () => toast.error("Failed to update category"),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isDirty = JSON.stringify(draft) !== JSON.stringify(initialDraft);
  const confirmDiscard = () =>
    !isDirty || window.confirm("Discard the unsaved changes to this category?");

  const requestClose = () => {
    if (confirmDiscard()) onClose();
  };

  const setField = <K extends keyof CategoryDraft>(key: K, value: CategoryDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const save = () => {
    const parsed = createCategorySchema.safeParse({
      ...draft,
      color: normalizeHexColor(draft.color),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Complete the category fields.");
      return;
    }

    if (isCreating) {
      createMutation.mutate(parsed.data);
      return;
    }
    updateMutation.mutate({ id: categoryId, data: parsed.data });
  };

  return (
    <CategoryDrawerShell
      title={isCreating ? "Add category" : "Edit category"}
      description={
        isCreating
          ? "Create a league category and its schedule color."
          : "Update this category and the color used on schedules."
      }
      onClose={requestClose}
      footer={
        <DrawerFooter className="border-t pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex w-full justify-end gap-3">
            <Button variant="outline" onClick={requestClose} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={save} disabled={isPending || (!isCreating && !isDirty)}>
              {isPending ? "Saving…" : isCreating ? "Create category" : "Save changes"}
            </Button>
          </div>
        </DrawerFooter>
      }
    >
      <div className="space-y-6 p-4 sm:p-6">
        <CategoryForm draft={draft} disabled={isPending} setField={setField} />
      </div>
    </CategoryDrawerShell>
  );
}

function CategoryForm({
  draft,
  disabled,
  setField,
}: {
  draft: CategoryDraft;
  disabled: boolean;
  setField: <K extends keyof CategoryDraft>(key: K, value: CategoryDraft[K]) => void;
}) {
  return (
    <div className="space-y-6">
      <Field>
        <FieldLabel htmlFor="category-name">Name</FieldLabel>
        <Input
          id="category-name"
          value={draft.name}
          onChange={(event) => setField("name", event.target.value)}
          placeholder="e.g. Varonil Libre"
          disabled={disabled}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="category-description">Description</FieldLabel>
        <Textarea
          id="category-description"
          value={draft.description}
          onChange={(event) => setField("description", event.target.value)}
          placeholder="Shown on the public signup form"
          rows={3}
          disabled={disabled}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="category-color">Schedule color</FieldLabel>
        <div className="flex items-center gap-3">
          <input
            id="category-color"
            type="color"
            value={
              /^#[0-9A-Fa-f]{6}$/.test(draft.color) ? draft.color : DEFAULT_CATEGORY_COLOR
            }
            onChange={(event) => setField("color", event.target.value)}
            disabled={disabled}
            className="border-input size-10 cursor-pointer rounded-md border bg-transparent p-1"
          />
          <Input
            aria-label="Hex color"
            value={draft.color}
            onChange={(event) => setField("color", normalizeHexColor(event.target.value))}
            placeholder="#000000"
            className="font-mono uppercase"
            disabled={disabled}
          />
        </div>
      </Field>
    </div>
  );
}
