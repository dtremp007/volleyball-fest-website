export function parseUnavailableDates(unavailableDates: string): string[] {
  return unavailableDates
    .split(",")
    .map((date) => date.trim())
    .filter((date) => date.length > 0);
}

export function normalizeDateOnly(dateValue: string): string {
  return dateValue.split("T")[0]?.trim() ?? "";
}

export function isDateUnavailable(unavailableDates: string, eventDate: string): boolean {
  const normalizedEventDate = normalizeDateOnly(eventDate);
  if (!normalizedEventDate) return false;

  return parseUnavailableDates(unavailableDates)
    .map((date) => normalizeDateOnly(date))
    .includes(normalizedEventDate);
}

export function normalizeUnavailableDates(unavailableDates: string[]): string {
  return unavailableDates
    .map((date) => date.trim())
    .filter((date) => date.length > 0)
    .join(",");
}

export function formatUnavailableDates(unavailableDates: string): string {
  return parseUnavailableDates(unavailableDates).join(", ");
}
