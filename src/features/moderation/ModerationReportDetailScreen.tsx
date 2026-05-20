import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppButton } from "../../components/AppButton";
import { relativeTime } from "../../utils/time";
import { useAppStyles } from "../theme/AppTheme";

export function ModerationReportDetailScreen() {
  const styles = useAppStyles();
  const router = useRouter();
  const { reportId: reportIdParam } = useLocalSearchParams<{ reportId?: string | string[] }>();
  const reportId = Array.isArray(reportIdParam) ? reportIdParam[0] : reportIdParam;

  const access = useQuery(api.moderation.getModerationAccess);
  const dashboard = useQuery(api.moderation.getModerationDashboard);
  const setIncidentStatus = useMutation(api.moderation.setIncidentStatus);
  const banUserFromReport = useMutation(api.moderation.banUserFromReport);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isBanning, setIsBanning] = useState(false);

  const selectedReport = useMemo(() => {
    if (!dashboard?.incidents?.length || !reportId) return null;
    return dashboard.incidents.find((item) => item._id === reportId) ?? null;
  }, [dashboard, reportId]);

  const onToggleStatus = async () => {
    if (!selectedReport || isUpdatingStatus) return;
    try {
      setIsUpdatingStatus(true);
      await setIncidentStatus({
        reportId: selectedReport._id as Id<"userReports">,
        status: selectedReport.status === "resolved" ? "unresolved" : "resolved",
      });
    } catch (error) {
      Alert.alert("Could not update incident", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const onBanUser = () => {
    if (!selectedReport || isBanning) return;
    Alert.alert(
      `Ban ${selectedReport.reportedName}?`,
      "They will be blocked from Noru and forced to sign out. This cannot be undone from this screen.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Ban",
          style: "destructive",
          onPress: async () => {
            try {
              setIsBanning(true);
              await banUserFromReport({ reportId: selectedReport._id as Id<"userReports"> });
              Alert.alert("User banned", `${selectedReport.reportedName} has been banned.`);
              router.back();
            } catch (error) {
              Alert.alert("Could not ban user", error instanceof Error ? error.message : "Please try again.");
            } finally {
              setIsBanning(false);
            }
          },
        },
      ],
    );
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

  if (!reportId || !selectedReport) {
    return (
      <View style={styles.screenContainer}>
        <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Report detail</Text>
            <Text style={styles.description}>This report is unavailable or no longer exists.</Text>
            <AppButton title="Back to dashboard" onPress={() => router.back()} variant="secondary" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const isResolved = selectedReport.status === "resolved";

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.boardContent} showsVerticalScrollIndicator={false}>

          {/* Incident — status badge anchored in the header row */}
          <View style={styles.card}>
            <View style={reportDetailStyles.incidentHeader}>
              <Text style={reportDetailStyles.categoryTitle}>{selectedReport.categoryLabel}</Text>
              <View style={[reportDetailStyles.statusBadge, isResolved ? reportDetailStyles.statusBadgeResolved : reportDetailStyles.statusBadgeOpen]}>
                <Text style={[reportDetailStyles.statusBadgeText, isResolved ? reportDetailStyles.statusBadgeTextResolved : reportDetailStyles.statusBadgeTextOpen]}>
                  {isResolved ? "RESOLVED" : "OPEN"}
                </Text>
              </View>
            </View>
            <View>
              <View style={styles.moderationContextRow}>
                <Text style={styles.moderationContextLabel}>Reported user</Text>
                <Text style={styles.moderationContextValue}>{selectedReport.reportedName}</Text>
              </View>
              <View style={styles.moderationContextDivider} />
              <View style={styles.moderationContextRow}>
                <Text style={styles.moderationContextLabel}>Reported by</Text>
                <Text style={styles.moderationContextValue}>{selectedReport.reporterName}</Text>
              </View>
              <View style={styles.moderationContextDivider} />
              <View style={styles.moderationContextRow}>
                <Text style={styles.moderationContextLabel}>Submitted</Text>
                <Text style={styles.moderationContextValue}>{relativeTime(selectedReport.createdAt)}</Text>
              </View>
            </View>
          </View>

          {/* Reporter's description */}
          <View style={styles.card}>
            <Text style={styles.sectionMarker}>Reporter's description</Text>
            <Text style={reportDetailStyles.detailsText}>{selectedReport.details}</Text>
          </View>

          {/* Linked ride */}
          <View style={styles.card}>
            <Text style={styles.sectionMarker}>Linked ride</Text>
            {selectedReport.rideContext ? (
              <>
                <Text style={reportDetailStyles.routeText}>
                  {selectedReport.rideContext.startPoint} → {selectedReport.rideContext.endPoint}
                </Text>
                <View>
                  <View style={styles.moderationContextRow}>
                    <Text style={styles.moderationContextLabel}>Vehicle</Text>
                    <Text style={styles.moderationContextValue}>{selectedReport.rideContext.vehicleType}</Text>
                  </View>
                  <View style={styles.moderationContextDivider} />
                  <View style={styles.moderationContextRow}>
                    <Text style={styles.moderationContextLabel}>Host</Text>
                    <Text style={styles.moderationContextValue}>{selectedReport.rideContext.riderName}</Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.description}>No linked ride.</Text>
            )}
          </View>

          {/* Actions — status toggle + ban, separated by weight */}
          <View style={styles.buttonRow}>
            <AppButton
              title={isUpdatingStatus ? "Updating..." : isResolved ? "Mark unresolved" : "Mark resolved"}
              onPress={() => void onToggleStatus()}
              disabled={isUpdatingStatus}
              variant="secondary"
            />
            <View style={reportDetailStyles.banSeparator} />
            <AppButton
              title={isBanning ? "Banning..." : "Ban user"}
              onPress={onBanUser}
              disabled={isBanning}
              variant="danger"
            />
          </View>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const reportDetailStyles = StyleSheet.create({
  incidentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  categoryTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 20,
    fontFamily: "InterBold",
  },
  statusBadge: {
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  statusBadgeOpen: {
    backgroundColor: "#1A2C45",
  },
  statusBadgeResolved: {
    backgroundColor: "#052E16",
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: "InterBold",
    letterSpacing: 0.6,
  },
  statusBadgeTextOpen: {
    color: "#DBEAFE",
  },
  statusBadgeTextResolved: {
    color: "#86EFAC",
  },
  detailsText: {
    color: "#D0D0D0",
    fontSize: 15,
    lineHeight: 26,
    fontFamily: "InterMedium",
    fontStyle: "italic",
  },
  routeText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "InterBold",
  },
  banSeparator: {
    height: 1,
    backgroundColor: "#383838",
    marginVertical: 4,
  },
});
