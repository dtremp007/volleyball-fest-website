export type ScheduleEvent = {
  id: string;
  name: string;
  date: string;
  matchups: {
    id: string;
    type?: "regular" | "playoff";
    label?: string | null;
    round?: string | null;
    teamA: { name: string; logoUrl: string | null } | null;
    teamB: { name: string; logoUrl: string | null } | null;
    category: string;
    courtId: string | null;
    slotIndex: number | null;
  }[];
};
