import { useQuery } from "convex/react";
import React, { useMemo } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import { VEHICLE_LABELS } from "../rides/constants";
import { useAppStyles } from "../theme/AppTheme";

function formatRideDateTime(rideStartAt: number | null | undefined, fallback: number): string {
  const ts = rideStartAt ?? fallback;
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const dayDiff = Math.round((dateMidnight - todayMidnight) / 86400000);
  if (dayDiff === 0) return time;
  if (dayDiff === 1) return `Tomorrow · ${time}`;
  return `${date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · ${time}`;
}

export function RideHistoryScreen() {
  const styles = useAppStyles();
  const rideHistory = useQuery(api.rides.getMyRideHistory);

  const pastRides = useMemo(() => {
    if (!rideHistory) return [];
    return rideHistory.filter((item) => item.status === "Stopped");
  }, [rideHistory]);

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView edges={["bottom"]} style={[styles.safeArea, { paddingHorizontal: 0 }]}>
        <ScrollView contentContainerStyle={[styles.boardContent, { paddingHorizontal: 16 }]}>
          {rideHistory === undefined ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#1E6CCC" />
            </View>
          ) : pastRides.length === 0 ? (
            <Text style={styles.description}>No past rides found yet.</Text>
          ) : (
            <View style={styles.postList}>
              {pastRides.map((item) => (
                <View key={item.id} style={[styles.postItem, historyStyles.historyRow]}>
                  <View style={historyStyles.historyLeft}>
                    <Text style={styles.postName} numberOfLines={1}>{item.startPoint} → {item.endPoint}</Text>
                    <Text style={styles.postMeta}>
                      {VEHICLE_LABELS[item.vehicleType]} · {formatRideDateTime(item.rideStartAt, item.createdAt)}
                    </Text>
                  </View>
                  {item.stopReason === "cancelled" ? (
                    <View style={historyStyles.cancelledPill}>
                      <Text style={historyStyles.cancelledPillText}>Cancelled</Text>
                    </View>
                  ) : (
                    <View style={historyStyles.completedPill}>
                      <Text style={historyStyles.completedPillText}>Completed</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const historyStyles = StyleSheet.create({
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  historyLeft: {
    flex: 1,
    gap: 2,
  },
  completedPill: {
    borderRadius: 999,
    backgroundColor: "#052E16",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  completedPillText: {
    color: "#86EFAC",
    fontSize: 12,
    fontFamily: "InterBold",
  },
  cancelledPill: {
    borderRadius: 999,
    backgroundColor: "#3F1D1D",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cancelledPillText: {
    color: "#FCA5A5",
    fontSize: 12,
    fontFamily: "InterBold",
  },
});
