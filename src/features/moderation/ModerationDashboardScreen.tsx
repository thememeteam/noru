import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
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
    if (trimmed.includes("@")) {
      return trimmed.split("@")[0] ?? "";
    }
    if (trimmed.endsWith(EMAIL_SUFFIX)) {
      return trimmed.slice(0, -EMAIL_SUFFIX.length);
    }
    return trimmed;
  };

  const parseLocalParts = (value: string) =>
    value
      .split(",")
      .map((part) => normalizeLocalPart(part))
      .filter((part) => part.length > 0);

  const buildCampusEmail = (localPart: string) => `${localPart}${EMAIL_SUFFIX}`;

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
            <Text style={styles.sectionLabel}>Ban User</Text>
            <TextInput
              style={styles.input}
              value={banEmail}
              onChangeText={setBanEmail}
              placeholder="Bl.en.xx.xxx2xxxx"
              placeholderTextColor="#7B879C"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={styles.postMeta}>{EMAIL_SUFFIX}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.buttonBase,
                styles.buttonDanger,
                (!banEmail.trim() || isBanning) && styles.buttonDisabled,
                pressed && !isBanning && banEmail.trim() && styles.buttonPressed,
              ]}
              onPress={async () => {
                if (!banEmail.trim() || isBanning) return;
                try {
                  setIsBanning(true);
                  const parts = parseLocalParts(banEmail);
                  if (parts.length === 0) {
                    throw new Error("Enter at least one email prefix.");
                  }
                  await Promise.all(parts.map((part) => banUserByEmail({ email: buildCampusEmail(part) })));
                  setBanEmail("");
                  Alert.alert("Users banned", "The accounts have been banned and will be forced to sign out.");
                } catch (error) {
                  Alert.alert(
                    "Could not ban user",
                    error instanceof Error ? error.message : "Please try again.",
                  );
                } finally {
                  setIsBanning(false);
                }
              }}
              disabled={!banEmail.trim() || isBanning}>
              <Text style={styles.buttonText}>Ban</Text>
            </Pressable>

            <Text style={styles.sectionLabel}>Unban User</Text>
            <TextInput
              style={styles.input}
              value={unbanEmail}
              onChangeText={setUnbanEmail}
              placeholder="Bl.en.xx.xxx2xxxx"
              placeholderTextColor="#7B879C"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={styles.postMeta}>{EMAIL_SUFFIX}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.buttonBase,
                styles.buttonSuccess,
                (!unbanEmail.trim() || isUnbanning) && styles.buttonDisabled,
                pressed && !isUnbanning && unbanEmail.trim() && styles.buttonPressed,
              ]}
              onPress={async () => {
                if (!unbanEmail.trim() || isUnbanning) return;
                try {
                  setIsUnbanning(true);
                  const parts = parseLocalParts(unbanEmail);
                  if (parts.length === 0) {
                    throw new Error("Enter at least one email prefix.");
                  }
                  await Promise.all(parts.map((part) => unbanUserByEmail({ email: buildCampusEmail(part) })));
                  setUnbanEmail("");
                  Alert.alert("Users unbanned", "The account bans have been removed.");
                } catch (error) {
                  Alert.alert(
                    "Could not unban user",
                    error instanceof Error ? error.message : "Please try again.",
                  );
                } finally {
                  setIsUnbanning(false);
                }
              }}
              disabled={!unbanEmail.trim() || isUnbanning}>
              <Text style={styles.buttonText}>Unban</Text>
            </Pressable>

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
