import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import { relativeTime } from "../../utils/time";
import { useAppStyles } from "../theme/AppTheme";

export function ModerationDashboardScreen() {
  const EMAIL_SUFFIX = "@bl.students.amrita.edu";
  const styles = useAppStyles();
  const router = useRouter();
  const access = useQuery(api.moderation.getModerationAccess);
  const dashboard = useQuery(api.moderation.getModerationDashboard);
  const banUserByEmail = useMutation(api.moderation.banUserByEmail);
  const unbanUserByEmail = useMutation(api.moderation.unbanUserByEmail);
  const [reportFilter, setReportFilter] = useState<"unresolved" | "resolved">("unresolved");
  const [banEmail, setBanEmail] = useState("");
  const [isBanning, setIsBanning] = useState(false);
  const [unbanEmail, setUnbanEmail] = useState("");
  const [isUnbanning, setIsUnbanning] = useState(false);

  const normalizeLocalPart = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) return "";
    if (trimmed.includes("@")) return trimmed.split("@")[0] ?? "";
    if (trimmed.endsWith(EMAIL_SUFFIX)) return trimmed.slice(0, -EMAIL_SUFFIX.length);
    return trimmed;
  };

  const parseLocalParts = (value: string) =>
    value.split(",").map((part) => normalizeLocalPart(part)).filter((part) => part.length > 0);

  const buildCampusEmail = (localPart: string) => `${localPart}${EMAIL_SUFFIX}`;

  const filteredIncidents = useMemo(() => {
    if (!dashboard?.incidents?.length) return [];
    return dashboard.incidents.filter((report) => report.status === reportFilter);
  }, [dashboard, reportFilter]);

  const groupedIncidents = useMemo(() => {
    const groups: Record<string, typeof filteredIncidents> = {};
    for (const report of filteredIncidents) {
      if (!groups[report.categoryLabel]) groups[report.categoryLabel] = [];
      groups[report.categoryLabel].push(report);
    }
    return Object.entries(groups);
  }, [filteredIncidents]);

  const handleBan = async () => {
    if (!banEmail.trim() || isBanning) return;
    const parts = parseLocalParts(banEmail);
    if (parts.length === 0) {
      Alert.alert("Invalid input", "Enter at least one email prefix.");
      return;
    }
    const label = parts.length === 1 ? `1 user` : `${parts.length} users`;
    Alert.alert(
      `Ban ${label}?`,
      `${parts.map(buildCampusEmail).join(", ")}\n\nThey will be blocked from Noru and forced to sign out.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Ban",
          style: "destructive",
          onPress: async () => {
            try {
              setIsBanning(true);
              await Promise.all(parts.map((part) => banUserByEmail({ email: buildCampusEmail(part) })));
              setBanEmail("");
              Alert.alert("Banned", `${label.charAt(0).toUpperCase() + label.slice(1)} banned and forced to sign out.`);
            } catch (error) {
              Alert.alert("Could not ban", error instanceof Error ? error.message : "Please try again.");
            } finally {
              setIsBanning(false);
            }
          },
        },
      ],
    );
  };

  const handleUnban = async () => {
    if (!unbanEmail.trim() || isUnbanning) return;
    try {
      setIsUnbanning(true);
      const parts = parseLocalParts(unbanEmail);
      if (parts.length === 0) throw new Error("Enter at least one email prefix.");
      await Promise.all(parts.map((part) => unbanUserByEmail({ email: buildCampusEmail(part) })));
      setUnbanEmail("");
      Alert.alert("Unbanned", "The account bans have been removed.");
    } catch (error) {
      Alert.alert("Could not unban", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsUnbanning(false);
    }
  };

  if (access === undefined || dashboard === undefined) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#276EF1" />
      </View>
    );
  }

  if (!access.isAdmin) {
    return (
      <View style={styles.screenContainer}>
        <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
          <View style={styles.card}>
            <Text style={styles.title}>Moderation</Text>
            <Text style={styles.description}>Admin access required for this page.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.boardContent} showsVerticalScrollIndicator={false}>

          <View style={localStyles.pageHeader}>
            <Text style={styles.title}>Moderation</Text>
            <View style={styles.moderationStatRow}>
              <Text style={styles.moderationStatValue}>{dashboard.openReportsCount}</Text>
              <Text style={styles.moderationStatLabel}>open</Text>
              <Text style={styles.moderationStatSep}>·</Text>
              <Text style={styles.moderationStatValue}>{dashboard.activeUsersCount}</Text>
              <Text style={styles.moderationStatLabel}>active users</Text>
            </View>
          </View>

          {/* Report queue — primary task */}
          <View style={styles.card}>
            <View style={styles.vehicleRow}>
              <Pressable
                style={[styles.vehicleChip, reportFilter === "unresolved" && styles.vehicleChipSelected]}
                onPress={() => setReportFilter("unresolved")}
              >
                <Text style={[styles.vehicleChipText, reportFilter === "unresolved" && styles.vehicleChipTextSelected]}>
                  Unresolved
                </Text>
              </Pressable>
              <Pressable
                style={[styles.vehicleChip, reportFilter === "resolved" && styles.vehicleChipSelected]}
                onPress={() => setReportFilter("resolved")}
              >
                <Text style={[styles.vehicleChipText, reportFilter === "resolved" && styles.vehicleChipTextSelected]}>
                  Resolved
                </Text>
              </Pressable>
            </View>

            {filteredIncidents.length === 0 ? (
              <Text style={styles.description}>No {reportFilter} incidents.</Text>
            ) : (
              <View style={localStyles.reportGroups}>
                {groupedIncidents.map(([category, reports]) => (
                  <View key={category} style={localStyles.reportGroup}>
                    <View style={localStyles.groupHeader}>
                      <Text style={styles.sectionMarker}>{category}</Text>
                      <View style={localStyles.countBadge}>
                        <Text style={localStyles.countText}>{reports.length}</Text>
                      </View>
                    </View>
                    {reports.map((report, i) => (
                      <View key={report._id}>
                        {i > 0 && <View style={localStyles.itemDivider} />}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${category}: ${report.reportedName}, reported by ${report.reporterName}`}
                          style={({ pressed }) => [localStyles.reportItemCompact, pressed && styles.buttonPressed]}
                          onPress={() =>
                            router.push({
                              pathname: "/moderation/[reportId]",
                              params: { reportId: report._id },
                            })
                          }
                        >
                          <View style={localStyles.reportItemRow}>
                            <Text style={styles.postName}>{report.reportedName}</Text>
                            <Text style={localStyles.timeText}>{relativeTime(report.createdAt)}</Text>
                          </View>
                          <Text style={styles.postMeta}>by {report.reporterName}</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Manage users — secondary tools */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Manage users</Text>

            <View style={localStyles.toolSection}>
              <Text style={styles.sectionMarker}>Ban user</Text>
              <TextInput
                style={styles.input}
                value={banEmail}
                onChangeText={setBanEmail}
                placeholder="Bl.en.xx.xxx2xxxx"
                placeholderTextColor="#606060"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Text style={styles.postMeta}>{EMAIL_SUFFIX} · separate multiple with commas</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.buttonBase,
                  styles.buttonDanger,
                  (!banEmail.trim() || isBanning) && styles.buttonDisabled,
                  pressed && !isBanning && banEmail.trim() && styles.buttonPressed,
                ]}
                onPress={handleBan}
                disabled={!banEmail.trim() || isBanning}
              >
                <Text style={[styles.buttonText, styles.buttonTextDanger]}>
                  {isBanning ? "Banning..." : "Ban"}
                </Text>
              </Pressable>
            </View>

            <View style={localStyles.toolDivider} />

            <View style={localStyles.toolSection}>
              <Text style={styles.sectionMarker}>Unban user</Text>
              <TextInput
                style={styles.input}
                value={unbanEmail}
                onChangeText={setUnbanEmail}
                placeholder="Bl.en.xx.xxx2xxxx"
                placeholderTextColor="#606060"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Text style={styles.postMeta}>{EMAIL_SUFFIX} · separate multiple with commas</Text>
              <Pressable
                style={({ pressed }) => [
                  styles.buttonBase,
                  styles.buttonPrimary,
                  (!unbanEmail.trim() || isUnbanning) && styles.buttonDisabled,
                  pressed && !isUnbanning && unbanEmail.trim() && styles.buttonPressed,
                ]}
                onPress={handleUnban}
                disabled={!unbanEmail.trim() || isUnbanning}
              >
                <Text style={styles.buttonText}>
                  {isUnbanning ? "Unbanning..." : "Unban"}
                </Text>
              </Pressable>
            </View>
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const localStyles = StyleSheet.create({
  pageHeader: {
    gap: 4,
  },
  reportGroups: {
    gap: 22,
  },
  reportGroup: {
    gap: 0,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  countBadge: {
    backgroundColor: "#1E1E1E",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 11,
    fontFamily: "InterBold",
    color: "#8A8A8A",
  },
  reportItemCompact: {
    paddingVertical: 10,
    gap: 3,
  },
  itemDivider: {
    height: 1,
    backgroundColor: "#383838",
  },
  reportItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeText: {
    fontSize: 13,
    fontFamily: "InterMedium",
    color: "#8A8A8A",
  },
  toolSection: {
    gap: 10,
  },
  toolDivider: {
    height: 1,
    backgroundColor: "#383838",
  },
});
