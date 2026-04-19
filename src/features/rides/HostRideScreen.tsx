import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import { AppButton } from "../../components/AppButton";
import { useAppStyles } from "../theme/AppTheme";
import { VEHICLE_LABELS, VEHICLE_OPTIONS, type VehicleType } from "./constants";

const PRESET_TIMES = ["8:30 AM", "9:00 AM"] as const;
type TimePreset = (typeof PRESET_TIMES)[number] | "custom";

const SUGGESTED_FARE: Record<VehicleType, number> = {
  auto: 45,
  cab: 60,
  ownBike: 30,
  ownCar: 40,
};

export function HostRideScreen() {
  const styles = useAppStyles();
  const onboarding = useQuery(api.onboarding.getOnboardingState);
  const createRidePost = useMutation(api.rides.createRidePost);

  const [startPoint, setStartPoint] = useState("");
  const [endPoint, setEndPoint] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("auto");
  const [timePreset, setTimePreset] = useState<TimePreset>("8:30 AM");
  const [customTime, setCustomTime] = useState("");
  const [fareInput, setFareInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const departureTime = timePreset === "custom" ? customTime.trim() : timePreset;
  const suggestedFare = SUGGESTED_FARE[vehicleType];
  const canCreate =
    startPoint.trim().length > 0 &&
    endPoint.trim().length > 0 &&
    departureTime.length > 0 &&
    !isCreating;

  useEffect(() => {
    if (onboarding && !onboarding.isCompleted) {
      router.replace("/");
    }
  }, [onboarding]);

  const onCreate = async () => {
    if (!canCreate) {
      return;
    }
    const fareNum = fareInput.trim() ? Number(fareInput.trim()) : undefined;
    if (fareInput.trim() && (isNaN(fareNum!) || fareNum! <= 0)) {
      Alert.alert("Invalid fare", "Please enter a valid fare amount.");
      return;
    }
    try {
      setIsCreating(true);
      const createdId = await createRidePost({
        startPoint,
        endPoint,
        vehicleType,
        departureTime,
        fare: fareNum,
      });
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

            <Text style={hostStyles.fieldLabel}>Departure time</Text>
            <View style={hostStyles.chipRow}>
              {PRESET_TIMES.map((t) => {
                const selected = timePreset === t;
                return (
                  <Pressable
                    key={t}
                    style={[hostStyles.chip, selected && hostStyles.chipSelected]}
                    onPress={() => setTimePreset(t)}>
                    <Text style={[hostStyles.chipText, selected && hostStyles.chipTextSelected]}>{t}</Text>
                  </Pressable>
                );
              })}
              <Pressable
                style={[hostStyles.chip, timePreset === "custom" && hostStyles.chipSelected]}
                onPress={() => setTimePreset("custom")}>
                <Text style={[hostStyles.chipText, timePreset === "custom" && hostStyles.chipTextSelected]}>Custom</Text>
              </Pressable>
            </View>
            {timePreset === "custom" && (
              <TextInput
                style={styles.input}
                value={customTime}
                onChangeText={setCustomTime}
                placeholder="e.g. 10:15 AM"
                placeholderTextColor="#7B879C"
              />
            )}

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

            <Text style={hostStyles.fieldLabel}>Fare per person (₹)</Text>
            <View style={hostStyles.fareRow}>
              <TextInput
                style={[styles.input, hostStyles.fareInput]}
                value={fareInput}
                onChangeText={setFareInput}
                placeholder={String(suggestedFare)}
                placeholderTextColor="#7B879C"
                keyboardType="numeric"
              />
              <View style={hostStyles.suggestedPill}>
                <Text style={hostStyles.suggestedPillText}>Suggested ₹{suggestedFare}</Text>
              </View>
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
    fontFamily: "InterMedium",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#5B6371",
    backgroundColor: "#2A2D33",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#1F3654",
  },
  chipText: {
    color: "#D1D5DB",
    fontSize: 13,
    fontFamily: "InterMedium",
  },
  chipTextSelected: {
    color: "#93C5FD",
  },
  fareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fareInput: {
    flex: 1,
  },
  suggestedPill: {
    backgroundColor: "#335F2D",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suggestedPillText: {
    color: "#E8F5E1",
    fontSize: 12,
    fontFamily: "InterMedium",
  },
});
