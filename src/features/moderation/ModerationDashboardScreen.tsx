import { useMutation, useQuery } from "convex/react";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppButton } from "../../components/AppButton";
import { styles } from "../styles";

export function ModerationDashboardScreen() {
  const dashboard = useQuery(api.moderation.getModerationDashboard);
  const markResolved = useMutation(api.moderation.markReportResolved);
  const removeUser = useMutation(api.moderation.removeUser);

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const selectedReport = useMemo(() => {
    if (!dashboard?.unresolvedReports?.length) {
      return null;
    }

    if (!selectedReportId) {
      return dashboard.unresolvedReports[0];
    }

    return dashboard.unresolvedReports.find((item) => item._id === selectedReportId) ?? dashboard.unresolvedReports[0];
  }, [dashboard, selectedReportId]);

  const onResolve = async () => {
    if (!selectedReport || isResolving) {
      return;
    }

    try {
      setIsResolving(true);
      await markResolved({ reportId: selectedReport._id as Id<"userReports"> });
    } catch (error) {
      Alert.alert(
        "Could not resolve report",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsResolving(false);
    }
  };

  const onRemoveUser = async () => {
    if (!selectedReport || isRemoving) {
      return;
    }

    try {
      setIsRemoving(true);
      await removeUser({
        userId: selectedReport.reportedUserId,
        reason: `Removed from moderation dashboard report ${selectedReport._id}`,
      });
      await markResolved({ reportId: selectedReport._id as Id<"userReports"> });
    } catch (error) {
      Alert.alert(
        "Could not remove user",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsRemoving(false);
    }
  };

  if (dashboard === undefined) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#b50246" />
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
            {dashboard.unresolvedReports.length === 0 ? (
              <Text style={styles.description}>No unresolved reports.</Text>
            ) : (
              <View style={styles.postList}>
                {dashboard.unresolvedReports.map((report) => {
                  const isSelected = selectedReport?._id === report._id;
                  return (
                    <View key={report._id} style={[styles.postItem, isSelected && styles.moderationSelectedItem]}>
                      <Text style={styles.postName}>{report.categoryLabel}</Text>
                      <Text style={styles.postMeta}>Reported: {report.reportedName} · by {report.reporterName}</Text>
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
                <View style={styles.quickRow}>
                  <View style={styles.moderationActionFlex}>
                    <AppButton
                      title={isResolving ? "Resolving..." : "Mark resolved"}
                      onPress={() => void onResolve()}
                      disabled={isResolving}
                      variant="secondary"
                    />
                  </View>
                  <View style={styles.moderationActionFlex}>
                    <AppButton
                      title={isRemoving ? "Removing..." : "Remove user"}
                      onPress={() => void onRemoveUser()}
                      disabled={isRemoving}
                      variant="danger"
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
