import { renderToBuffer } from "@react-pdf/renderer";
import { createFileRoute } from "@tanstack/react-router";
import { TeamSheetDocument } from "~/components/pdf/team-sheet";
import { db } from "~/lib/db";
import { getTeamById } from "~/lib/db/queries/team";

async function handleGetTeamPDF({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const teamId = url.searchParams.get("id");

    if (!teamId) {
      return new Response(JSON.stringify({ error: "Team ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const team = await getTeamById(db, teamId);

    if (!team) {
      return new Response(JSON.stringify({ error: "Team not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(<TeamSheetDocument team={team} />);

    // Create filename from team name
    const sanitizedName = team.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const filename = `${sanitizedName}_roster.pdf`;

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export const Route = createFileRoute("/api/team-pdf")({
  server: {
    handlers: {
      GET: handleGetTeamPDF,
    },
  },
});
