export const DEFAULT_CATEGORY_COLOR = "#374151";

export type CategoryColor = {
  name: string;
  color: string;
};

export function colorForCategory(
  categoryName: string,
  categories: CategoryColor[],
) {
  return (
    categories.find((category) => category.name === categoryName)?.color ??
    DEFAULT_CATEGORY_COLOR
  );
}
