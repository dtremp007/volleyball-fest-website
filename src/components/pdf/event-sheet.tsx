import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { format } from "date-fns";
import type { EventWithMatchups } from "~/lib/db/queries/schedule";

const TIME_SLOTS = [
  "4:15 PM",
  "5:00 PM",
  "5:45 PM",
  "6:30 PM",
  "7:15 PM",
  "8:00 PM",
  "8:45 PM",
  "9:30 PM",
];

const CATEGORY_COLORS: Record<string, string> = {
  "Varonil Libre": "#000000",
  "Segunda Fuerza": "#dc2626", // Red
  Femenil: "#9333ea", // Purple
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Helvetica",
    fontSize: 10,
    backgroundColor: "#ffffff",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 60,
    height: 60,
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
    paddingHorizontal: 20,
  },
  legendItem: {
    fontSize: 10,
    fontWeight: "bold",
  },
  table: {
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    borderBottom: "1px solid #f3f4f6",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  headerRow: {
    backgroundColor: "#111827",
  },
  headerCell: {
    color: "#ffffff",
    fontWeight: "bold",
    textTransform: "uppercase",
    fontSize: 9,
    letterSpacing: 0.4,
  },
  cell: {
    color: "#374151",
    fontSize: 10,
  },
  colTime: {
    width: "20%",
    textAlign: "center",
  },
  colCourtA: {
    width: "40%",
    textAlign: "center",
  },
  colCourtB: {
    width: "40%",
    textAlign: "center",
  },
  matchupText: {
    fontSize: 10,
    textAlign: "center",
    fontWeight: "bold",
  },
  emptyCell: {
    fontSize: 10,
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
    left: 36,
    right: 36,
    bottom: 24,
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 8,
    borderTop: "1px solid #e5e7eb",
    paddingTop: 8,
  },
});

type Props = {
  event: EventWithMatchups;
  baseUrl: string;
};

function formatSlot(slotIndex: number | null) {
  if (slotIndex === null) return "Unscheduled";
  return TIME_SLOTS[slotIndex] ?? `Slot ${slotIndex + 1}`;
}

function formatMatchup(matchup: {
  teamA: { name: string };
  teamB: { name: string };
  category: string;
}) {
  return `${matchup.teamA.name} vs ${matchup.teamB.name}`;
}

export function EventSheetDocument({ event, baseUrl }: Props) {
  const scheduledMatchups = event.matchups.filter(
    (matchup) => matchup.slotIndex !== null,
  );
  const unscheduledCount = event.matchups.length - scheduledMatchups.length;

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

  const sortedSlotIndices = Array.from(slotRows.keys()).sort((a, b) => a - b);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerContainer}>
          <Image src={`${baseUrl}/icon-no-bg-512.png`} style={styles.logo} />
          <Text style={styles.title}>Volleyball Fest</Text>
          <Text style={styles.subtitle}>
            {format(new Date(event.date), "MMM d, yyyy")}
          </Text>
        </View>

        <View style={styles.legendContainer}>
          <Text style={{ ...styles.legendItem, color: CATEGORY_COLORS["Varonil Libre"] }}>
            VARONIL LIBRE
          </Text>
          <Text
            style={{ ...styles.legendItem, color: CATEGORY_COLORS["Segunda Fuerza"] }}
          >
            SEGUNDA FUERZA
          </Text>
          <Text style={{ ...styles.legendItem, color: CATEGORY_COLORS["Femenil"] }}>
            FEMENIL
          </Text>
        </View>

        {sortedSlotIndices.length > 0 ? (
          <View style={styles.table}>
            <View style={[styles.row, styles.headerRow]}>
              <Text style={[styles.headerCell, styles.colCourtA]}>Court A</Text>
              <Text style={[styles.headerCell, styles.colTime]}>Time</Text>
              <Text style={[styles.headerCell, styles.colCourtB]}>Court B</Text>
            </View>
            {sortedSlotIndices.map((slotIndex) => {
              const slot = slotRows.get(slotIndex)!;
              return (
                <View key={slotIndex} style={styles.row}>
                  <View style={styles.colCourtA}>
                    {slot.courtA ? (
                      <Text
                        style={[
                          styles.matchupText,
                          { color: CATEGORY_COLORS[slot.courtA.category] || "#374151" },
                        ]}
                      >
                        {formatMatchup(slot.courtA)}
                      </Text>
                    ) : (
                      <Text style={styles.emptyCell}>-</Text>
                    )}
                  </View>
                  <Text style={[styles.cell, styles.colTime]}>
                    {formatSlot(slotIndex)}
                  </Text>
                  <View style={styles.colCourtB}>
                    {slot.courtB ? (
                      <Text
                        style={[
                          styles.matchupText,
                          { color: CATEGORY_COLORS[slot.courtB.category] || "#374151" },
                        ]}
                      >
                        {formatMatchup(slot.courtB)}
                      </Text>
                    ) : (
                      <Text style={styles.emptyCell}>-</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.empty}>
            No games are currently scheduled for this event.
          </Text>
        )}
        {unscheduledCount > 0 && (
          <Text style={styles.empty}>
            {unscheduledCount} game{unscheduledCount === 1 ? "" : "s"} without a time slot
            are not shown in this table.
          </Text>
        )}

        <Text style={styles.footer}>Generated by Volleyball Fest</Text>
      </Page>
    </Document>
  );
}
