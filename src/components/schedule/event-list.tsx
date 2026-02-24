import { Calendar } from "lucide-react";

import { Accordion } from "~/components/ui/accordion";
import { Badge } from "~/components/ui/badge";

import { EventAccordionItem } from "./event-accordion";
import type { ScheduleEvent } from "./types";

export function EventList({ schedule }: { schedule: ScheduleEvent[] }) {
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
          {schedule.map((event) => (
            <EventAccordionItem key={event.id} event={event} />
          ))}
        </Accordion>
      </div>
    </section>
  );
}

export type { ScheduleEvent };
