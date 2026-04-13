import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import { AppButton } from "../../components/AppButton";
import { useAppStyles } from "../theme/AppTheme";
import { COLLEGE_DESTINATION, VEHICLE_LABELS, VEHICLE_OPTIONS, type VehicleType } from "./constants";

export function HostRideScreen() {
  const styles = useAppStyles();
  const onboarding = useQuery(api.onboarding.getOnboardingState);
  const createRidePost = useMutation(api.rides.createRidePost);

  const [startPoint, setStartPoint] = useState("");
  const [endPoint, setEndPoint] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("auto");
  const [isCreating, setIsCreating] = useState(false);

  const canCreate = startPoint.trim().length > 0 && endPoint.trim().length > 0 && !isCreating;
  const isCollegeDestination = endPoint.trim().toLowerCase() === COLLEGE_DESTINATION.toLowerCase();

  useEffect(() => {
    if (onboarding && !onboarding.isCompleted) {
      router.replace("/");
    }
  }, [onboarding]);

  const onCreate = async () => {
    if (!canCreate) {
      return;
    }
    try {
      setIsCreating(true);
      const createdId = await createRidePost({
        startPoint,
        endPoint,
        vehicleType,
      });
      setStartPoint("");
      setEndPoint("");
      setVehicleType("auto");
      router.replace({ pathname: "/waiting", params: { ridePostId: createdId } });
    } catch (error) {
      Alert.alert(
        "Could not create ride post",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const swapPoints = () => {
    setStartPoint(endPoint);
    setEndPoint(startPoint);
  };

  if (onboarding === undefined || !onboarding?.isCompleted) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#1E6CCC" />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.boardContent}>
          <View style={styles.card}>
            <Text style={styles.title}>Post a ride</Text>

            <Text style={hostStyles.fieldLabel}>From (pickup)</Text>
            <TextInput
              style={styles.input}
              value={startPoint}
              onChangeText={setStartPoint}
              placeholder="Start point"
              placeholderTextColor="#7B879C"
            />

            <Text style={hostStyles.fieldLabel}>To (destination)</Text>
            <TextInput
              style={styles.input}
              value={endPoint}
              onChangeText={setEndPoint}
              placeholder="Destination"
              placeholderTextColor="#7B879C"
            />

            <AppButton title="Swap source / destination" onPress={swapPoints} variant="secondary" />

            <Text style={hostStyles.fieldLabel}>Departure time</Text>
            <View style={hostStyles.deadChipRow}>
              <Pressable onPress={() => {}} style={hostStyles.deadChip}><Text style={hostStyles.deadChipText}>8:30 AM</Text></Pressable>
              <Pressable onPress={() => {}} style={hostStyles.deadChip}><Text style={hostStyles.deadChipText}>9:00 AM</Text></Pressable>
              <Pressable onPress={() => {}} style={hostStyles.deadChip}><Text style={hostStyles.deadChipText}>Custom</Text></Pressable>
            </View>

            <Text style={hostStyles.fieldLabel}>Vehicle type</Text>
            <View style={styles.vehicleRow}>
              {VEHICLE_OPTIONS.map((option) => {
                const isSelected = option === vehicleType;
                return (
                  <Pressable
                    key={option}
                    style={[styles.vehicleChip, isSelected && styles.vehicleChipSelected]}
                    onPress={() => setVehicleType(option)}>
                    <Text style={[styles.vehicleChipText, isSelected && styles.vehicleChipTextSelected]}>
                      {VEHICLE_LABELS[option]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={hostStyles.fieldLabel}>Ride preferences</Text>
            <View style={hostStyles.deadChipRow}>
              <Pressable onPress={() => {}} style={hostStyles.deadChip}><Text style={hostStyles.deadChipText}>Women only</Text></Pressable>
              <Pressable onPress={() => {}} style={hostStyles.deadChip}><Text style={hostStyles.deadChipText}>No talking</Text></Pressable>
              <Pressable onPress={() => {}} style={hostStyles.deadChip}><Text style={hostStyles.deadChipText}>No luggage</Text></Pressable>
            </View>

            <View style={hostStyles.fareRow}>
              <Text style={styles.postMeta}>Suggested fare</Text>
              <Text style={hostStyles.fareValue}>{vehicleType === "cab" ? "60" : "45"} / person</Text>
            </View>

            <AppButton
              title={isCreating ? "Posting..." : "Post ride"}
              onPress={() => void onCreate()}
              disabled={!canCreate}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const hostStyles = StyleSheet.create({
  fieldLabel: {
    fontSize: 13,
    color: "#B8C0CC",
    letterSpacing: 0.4,
    fontFamily: "GoogleSansFlexMedium",
  },
  deadChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  deadChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#5B6371",
    backgroundColor: "#2A2D33",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  deadChipText: {
    color: "#D1D5DB",
    fontSize: 13,
    fontFamily: "GoogleSansFlexMedium",
  },
  fareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  fareValue: {
    color: "#E8F5E1",
    backgroundColor: "#335F2D",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontFamily: "GoogleSansFlexBold",
  },
});
