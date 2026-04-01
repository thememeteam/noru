import { useMutation, useQuery } from "convex/react";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppButton } from "../../components/AppButton";
import { useAppStyles } from "../theme/AppTheme";

export function ModerationDashboardScreen() {
  const styles = useAppStyles();
  const access = useQuery(api.moderation.getModerationAccess);
  const dashboard = useQuery(api.moderation.getModerationDashboard);
  const setIncidentStatus = useMutation(api.moderation.setIncidentStatus);

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const selectedReport = useMemo(() => {
    if (!dashboard?.incidents?.length) {
      return null;
    }

    if (!selectedReportId) {
      return dashboard.incidents[0];
    }

    return dashboard.incidents.find((item) => item._id === selectedReportId) ?? dashboard.incidents[0];
  }, [dashboard, selectedReportId]);

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
        <ActivityIndicator size="large" color="#b50246" />
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

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.boardContent}>
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Moderation dashboard</Text>
            <View style={styles.moderationMetricRow}>
              <View style={styles.moderationMetricCard}>
                <Text style={styles.moderationMetricValue}>{dashboard.openReportsCount}</Text>
                <Text style={styles.moderationMetricLabel}>Open reports</Text>
              </View>
              <View style={styles.moderationMetricCard}>
                <Text style={styles.moderationMetricValue}>{dashboard.activeUsersCount}</Text>
                <Text style={styles.moderationMetricLabel}>Active users</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Unresolved reports</Text>
            {dashboard.incidents.length === 0 ? (
              <Text style={styles.description}>No incidents found.</Text>
            ) : (
              <View style={styles.postList}>
                {dashboard.incidents.map((report) => {
                  const isSelected = selectedReport?._id === report._id;
                  return (
                    <View key={report._id} style={[styles.postItem, isSelected && styles.moderationSelectedItem]}>
                      <Text style={styles.postName}>{report.categoryLabel}</Text>
                      <Text style={styles.postMeta}>Reported: {report.reportedName} · by {report.reporterName}</Text>
                      <Text style={styles.postMeta}>Status: {report.status}</Text>
                      <AppButton title="View" onPress={() => setSelectedReportId(report._id)} variant="secondary" />
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Report detail</Text>
            {!selectedReport ? (
              <Text style={styles.description}>Select a report to view details.</Text>
            ) : (
              <>
                <Text style={styles.postName}>{selectedReport.categoryLabel} — {selectedReport.reportedName}</Text>
                <Text style={styles.moderationQuote}>"{selectedReport.details}"</Text>
                <Text style={styles.postMeta}>Status: {selectedReport.status}</Text>
                {selectedReport.rideContext ? (
                  <>
                    <Text style={styles.sectionLabel}>Ride context</Text>
                    <Text>
                      {selectedReport.rideContext.startPoint} {"->"} {selectedReport.rideContext.endPoint}
                    </Text>
                    <Text style={styles.postMeta}>{selectedReport.rideContext.vehicleType}</Text>
                    <Text style={styles.postMeta}>Host: {selectedReport.rideContext.riderName}</Text>
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
                </View>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
