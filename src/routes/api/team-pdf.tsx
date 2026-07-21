import { renderToBuffer } from "@react-pdf/renderer";
import { createFileRoute } from "@tanstack/react-router";
import { TeamSheetDocument } from "~/components/pdf/team-sheet";
import { auth } from "~/lib/auth/auth";
import { db } from "~/lib/db";
import { getTeamForSeason } from "~/lib/db/queries/team";

async function handleGetTeamPDF({ request }: { request: Request }) {
  try {
    const url = new URL(request.url);
    const teamId = url.searchParams.get("teamId");
    const seasonId = url.searchParams.get("seasonId");

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!teamId || !seasonId) {
      return new Response(
        JSON.stringify({ error: "Season ID and team ID are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const team = await getTeamForSeason(db, seasonId, teamId);

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

    return new Response(pdfBuffer as unknown as BodyInit, {
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
