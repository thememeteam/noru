import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAppStyles } from "../theme/AppTheme";

export function RideDetailsScreen() {
  const styles = useAppStyles();

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.safeArea}>  
        <ScrollView contentContainerStyle={styles.boardContent}>
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Ride details</Text>

            <View style={detailStyles.mapCard}>
              <Text style={detailStyles.mapTitle}>Route preview</Text>
              <Text style={detailStyles.mapSubtitle}>To: college / amrita</Text>
            </View>

            <View style={detailStyles.infoRow}><Text style={styles.postMeta}>Departure</Text><Text style={styles.postName}>8:30 AM today</Text></View>
            <View style={detailStyles.infoRow}><Text style={styles.postMeta}>Vehicle</Text><Text style={styles.postName}>Auto (booked by host)</Text></View>
            <View style={detailStyles.infoRow}><Text style={styles.postMeta}>Seats available</Text><Text style={styles.postName}>2 of 3</Text></View>
            <View style={detailStyles.infoRow}><Text style={styles.postMeta}>Suggested fare</Text><Text style={detailStyles.farePill}>₹45 / person</Text></View>

            <Text style={styles.sectionLabel}>Host</Text>
            <View style={styles.postItem}>
              <Text style={styles.postName}>J.S. Vaibhav</Text>
              <View style={styles.quickRow}>
                <Pressable onPress={() => {}} style={detailStyles.tagChip}><Text style={detailStyles.tagChipText}>Punctual</Text></Pressable>
                <Pressable onPress={() => {}} style={detailStyles.tagChip}><Text style={detailStyles.tagChipText}>Good music</Text></Pressable>
              </View>
            </View>

            <Pressable style={detailStyles.requestButton} onPress={() => {}}>
              <Text style={detailStyles.requestButtonText}>Request to join</Text>
            </Pressable>

            <Text style={styles.postMeta}>Payment is settled peer-to-peer outside the app.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  mapCard: {
    borderWidth: 1,
    borderColor: "#9DBA7E",
    backgroundColor: "#DCEBCE",
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  mapTitle: {
    color: "#335F2D",
    fontSize: 13,
    fontFamily: "GoogleSansFlexBold",
  },
  mapSubtitle: {
    color: "#335F2D",
    fontSize: 12,
    fontFamily: "GoogleSansFlexMedium",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  farePill: {
    color: "#335F2D",
    backgroundColor: "#E5F7D9",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontFamily: "GoogleSansFlexBold",
  },
  tagChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#8DB7E8",
    backgroundColor: "#EAF3FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagChipText: {
    color: "#1E477A",
    fontSize: 12,
    fontFamily: "GoogleSansFlexMedium",
  },
  requestButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#1E6CCC",
    alignItems: "center",
    justifyContent: "center",
  },
  requestButtonText: {
    color: "#EAF3FF",
    fontSize: 16,
    fontFamily: "GoogleSansFlexMedium",
  },
});
