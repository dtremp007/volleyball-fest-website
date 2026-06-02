import { format } from "date-fns";
import {
  formatEventDateForDisplay,
  getSlotDurationsByIndex,
  getSlotTimeConfigForEvent,
  getTimeForSlotIndexWithDurations,
} from "~/lib/schedule/slot-times";

const CATEGORY_COLORS: Record<string, string> = {
  "Varonil Libre": "#000000",
  "Segunda Fuerza": "#dc2626",
  Femenil: "#9333ea",
};

const W = 1080;
const H = 1080; // 3:4 aspect ratio
const PADDING = 48;
const LOGO_SIZE = 140;

type EventForImage = {
  id: string;
  name: string;
  date: string;
  matchups: Array<{
    id: string;
    teamA: { name: string };
    teamB: { name: string };
    category: string;
    courtId: string | null;
    slotIndex: number | null;
    duration?: number | null;
  }>;
};

function formatSlot(
  slotIndex: number | null,
  eventDate: string,
  slotDurations: Map<number, number>,
) {
  if (slotIndex === null) return "Unscheduled";
  return getTimeForSlotIndexWithDurations(
    slotIndex,
    slotDurations,
    getSlotTimeConfigForEvent(eventDate),
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }
      if (ctx.measureText(word).width <= maxWidth) {
        currentLine = word;
      } else {
        for (const char of word) {
          const test = currentLine + char;
          if (ctx.measureText(test).width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = char;
          } else {
            currentLine = test;
          }
        }
      }
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

async function loadLogo(baseUrl: string): Promise<HTMLImageElement | null> {
  try {
    const res = await fetch(`${baseUrl}/icon-no-bg-512.png`);
    if (!res.ok) return null;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  } catch {
    return null;
  }
}

function buildSlotRows(matchups: EventForImage["matchups"]) {
  const scheduledMatchups = matchups.filter((m) => m.slotIndex !== null);
  const hasCourtA = scheduledMatchups.some((matchup) => matchup.courtId === "A");
  const hasCourtB = scheduledMatchups.some((matchup) => matchup.courtId === "B");
  const slotRows = new Map<
    number,
    {
      courtA?: (typeof scheduledMatchups)[number];
      courtB?: (typeof scheduledMatchups)[number];
    }
  >();

  for (const matchup of scheduledMatchups) {
    const slotIndex = matchup.slotIndex!;
    const slot = slotRows.get(slotIndex) ?? {};
    if (matchup.courtId === "A") slot.courtA = matchup;
    if (matchup.courtId === "B") slot.courtB = matchup;
    slotRows.set(slotIndex, slot);
  }

  return {
    sortedSlotIndices: Array.from(slotRows.keys()).sort((a, b) => a - b),
    slotRows,
    hasCourtA,
    hasCourtB,
    unscheduledCount: matchups.length - scheduledMatchups.length,
  };
}

export function downloadScheduleImage(blob: Blob, eventName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${eventName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}_schedule.png`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function generateEventScheduleImage(
  event: EventForImage,
  baseUrl: string = typeof window !== "undefined" ? window.location.origin : "",
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available");

  const { sortedSlotIndices, slotRows, hasCourtA, hasCourtB, unscheduledCount } =
    buildSlotRows(event.matchups);
  const slotDurations = getSlotDurationsByIndex(event.matchups);

  const logo = await loadLogo(baseUrl);

  const LOGO_TO_TITLE_GAP = 32;
  const TOP_THIRD_OFFSET = 80; // Position content in top third of canvas

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  let y = TOP_THIRD_OFFSET;

  // Logo
  if (logo) {
    ctx.drawImage(logo, (W - LOGO_SIZE) / 2, y, LOGO_SIZE, LOGO_SIZE);
    y += LOGO_SIZE + LOGO_TO_TITLE_GAP;
  }

  // Title
  ctx.fillStyle = "#111827";
  ctx.font = "bold 36px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Volleyball Fest", W / 2, y);
  y += 44;

  // Date
  ctx.fillStyle = "#4b5563";
  ctx.font = "22px system-ui, sans-serif";
  ctx.fillText(format(formatEventDateForDisplay(event.date), "MMM d, yyyy"), W / 2, y);
  y += 40;

  // Legend
  ctx.font = "bold 18px system-ui, sans-serif";
  ctx.textAlign = "center";
  const legendItems = [
    { text: "VARONIL LIBRE", color: CATEGORY_COLORS["Varonil Libre"] },
    { text: "SEGUNDA FUERZA", color: CATEGORY_COLORS["Segunda Fuerza"] },
    { text: "FEMENIL", color: CATEGORY_COLORS["Femenil"] },
  ];
  legendItems.forEach((item, i) => {
    ctx.fillStyle = item.color;
    ctx.fillText(item.text, W * (0.25 + i * 0.25), y);
  });
  y += 36;

  // Table: team | vs | team | time | team | vs | team, collapsing unused courts.
  const tableLeft = PADDING;
  const tableRight = W - PADDING;
  const tableWidth = tableRight - tableLeft;
  const rowHeight = 56;
  const fontSize = 18;
  const parts =
    hasCourtA && hasCourtB
      ? [2, 1, 2, 1, 2, 1, 2]
      : hasCourtA
        ? [2, 1, 2, 1]
        : [1, 2, 1, 2];
  const partTotal = parts.reduce((a, b) => a + b, 0);
  const colWidths = parts.map((p) => (p / partTotal) * tableWidth);
  const colLefts = colWidths.map((_, i) => {
    return tableLeft + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
  });
  const colCenters = colWidths.map((w, i) => {
    const leftEdge = tableLeft + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
    return leftEdge + w / 2;
  });
  const firstTeamColumnIndex = hasCourtA ? 0 : 1;
  const teamColWidth = colWidths[firstTeamColumnIndex]! - 8; // padding for team columns
  const lineHeight = 20;
  const timeColumnIndex = hasCourtA && hasCourtB ? 3 : hasCourtA ? 3 : 0;

  const drawWrappedTeam = (
    text: string,
    centerX: number,
    centerY: number,
    maxWidth: number,
    color: string,
  ) => {
    ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    const lines = wrapText(ctx, text, maxWidth);
    const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, centerX, startY + i * lineHeight);
    });
  };

  const drawCourtMatchup = (
    matchup: EventForImage["matchups"][number] | undefined,
    indices: [number, number, number],
    rowCenterY: number,
  ) => {
    if (!matchup) return;

    const color = CATEGORY_COLORS[matchup.category] ?? "#374151";
    drawWrappedTeam(
      matchup.teamA.name.toUpperCase(),
      colCenters[indices[0]]!,
      rowCenterY,
      teamColWidth,
      color,
    );
    ctx.font = `${fontSize}px system-ui, sans-serif`;
    ctx.fillStyle = "#6b7280";
    ctx.fillText("vs", colCenters[indices[1]], rowCenterY);
    drawWrappedTeam(
      matchup.teamB.name.toUpperCase(),
      colCenters[indices[2]]!,
      rowCenterY,
      teamColWidth,
      color,
    );
  };

  if (sortedSlotIndices.length > 0) {
    const tableTop = y;

    ctx.strokeStyle = "#f3f4f6";
    ctx.lineWidth = 1;
    sortedSlotIndices.forEach((slotIndex, rowIndex) => {
      const slot = slotRows.get(slotIndex)!;

      // Alternating row background
      if (rowIndex % 2 === 1) {
        ctx.fillStyle = "#f9fafb";
        ctx.fillRect(tableLeft, y, tableWidth, rowHeight);
      }

      ctx.beginPath();
      ctx.moveTo(tableLeft, y);
      ctx.lineTo(tableRight, y);
      ctx.stroke();

      const rowCenterY = y + rowHeight / 2 + 5;

      ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
      ctx.textAlign = "center";

      if (hasCourtA) {
        drawCourtMatchup(slot.courtA, [0, 1, 2], rowCenterY);
      }

      ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
      ctx.fillStyle = "#374151";
      ctx.fillText(
        formatSlot(slotIndex, event.date, slotDurations),
        colCenters[timeColumnIndex],
        rowCenterY,
      );

      if (hasCourtB) {
        drawCourtMatchup(
          slot.courtB,
          hasCourtA ? [4, 5, 6] : [1, 2, 3],
          rowCenterY,
        );
      }

      y += rowHeight;
    });

    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.strokeRect(tableLeft, tableTop, tableWidth, y - tableTop);

    const timeColumnLeft = colLefts[timeColumnIndex]!;
    const timeColumnRight = timeColumnLeft + colWidths[timeColumnIndex]!;
    ctx.beginPath();
    if (timeColumnIndex > 0) {
      ctx.moveTo(timeColumnLeft, tableTop);
      ctx.lineTo(timeColumnLeft, y);
    }
    if (timeColumnIndex < colWidths.length - 1) {
      ctx.moveTo(timeColumnRight, tableTop);
      ctx.lineTo(timeColumnRight, y);
    }
    ctx.stroke();
  } else {
    ctx.fillStyle = "#6b7280";
    ctx.font = "italic 24px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("No games are currently scheduled for this event.", W / 2, y + 24);
    y += 60;
  }

  if (unscheduledCount > 0) {
    ctx.fillStyle = "#6b7280";
    ctx.font = "italic 20px system-ui, sans-serif";
    ctx.fillText(
      `${unscheduledCount} game${unscheduledCount === 1 ? "" : "s"} without a time slot are not shown.`,
      W / 2,
      y + 28,
    );
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to create blob"))),
      "image/png",
      1,
    );
  });
}
