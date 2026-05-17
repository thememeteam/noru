import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppButton } from "../../components/AppButton";
import { useAppStyles } from "../theme/AppTheme";

export function ModerationReportDetailScreen() {
  const styles = useAppStyles();
  const router = useRouter();
  const { reportId: reportIdParam } = useLocalSearchParams<{ reportId?: string | string[] }>();
  const reportId = Array.isArray(reportIdParam) ? reportIdParam[0] : reportIdParam;

  const access = useQuery(api.moderation.getModerationAccess);
  const dashboard = useQuery(api.moderation.getModerationDashboard);
  const setIncidentStatus = useMutation(api.moderation.setIncidentStatus);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const selectedReport = useMemo(() => {
    if (!dashboard?.incidents?.length || !reportId) {
      return null;
    }

    return dashboard.incidents.find((item) => item._id === reportId) ?? null;
  }, [dashboard, reportId]);

  const onToggleStatus = async () => {
    if (!selectedReport || isUpdatingStatus) {
      return;
    }

    try {
      setIsUpdatingStatus(true);
      await setIncidentStatus({
        reportId: selectedReport._id as Id<"userReports">,
        status: selectedReport.status === "resolved" ? "unresolved" : "resolved",
      });
    } catch (error) {
      Alert.alert(
        "Could not update incident",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (access === undefined || dashboard === undefined) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#1E6CCC" />
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

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.boardContent} showsVerticalScrollIndicator={false}>
          {/* Status banner */}
          <View style={[reportDetailStyles.statusBanner, selectedReport.status === "resolved" ? reportDetailStyles.statusBannerResolved : reportDetailStyles.statusBannerOpen]}>
            <Text style={[reportDetailStyles.statusBannerText, selectedReport.status === "resolved" ? reportDetailStyles.statusBannerTextResolved : reportDetailStyles.statusBannerTextOpen]}>
              {selectedReport.status === "resolved" ? "RESOLVED" : "OPEN"}
            </Text>
          </View>

          {/* Category & reported user */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>INCIDENT</Text>
            <Text style={reportDetailStyles.categoryTitle}>{selectedReport.categoryLabel}</Text>
            <View>
              <View style={[styles.moderationContextRow, { paddingVertical: 6 }]}>
                <Text style={styles.moderationContextLabel}>Reported user</Text>
                <Text style={styles.moderationContextValue}>{selectedReport.reportedName}</Text>
              </View>
              <View style={styles.moderationContextDivider} />
              <View style={[styles.moderationContextRow, { paddingVertical: 6 }]}>
                <Text style={styles.moderationContextLabel}>Reported by</Text>
                <Text style={styles.moderationContextValue}>{selectedReport.reporterName}</Text>
              </View>
              <View style={styles.moderationContextDivider} />
              <View style={[styles.moderationContextRow, { paddingVertical: 6 }]}>
                <Text style={styles.moderationContextLabel}>Submitted at</Text>
                <Text style={styles.moderationContextValue}>{new Date(selectedReport.createdAt).toLocaleString()}</Text>
              </View>
            </View>
          </View>

          {/* Details */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>REPORTER'S DESCRIPTION</Text>
            <Text style={[reportDetailStyles.detailsText, { fontStyle: "italic" }]}>{selectedReport.details}</Text>
          </View>

          {/* Ride context */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>LINKED RIDE</Text>
            {selectedReport.rideContext ? (
              <>
                <Text style={reportDetailStyles.routeText}>
                  {selectedReport.rideContext.startPoint} → {selectedReport.rideContext.endPoint}
                </Text>
                <View>
                  <View style={[styles.moderationContextRow, { paddingVertical: 6 }]}>
                    <Text style={styles.moderationContextLabel}>Vehicle</Text>
                    <Text style={styles.moderationContextValue}>{selectedReport.rideContext.vehicleType}</Text>
                  </View>
                  <View style={styles.moderationContextDivider} />
                  <View style={[styles.moderationContextRow, { paddingVertical: 6 }]}>
                    <Text style={styles.moderationContextLabel}>Host</Text>
                    <Text style={styles.moderationContextValue}>{selectedReport.rideContext.riderName}</Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.description}>No linked ride.</Text>
            )}
          </View>

          {/* Actions */}
          <View style={styles.buttonRow}>
            <AppButton
              title={
                isUpdatingStatus
                  ? "Updating..."
                  : selectedReport.status === "resolved"
                    ? "Mark unresolved"
                    : "Mark resolved"
              }
              onPress={() => void onToggleStatus()}
              disabled={isUpdatingStatus}
              variant="secondary"
            />
            <AppButton title="Back" onPress={() => router.back()} variant="secondary" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const reportDetailStyles = StyleSheet.create({
  statusBanner: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  statusBannerOpen: {
    backgroundColor: "#1F3654",
  },
  statusBannerResolved: {
    backgroundColor: "#052E16",
  },
  statusBannerText: {
    fontSize: 12,
    fontFamily: "InterBold",
    letterSpacing: 1,
  },
  statusBannerTextOpen: {
    color: "#DBEAFE",
  },
  statusBannerTextResolved: {
    color: "#86EFAC",
  },
  categoryTitle: {
    color: "#F3F4F6",
    fontSize: 20,
    fontFamily: "InterBold",
  },
  detailsText: {
    color: "#E5E7EB",
    fontSize: 15,
    lineHeight: 23,
    fontFamily: "InterMedium",
  },
  routeText: {
    color: "#F3F4F6",
    fontSize: 17,
    fontFamily: "InterBold",
  },
});
