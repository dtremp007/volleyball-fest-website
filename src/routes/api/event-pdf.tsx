import { renderToBuffer } from "@react-pdf/renderer";
import { createFileRoute } from "@tanstack/react-router";
import { EventSheetDocument } from "~/components/pdf/event-sheet";
import { db } from "~/lib/db";
import { getEventWithMatchupsById } from "~/lib/db/queries/schedule";

async function handleGetEventPDF({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const eventId = url.searchParams.get("id");

    if (!eventId) {
      return new Response(JSON.stringify({ error: "Event ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const event = await getEventWithMatchupsById(db, eventId);

    if (!event) {
      return new Response(JSON.stringify({ error: "Event not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const baseUrl = `${url.protocol}//${url.host}`;

    const pdfBuffer = await renderToBuffer(
      <EventSheetDocument event={event} baseUrl={baseUrl} />,
    );
    const pdfBytes = Uint8Array.from(pdfBuffer);
    const sanitizedName = event.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const filename = `${sanitizedName}_event_schedule.pdf`;

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
        error: "Failed to generate event PDF",
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
