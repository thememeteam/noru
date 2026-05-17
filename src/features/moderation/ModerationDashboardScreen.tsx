import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
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

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.boardContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.title}>Moderation</Text>
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

            <Text style={styles.sectionLabel}>{reportFilter === "unresolved" ? "Unresolved reports" : "Resolved reports"}</Text>
            {filteredIncidents.length === 0 ? (
              <Text style={styles.description}>No {reportFilter} incidents found.</Text>
            ) : (
              <View style={styles.postList}>
                {filteredIncidents.map((report) => (
                  <Pressable
                    key={report._id}
                    style={({ pressed }) => [styles.postItem, pressed && styles.buttonPressed]}
                    onPress={() =>
                      router.push({
                        pathname: "/moderation/[reportId]",
                        params: { reportId: report._id },
                      })
                    }
                  >
                    <Text style={styles.postName}>{report.categoryLabel}</Text>
                    <Text style={styles.postMeta}>{report.reportedName} · reported by {report.reporterName}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
