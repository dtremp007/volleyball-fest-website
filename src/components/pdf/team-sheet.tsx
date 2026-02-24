import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { env } from "~/env/server";
import { formatUnavailableDates, parseUnavailableDates } from "~/lib/unavailable-dates";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    borderBottom: "2px solid #374151",
    paddingBottom: 16,
  },
  logo: {
    width: 64,
    height: 64,
    marginRight: 16,
    borderRadius: 8,
    objectFit: "cover",
  },
  logoPlaceholder: {
    width: 64,
    height: 64,
    marginRight: 16,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  logoPlaceholderText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#6b7280",
  },
  headerInfo: {
    flex: 1,
  },
  siteLogo: {
    width: 48,
    height: 48,
  },
  teamName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  category: {
    fontSize: 12,
    color: "#374151",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 10,
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 4,
  },
  contactGrid: {
    flexDirection: "row",
    gap: 24,
  },
  contactCard: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 6,
    border: "1px solid #e2e8f0",
  },
  contactLabel: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  contactName: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 10,
    color: "#475569",
  },
  table: {
    borderRadius: 6,
    overflow: "hidden",
    border: "1px solid #e2e8f0",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#374151",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  tableHeaderCell: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottom: "1px solid #e5e7eb",
  },
  tableRowAlt: {
    backgroundColor: "#f8fafc",
  },
  tableCell: {
    fontSize: 10,
    color: "#334155",
  },
  colNumber: {
    width: "15%",
  },
  colName: {
    width: "50%",
  },
  colPosition: {
    width: "35%",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  detailItem: {
    width: "48%",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 6,
    border: "1px solid #e2e8f0",
  },
  detailLabel: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 10,
    color: "#1e293b",
  },
  notesSection: {
    width: "100%",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 8,
    borderTop: "1px solid #e5e7eb",
    paddingTop: 10,
  },
  emptyRoster: {
    padding: 20,
    textAlign: "center",
    color: "#64748b",
    fontStyle: "italic",
  },
});

export type TeamPDFData = {
  id: string;
  name: string;
  logoUrl: string;
  captainName: string;
  captainPhone: string;
  coCaptainName: string;
  coCaptainPhone: string;
  unavailableDates: string;
  comingFrom: string;
  notes: string | null;
  season: { id: string; name: string };
  category: { id: string; name: string };
  players: {
    id: string;
    name: string;
    jerseyNumber: string;
    position: { id: string; name: string } | null;
  }[];
};

type Props = {
  team: TeamPDFData;
};

export function TeamSheetDocument({ team }: Props) {
  const hasPlayers = team.players.length > 0;
  const unavailableDateValues = parseUnavailableDates(team.unavailableDates);
  const unavailableDatesLabel = formatUnavailableDates(team.unavailableDates);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {team.logoUrl ? (
            <Image src={team.logoUrl} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>
                {team.name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.teamName}>{team.name}</Text>
            <Text style={styles.category}>{team.category.name}</Text>
          </View>
          <Image
            src={env.VITE_BASE_URL + "/icon-no-bg-512.png"}
            style={styles.siteLogo}
          />
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactGrid}>
            <View style={styles.contactCard}>
              <Text style={styles.contactLabel}>Captain</Text>
              <Text style={styles.contactName}>{team.captainName}</Text>
              <Text style={styles.contactPhone}>{team.captainPhone}</Text>
            </View>
            <View style={styles.contactCard}>
              <Text style={styles.contactLabel}>Co-Captain</Text>
              <Text style={styles.contactName}>{team.coCaptainName}</Text>
              <Text style={styles.contactPhone}>{team.coCaptainPhone}</Text>
            </View>
          </View>
        </View>

        {/* Team Roster */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Team Roster ({team.players.length} players)
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colNumber]}>#</Text>
              <Text style={[styles.tableHeaderCell, styles.colName]}>Player Name</Text>
              <Text style={[styles.tableHeaderCell, styles.colPosition]}>Position</Text>
            </View>
            {hasPlayers ? (
              team.players.map((player, index) => (
                <View
                  key={player.id}
                  style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
                >
                  <Text style={[styles.tableCell, styles.colNumber]}>
                    {player.jerseyNumber || "-"}
                  </Text>
                  <Text style={[styles.tableCell, styles.colName]}>{player.name}</Text>
                  <Text style={[styles.tableCell, styles.colPosition]}>
                    {player.position?.name || "-"}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyRoster}>
                <Text>No players registered yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Additional Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Details</Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Season</Text>
              <Text style={styles.detailValue}>{team.season.name}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Coming From</Text>
              <Text style={styles.detailValue}>{team.comingFrom || "Not specified"}</Text>
            </View>
            {unavailableDateValues.length > 0 && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Unavailable Dates</Text>
                <Text style={styles.detailValue}>{unavailableDatesLabel}</Text>
              </View>
            )}
            {team.notes && (
              <View style={[styles.detailItem, styles.notesSection]}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={styles.detailValue}>{team.notes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Volleyball Fest</Text>
      </Page>
    </Document>
  );
}
