export function parseUnavailableDates(unavailableDates: string): string[] {
  return unavailableDates
    .split(",")
    .map((date) => date.trim())
    .filter((date) => date.length > 0);
}

export function normalizeDateOnly(dateValue: string): string {
  return dateValue.split(/[T ]/)[0]?.trim() ?? "";
}

function parseDateOnly(datePart: string): Date {
  const [year, month, day] = datePart.split("-").map((part) => Number.parseInt(part, 10));

  if (
    Number.isNaN(year) ||
    Number.isNaN(month) ||
    Number.isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return new Date(Number.NaN);
  }

  return new Date(year, month - 1, day, 12);
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function toCalendarDates(dateStrings: string[]): Date[] {
  const seen = new Set<string>();
  const dates: Date[] = [];

  for (const value of dateStrings) {
    const datePart = normalizeDateOnly(value);
    if (!datePart || seen.has(datePart)) continue;
    seen.add(datePart);

    const date = parseDateOnly(datePart);
    if (Number.isNaN(date.getTime())) continue;
    dates.push(date);
  }

  return dates.sort((a, b) => a.getTime() - b.getTime());
}

export function fromCalendarDates(dates: Date[]): string[] {
  return [...new Set(dates.map(toDateString))].sort();
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
