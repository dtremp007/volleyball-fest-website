import { renderToBuffer } from "@react-pdf/renderer";
import { createFileRoute } from "@tanstack/react-router";
import { EventSheetDocument } from "~/components/pdf/event-sheet";
import { db } from "~/lib/db";
import { getPlayoffEventsWithMatchupsBySeasonId } from "~/lib/db/queries/playoff";

async function handleGetPlayoffEventPDF({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const seasonId = url.searchParams.get("seasonId");

    if (!seasonId) {
      return new Response(JSON.stringify({ error: "Season ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const events = await getPlayoffEventsWithMatchupsBySeasonId(db, seasonId);

    if (events.length === 0) {
      return new Response(
        JSON.stringify({ error: "No playoff events found for this season" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const baseUrl = url.origin;
    const pdfBuffer = await renderToBuffer(
      <EventSheetDocument events={events} baseUrl={baseUrl} />,
    );
    const pdfBytes = Uint8Array.from(pdfBuffer);
    const sanitizedName = events[0]!.season.name
      .replace(/[^a-zA-Z0-9]/g, "_")
      .toLowerCase();
    const filename = `${sanitizedName}_playoff_schedule.pdf`;

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Playoff event PDF generation error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate playoff schedule PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export const Route = createFileRoute("/api/playoff-event-pdf")({
  server: {
    handlers: {
      GET: handleGetPlayoffEventPDF,
    },
  },
});
