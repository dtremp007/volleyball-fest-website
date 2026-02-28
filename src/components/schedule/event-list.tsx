import { useState } from "react";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";

import { Accordion } from "~/components/ui/accordion";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

import { EventAccordionItem } from "./event-accordion";
import type { ScheduleEvent } from "./types";

export function EventList({ schedule }: { schedule: ScheduleEvent[] }) {
  const [expanded, setExpanded] = useState(false);
  const displayedEvents = expanded ? schedule : schedule.slice(0, 4);
  const hasMore = schedule.length > 4;
  const defaultValue = schedule[0]?.id;

  return (
    <section id="schedule" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <Badge variant="secondary" className="mb-4">
            <Calendar className="mr-1 size-3" />
            Calendario
          </Badge>
          <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
            Calendario de Partidos
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl">
            Todas las jornadas programadas para esta temporada
          </p>
        </div>

        <Accordion
          type="single"
          collapsible
          defaultValue={defaultValue}
          className="space-y-4"
        >
          {displayedEvents.map((event) => (
            <EventAccordionItem key={event.id} event={event} />
          ))}
        </Accordion>

        {hasMore && (
          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              onClick={() => setExpanded(!expanded)}
              className="gap-2"
            >
              {expanded ? (
                <>
                  Ver menos
                  <ChevronUp className="size-4" />
                </>
              ) : (
                <>
                  Ver más
                  <ChevronDown className="size-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

export type { ScheduleEvent };
