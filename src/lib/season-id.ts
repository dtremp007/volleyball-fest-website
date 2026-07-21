/** Derive a stable season primary key from its display name. */
export function slugifySeasonId(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function nextAvailableSeasonId(
  baseId: string,
  existingIds: Iterable<string>,
): string {
  const taken = new Set(existingIds);
  if (!taken.has(baseId)) return baseId;

  let suffix = 2;
  while (taken.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseId}-${suffix}`;
}
