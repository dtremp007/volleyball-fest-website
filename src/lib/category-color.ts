export const DEFAULT_CATEGORY_COLOR = "#374151";

export type CategoryColor = {
  name: string;
  color: string;
};

export function normalizeCategoryColor(value: string) {
  const hex = value.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(hex)) {
    return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
  }
  if (/^[0-9a-f]{8}$/.test(hex)) {
    return `#${hex.slice(0, 6)}`;
  }
  if (/^[0-9a-f]{6}$/.test(hex)) {
    return `#${hex}`;
  }
  return null;
}

export function colorForCategory(categoryName: string, categories: CategoryColor[]) {
  return (
    normalizeCategoryColor(
      categories.find((category) => category.name === categoryName)?.color ?? "",
    ) ?? DEFAULT_CATEGORY_COLOR
  );
}
