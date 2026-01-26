export type ScheduleEvent = {
    id: string;
    name: string;
    date: string;
    matchups: {
        id: string;
        teamA: { name: string; logoUrl: string };
        teamB: { name: string; logoUrl: string };
        category: string;
        courtId: string | null;
        slotIndex: number | null;
    }[];
};
