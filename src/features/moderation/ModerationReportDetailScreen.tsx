import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
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
        <SafeAreaView style={styles.safeArea}>
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
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Report detail</Text>
            <Text style={styles.description}>This report is unavailable or no longer exists.</Text>
            <AppButton title="Back to dashboard" onPress={() => router.replace("/moderation")} variant="secondary" />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.boardContent}>
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Report detail</Text>
            <Text style={styles.postName}>{selectedReport.categoryLabel} - {selectedReport.reportedName}</Text>
            <Text style={styles.postMeta}>Reported by {selectedReport.reporterName}</Text>
            <Text style={styles.postMeta}>Status: {selectedReport.status}</Text>
            <Text style={styles.moderationQuote}>"{selectedReport.details}"</Text>

            {selectedReport.rideContext ? (
              <>
                <Text style={styles.sectionLabel}>Ride context</Text>
                <View style={styles.moderationContextCard}>
                  <View style={styles.moderationContextRouteChip}>
                    <Text style={styles.moderationContextRouteText}>
                      {selectedReport.rideContext.startPoint} {"->"} {selectedReport.rideContext.endPoint}
                    </Text>
                  </View>

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
              <Text style={styles.postMeta}>No linked ride details.</Text>
            )}

            <View style={styles.quickRow}>
              <View style={styles.moderationActionFlex}>
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
              </View>
              <View style={styles.moderationActionFlex}>
                <AppButton title="Back to dashboard" onPress={() => router.replace("/moderation")} variant="secondary" />
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
