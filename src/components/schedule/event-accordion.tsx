import { Calendar } from "lucide-react";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import {
  formatEventDateForDisplay,
  getSlotTimeConfigForEvent,
  getTimeForSlotIndex,
} from "~/lib/schedule/slot-times";

import { TeamBadge } from "./team-badge";
import type { ScheduleEvent } from "./types";

export function EventAccordionItem({ event }: { event: ScheduleEvent }) {
  // Group matchups by time slot for table display
  const matchupsBySlot = new Map<
    number,
    {
      court1?: (typeof event.matchups)[number];
      court2?: (typeof event.matchups)[number];
    }
  >();
  for (const matchup of event.matchups) {
    if (matchup.slotIndex !== null) {
      const slot = matchupsBySlot.get(matchup.slotIndex) ?? {};
      if (matchup.courtId === "A") {
        slot.court1 = matchup;
      } else if (matchup.courtId === "B") {
        slot.court2 = matchup;
      }
      matchupsBySlot.set(matchup.slotIndex, slot);
    }
  }

  const sortedSlots = Array.from(matchupsBySlot.keys()).sort((a, b) => a - b);
  const slotTimeConfig = getSlotTimeConfigForEvent(event.date);
  const displayDate = formatEventDateForDisplay(event.date);
  const hasPlayoffs = event.matchups.some((matchup) => matchup.type === "playoff");
  const hasCourt1 = event.matchups.some((matchup) => matchup.courtId === "A");
  const hasCourt2 = event.matchups.some((matchup) => matchup.courtId === "B");

  return (
    <AccordionItem value={event.id} className="border-none">
      <Card className="overflow-hidden py-4 transition-all">
        <AccordionTrigger className="p-4 py-0 hover:no-underline">
          <div className="flex items-center gap-4">
            <div className="flex size-12 flex-col items-center justify-center rounded-lg bg-amber-500/10">
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {displayDate
                  .toLocaleDateString("es-MX", {
                    month: "short",
                  })
                  .toUpperCase()}
              </span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {displayDate.getDate()}
              </span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{formatDate(event.date)}</h3>
                {hasPlayoffs ? (
                  <Badge variant="secondary" className="text-xs">
                    Playoffs
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </AccordionTrigger>

        {event.matchups.length > 0 && (
          <AccordionContent className="pt-0">
            <div className="bg-muted/20 border-t">
              {/* Desktop Schedule Table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="bg-muted/30 border-b">
                      <th className="text-muted-foreground w-24 px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                        Hora
                      </th>
                      {hasCourt1 ? (
                        <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                          Cancha 1
                        </th>
                      ) : null}
                      {hasCourt2 ? (
                        <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                          Cancha 2
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSlots.map((slotIndex, idx) => {
                      const slot = matchupsBySlot.get(slotIndex)!;
                      return (
                        <tr
                          key={slotIndex}
                          className={
                            idx !== sortedSlots.length - 1
                              ? "border-muted/50 border-b"
                              : ""
                          }
                        >
                          <td className="px-4 py-3">
                            <span className="text-muted-foreground text-sm font-medium">
                              {getTimeForSlotIndex(slotIndex, slotTimeConfig)}
                            </span>
                          </td>
                          {hasCourt1 ? (
                            <td className="px-4 py-3">
                              {slot.court1 ? (
                                <MatchupCell matchup={slot.court1} />
                              ) : (
                                <EmptyCourtSlot />
                              )}
                            </td>
                          ) : null}
                          {hasCourt2 ? (
                            <td className="px-4 py-3">
                              {slot.court2 ? (
                                <MatchupCell matchup={slot.court2} />
                              ) : (
                                <EmptyCourtSlot />
                              )}
                            </td>
                          ) : null}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Schedule - Stacked Courts */}
              <div className="space-y-4 p-4 md:hidden">
                {sortedSlots.map((slotIndex) => {
                  const slot = matchupsBySlot.get(slotIndex)!;
                  return (
                    <div key={slotIndex} className="space-y-3">
                      <div className="text-muted-foreground flex items-center gap-2 text-sm font-semibold">
                        <Calendar className="size-4" />
                        {getTimeForSlotIndex(slotIndex, slotTimeConfig)}
                      </div>

                      {slot.court1 && (
                        <div className="space-y-1.5">
                          <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                            Cancha 1
                          </div>
                          <MatchupCell matchup={slot.court1} />
                        </div>
                      )}

                      {slot.court2 && (
                        <div className="space-y-1.5">
                          <div className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                            Cancha 2
                          </div>
                          <MatchupCell matchup={slot.court2} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </AccordionContent>
        )}
      </Card>
    </AccordionItem>
  );
}

function MatchupCell({ matchup }: { matchup: ScheduleEvent["matchups"][number] }) {
  return (
    <div className="bg-background flex flex-col gap-2 rounded-lg p-2.5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="w-fit text-xs">
          {matchup.category}
        </Badge>
        {matchup.label ? (
          <span className="text-muted-foreground text-xs font-medium">
            {matchup.label}
          </span>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <TeamSlot team={matchup.teamA} />
        <span className="text-muted-foreground hidden text-xs font-medium sm:inline">
          vs
        </span>
        <TeamSlot team={matchup.teamB} />
      </div>
    </div>
  );
}

function TeamSlot({ team }: { team: ScheduleEvent["matchups"][number]["teamA"] }) {
  if (!team || !team.name) {
    return (
      <div className="bg-muted/20 h-8 min-w-0 flex-1 rounded-md border border-dashed" />
    );
  }

  return <TeamBadge name={team.name} logoUrl={team.logoUrl} />;
}

function EmptyCourtSlot() {
  return (
    <div className="bg-background/60 text-muted-foreground/60 flex min-h-24 items-center justify-center rounded-lg border border-dashed">
      <span className="text-sm">Sin partido</span>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return formatEventDateForDisplay(dateStr).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
