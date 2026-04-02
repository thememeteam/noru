import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import { AppButton } from "../../components/AppButton";
import { useAppStyles } from "../theme/AppTheme";

export function ModerationDashboardScreen() {
  const styles = useAppStyles();
  const router = useRouter();
  const access = useQuery(api.moderation.getModerationAccess);
  const dashboard = useQuery(api.moderation.getModerationDashboard);
  const [reportFilter, setReportFilter] = useState<"unresolved" | "resolved">("unresolved");

  const filteredIncidents = useMemo(() => {
    if (!dashboard?.incidents?.length) {
      return [];
    }

    return dashboard.incidents.filter((report) => report.status === reportFilter);
  }, [dashboard, reportFilter]);

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

            <View style={styles.moderationFilterRow}>
              <View style={styles.moderationFilterButtonWrap}>
                <AppButton
                  title="Unresolved"
                  onPress={() => setReportFilter("unresolved")}
                  variant={reportFilter === "unresolved" ? "primary" : "secondary"}
                />
              </View>
              <View style={styles.moderationFilterButtonWrap}>
                <AppButton
                  title="Resolved"
                  onPress={() => setReportFilter("resolved")}
                  variant={reportFilter === "resolved" ? "primary" : "secondary"}
                />
              </View>
            </View>

            <Text style={styles.sectionLabel}>{reportFilter === "unresolved" ? "Unresolved reports" : "Resolved reports"}</Text>
            {filteredIncidents.length === 0 ? (
              <Text style={styles.description}>No {reportFilter} incidents found.</Text>
            ) : (
              <View style={styles.postList}>
                {filteredIncidents.map((report) => {
                  return (
                    <View key={report._id} style={styles.postItem}>
                      <Text style={styles.postName}>{report.categoryLabel}</Text>
                      <Text style={styles.postMeta}>Reported: {report.reportedName} · by {report.reporterName}</Text>
                      <Text style={styles.postMeta}>Status: {report.status}</Text>
                      <AppButton
                        title="View"
                        onPress={() =>
                          router.push({
                            pathname: "/moderation/[reportId]",
                            params: { reportId: report._id },
                          })
                        }
                        variant="secondary"
                      />
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
