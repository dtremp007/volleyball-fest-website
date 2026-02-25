import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { format } from "date-fns";
import type { EventWithMatchups } from "~/lib/db/queries/schedule";

const TIME_SLOTS = ["4:15", "5:00", "5:45", "6:30", "7:15", "8:00", "8:45", "9:30"];

const CATEGORY_COLORS: Record<string, string> = {
  "Varonil Libre": "#000000",
  "Segunda Fuerza": "#dc2626",
  Femenil: "#9333ea",
};

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: "Helvetica",
    fontSize: 10,
    backgroundColor: "#ffffff",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  logo: {
    width: 56,
    height: 56,
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  subtitle: {
    color: "#4b5563",
    fontSize: 12,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  legendItem: {
    fontSize: 9,
    fontWeight: "bold",
  },
  table: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  rowAlt: {
    backgroundColor: "#f9fafb",
  },
  cellBase: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  teamCell: {
    width: "18.18%",
  },
  vsCell: {
    width: "9.09%",
  },
  timeCell: {
    width: "9.09%",
  },
  teamText: {
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 1.25,
  },
  vsText: {
    fontSize: 9,
    textAlign: "center",
    color: "#6b7280",
  },
  timeText: {
    fontSize: 9,
    textAlign: "center",
    color: "#374151",
    fontWeight: "bold",
  },
  emptyCellText: {
    fontSize: 9,
    textAlign: "center",
    color: "#9ca3af",
  },
  empty: {
    marginTop: 14,
    color: "#6b7280",
    fontStyle: "italic",
  },
  footer: {
    position: "absolute",
    left: 32,
    right: 32,
    bottom: 24,
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
  },
});

type Props = {
  events: EventWithMatchups[];
  baseUrl: string;
};

type EventMatchup = EventWithMatchups["matchups"][number];

function formatSlot(slotIndex: number | null) {
  if (slotIndex === null) return "Unscheduled";
  return TIME_SLOTS[slotIndex] ?? `Slot ${slotIndex + 1}`;
}

function wrapTeamName(name: string, maxCharsPerLine = 14) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return name;

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (word.length > maxCharsPerLine) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }
      for (let index = 0; index < word.length; index += maxCharsPerLine) {
        lines.push(word.slice(index, index + maxCharsPerLine));
      }
      continue;
    }

    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.slice(0, 3).join("\n");
}

function buildSlotRows(matchups: EventWithMatchups["matchups"]) {
  const scheduledMatchups = matchups.filter((matchup) => matchup.slotIndex !== null);
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
    unscheduledCount: matchups.length - scheduledMatchups.length,
  };
}

function CourtColumns({ matchup }: { matchup?: EventMatchup }) {
  if (!matchup) {
    return (
      <>
        <View style={[styles.cellBase, styles.teamCell]}>
          <Text style={styles.emptyCellText}>-</Text>
        </View>
        <View style={[styles.cellBase, styles.vsCell]}>
          <Text style={styles.emptyCellText}>-</Text>
        </View>
        <View style={[styles.cellBase, styles.teamCell]}>
          <Text style={styles.emptyCellText}>-</Text>
        </View>
      </>
    );
  }

  const matchupColor = CATEGORY_COLORS[matchup.category] ?? "#374151";

  return (
    <>
      <View style={[styles.cellBase, styles.teamCell]}>
        <Text style={[styles.teamText, { color: matchupColor }]}>
          {wrapTeamName(matchup.teamA.name.toUpperCase())}
        </Text>
      </View>
      <View style={[styles.cellBase, styles.vsCell]}>
        <Text style={styles.vsText}>vs</Text>
      </View>
      <View style={[styles.cellBase, styles.teamCell]}>
        <Text style={[styles.teamText, { color: matchupColor }]}>
          {wrapTeamName(matchup.teamB.name.toUpperCase())}
        </Text>
      </View>
    </>
  );
}

export function EventSheetDocument({ events, baseUrl }: Props) {
  return (
    <Document>
      {events.map((event) => {
        const { sortedSlotIndices, slotRows, unscheduledCount } = buildSlotRows(event.matchups);

        return (
          <Page key={event.id} size="A4" style={styles.page}>
            <View style={styles.headerContainer}>
              <Image src={`${baseUrl}/icon-no-bg-512.png`} style={styles.logo} />
              <Text style={styles.title}>Volleyball Fest</Text>
              <Text style={styles.subtitle}>{format(new Date(event.date), "MMM d, yyyy")}</Text>
            </View>

            <View style={styles.legendContainer}>
              <Text style={{ ...styles.legendItem, color: CATEGORY_COLORS["Varonil Libre"] }}>
                VARONIL LIBRE
              </Text>
              <Text style={{ ...styles.legendItem, color: CATEGORY_COLORS["Segunda Fuerza"] }}>
                SEGUNDA FUERZA
              </Text>
              <Text style={{ ...styles.legendItem, color: CATEGORY_COLORS["Femenil"] }}>
                FEMENIL
              </Text>
            </View>

            {sortedSlotIndices.length > 0 ? (
              <View style={styles.table}>
                {sortedSlotIndices.map((slotIndex, rowIndex) => {
                  const slot = slotRows.get(slotIndex)!;
                  return (
                    <View
                      key={slotIndex}
                      style={[styles.row, rowIndex % 2 === 1 ? styles.rowAlt : null]}
                    >
                      <CourtColumns matchup={slot.courtA} />
                      <View style={[styles.cellBase, styles.timeCell]}>
                        <Text style={styles.timeText}>{formatSlot(slotIndex)}</Text>
                      </View>
                      <CourtColumns matchup={slot.courtB} />
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.empty}>No games are currently scheduled for this event.</Text>
            )}

            {unscheduledCount > 0 && (
              <Text style={styles.empty}>
                {unscheduledCount} game{unscheduledCount === 1 ? "" : "s"} without a time slot
                are not shown.
              </Text>
            )}

            <Text style={styles.footer}>Generated by Volleyball Fest</Text>
          </Page>
        );
      })}
    </Document>
  );
}
