import { Calendar } from "lucide-react";

import { getTimeForSlotIndex } from "~/components/schedule-builder/utils";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";

import type { ScheduleEvent } from "./types";
import { TeamBadge } from "./team-badge";

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

  return (
    <AccordionItem value={event.id} className="border-none">
      <Card className="overflow-hidden py-4 transition-all">
        <AccordionTrigger className="p-4 py-0 hover:no-underline">
          <div className="flex items-center gap-4">
            <div className="flex size-12 flex-col items-center justify-center rounded-lg bg-amber-500/10">
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {new Date(event.date)
                  .toLocaleDateString("es-MX", {
                    month: "short",
                  })
                  .toUpperCase()}
              </span>
              <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {new Date(event.date).getDate()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold">{formatDate(event.date)}</h3>
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
                      <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                        Cancha 1
                      </th>
                      <th className="text-muted-foreground px-4 py-3 text-left text-xs font-semibold tracking-wider uppercase">
                        Cancha 2
                      </th>
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
                              {getTimeForSlotIndex(slotIndex)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {slot.court1 ? (
                              <MatchupCell matchup={slot.court1} />
                            ) : (
                              <span className="text-muted-foreground/50 text-sm">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {slot.court2 ? (
                              <MatchupCell matchup={slot.court2} />
                            ) : (
                              <span className="text-muted-foreground/50 text-sm">—</span>
                            )}
                          </td>
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
                        {getTimeForSlotIndex(slotIndex)}
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
      {/* Category Badge - Above teams */}
      <Badge variant="outline" className="w-fit text-xs">
        {matchup.category}
      </Badge>

      {/* Teams - Full width */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <TeamBadge name={matchup.teamA.name} logoUrl={matchup.teamA.logoUrl} />
        <span className="text-muted-foreground hidden text-xs font-medium sm:inline">
          vs
        </span>
        <TeamBadge name={matchup.teamB.name} logoUrl={matchup.teamB.logoUrl} />
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
