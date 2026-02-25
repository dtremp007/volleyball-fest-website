import { renderToBuffer } from "@react-pdf/renderer";
import { createFileRoute } from "@tanstack/react-router";
import { EventSheetDocument } from "~/components/pdf/event-sheet";
import { db } from "~/lib/db";
import { getEventsWithMatchupsBySeasonId } from "~/lib/db/queries/schedule";

async function handleGetEventPDF({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const seasonId = url.searchParams.get("seasonId");

    if (!seasonId) {
      return new Response(JSON.stringify({ error: "Season ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const events = await getEventsWithMatchupsBySeasonId(db, seasonId);

    if (events.length === 0) {
      return new Response(JSON.stringify({ error: "No events found for this season" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const baseUrl = url.origin;

    const pdfBuffer = await renderToBuffer(<EventSheetDocument events={events} baseUrl={baseUrl} />);
    const pdfBytes = Uint8Array.from(pdfBuffer);
    const sanitizedName = events[0]!.season.name
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();
    const filename = `${sanitizedName}_season_schedule.pdf`;

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Event PDF generation error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate season PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export const Route = createFileRoute("/api/event-pdf")({
  server: {
    handlers: {
      GET: handleGetEventPDF,
    },
  },
});
