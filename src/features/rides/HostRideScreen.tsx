import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import { useAppStyles } from "../theme/AppTheme";
import {
  COLLEGE_DESTINATION,
  FIXED_CAPACITY,
  HOST_VEHICLE_OPTIONS,
  MY_VEHICLE_SEAT_OPTIONS,
  VEHICLE_LABELS,
  type HostVehicleType,
} from "./constants";

export function HostRideScreen() {
  const styles = useAppStyles();
  const onboarding = useQuery(api.onboarding.getOnboardingState);
  const createRidePost = useMutation(api.rides.createRidePost);

  const [startPoint, setStartPoint] = useState("");
  const [endPoint, setEndPoint] = useState("");
  const [hour, setHour] = useState("8");
  const [minute, setMinute] = useState("30");
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");
  const [vehicleType, setVehicleType] = useState<HostVehicleType>("auto");
  const [myVehicleSeats, setMyVehicleSeats] = useState<number>(2);
  const [isCreating, setIsCreating] = useState(false);

  const fixedCapacity = FIXED_CAPACITY[vehicleType];
  const effectiveCapacity = fixedCapacity !== null ? fixedCapacity : myVehicleSeats;
  const canCreate = startPoint.trim().length > 0 && endPoint.trim().length > 0 && !isCreating;

  useEffect(() => {
    if (onboarding && !onboarding.isCompleted) {
      router.replace("/");
    }
  }, [onboarding]);

  const clampHour = (val: string) => {
    const n = parseInt(val, 10);
    if (isNaN(n)) return "1";
    return String(Math.min(12, Math.max(1, n)));
  };

  const clampMinute = (val: string) => {
    const n = parseInt(val, 10);
    if (isNaN(n)) return "00";
    return String(Math.min(59, Math.max(0, n))).padStart(2, "0");
  };

  const departureTime = `${hour}:${minute.padStart(2, "0")} ${ampm}`;

  const onCreate = async () => {
    if (!canCreate) return;
    try {
      setIsCreating(true);
      const createdId = await createRidePost({
        startPoint,
        endPoint,
        vehicleType,
        capacity: effectiveCapacity,
        departureTime,
      });
      setStartPoint("");
      setEndPoint("");
      setHour("8");
      setMinute("30");
      setAmpm("AM");
      setVehicleType("auto");
      setMyVehicleSeats(2);
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
<<<<<<< HEAD
        <ScrollView contentContainerStyle={styles.boardContent} keyboardShouldPersistTaps="handled">

          {/* From (pickup) */}
          <Text style={hostStyles.fieldLabel}>From (pickup)</Text>
          <TextInput
            style={styles.input}
            value={startPoint}
            onChangeText={setStartPoint}
            placeholder="Enter pickup location"
            placeholderTextColor="#7B879C"
          />

          {/* To (destination) */}
          <Text style={hostStyles.fieldLabel}>To (destination)</Text>
          <View style={hostStyles.destinationRow}>
=======
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
>>>>>>> origin/main
            <TextInput
              style={[styles.input, hostStyles.destinationInput]}
              value={endPoint}
              onChangeText={setEndPoint}
              placeholder="Enter destination"
              placeholderTextColor="#7B879C"
            />
<<<<<<< HEAD
=======

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
>>>>>>> origin/main
          </View>

          {/* Departure time */}
          <Text style={hostStyles.fieldLabel}>Departure time</Text>
          <View style={hostStyles.timeRow}>
            <TextInput
              style={[styles.input, hostStyles.timeInput]}
              value={hour}
              onChangeText={(t) => setHour(t.replace(/[^0-9]/g, "").slice(0, 2))}
              onBlur={() => setHour(clampHour(hour))}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="8"
              placeholderTextColor="#7B879C"
              textAlign="center"
            />
            <Text style={hostStyles.timeColon}>:</Text>
            <TextInput
              style={[styles.input, hostStyles.timeInput]}
              value={minute}
              onChangeText={(t) => setMinute(t.replace(/[^0-9]/g, "").slice(0, 2))}
              onBlur={() => setMinute(clampMinute(minute))}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="00"
              placeholderTextColor="#7B879C"
              textAlign="center"
            />
            <Pressable
              style={[hostStyles.ampmChip, ampm === "AM" && hostStyles.ampmChipSelected]}
              onPress={() => setAmpm("AM")}>
              <Text style={[hostStyles.ampmText, ampm === "AM" && hostStyles.ampmTextSelected]}>AM</Text>
            </Pressable>
            <Pressable
              style={[hostStyles.ampmChip, ampm === "PM" && hostStyles.ampmChipSelected]}
              onPress={() => setAmpm("PM")}>
              <Text style={[hostStyles.ampmText, ampm === "PM" && hostStyles.ampmTextSelected]}>PM</Text>
            </Pressable>
          </View>

          {/* Vehicle type */}
          <Text style={hostStyles.fieldLabel}>Vehicle type</Text>
          <View style={hostStyles.chipRow}>
            {HOST_VEHICLE_OPTIONS.map((option) => {
              const isSelected = option === vehicleType;
              return (
                <Pressable
                  key={option}
                  style={[hostStyles.chip, isSelected && hostStyles.chipSelected]}
                  onPress={() => setVehicleType(option)}>
                  <Text style={[hostStyles.chipText, isSelected && hostStyles.chipTextSelected]}>
                    {VEHICLE_LABELS[option]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Seats — fixed info for auto/cab/bike, selector for My vehicle */}
          {fixedCapacity !== null ? (
            <Text style={hostStyles.fixedSeatsText}>
              {effectiveCapacity} {effectiveCapacity === 1 ? "seat" : "seats"} available
            </Text>
          ) : (
            <>
              <Text style={hostStyles.fieldLabel}>Seats available</Text>
              <View style={hostStyles.chipRow}>
                {MY_VEHICLE_SEAT_OPTIONS.map((n) => {
                  const isSelected = n === myVehicleSeats;
                  return (
                    <Pressable
                      key={n}
                      style={[hostStyles.seatChip, isSelected && hostStyles.chipSelected]}
                      onPress={() => setMyVehicleSeats(n)}>
                      <Text style={[hostStyles.chipText, isSelected && hostStyles.chipTextSelected]}>
                        {n}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* Post ride button */}
          <Pressable
            style={({ pressed }) => [
              hostStyles.postButton,
              !canCreate && hostStyles.postButtonDisabled,
              pressed && canCreate && styles.buttonPressed,
            ]}
            onPress={() => void onCreate()}
            disabled={!canCreate}>
            <Text style={hostStyles.postButtonText}>
              {isCreating ? "Posting..." : "Post ride"}
            </Text>
          </Pressable>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const hostStyles = StyleSheet.create({
  fieldLabel: {
<<<<<<< HEAD
    fontSize: 14,
    color: "#9CA3AF",
    fontFamily: "InterMedium",
    marginBottom: 6,
  },
  destinationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  destinationInput: {
    flex: 1,
  },
  collegeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#3B82F6",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "transparent",
  },
  collegeChipText: {
    color: "#3B82F6",
    fontSize: 14,
    fontFamily: "InterMedium",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeInput: {
    width: 62,
    textAlign: "center",
    paddingHorizontal: 0,
    fontSize: 17,
    minHeight: 50,
  },
  timeColon: {
    color: "#9CA3AF",
    fontSize: 20,
    fontFamily: "InterBold",
    marginHorizontal: -2,
  },
  ampmChip: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4B5563",
    backgroundColor: "#2A2D33",
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 52,
    alignItems: "center",
  },
  ampmChipSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#1F3654",
  },
  ampmText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontFamily: "InterMedium",
  },
  ampmTextSelected: {
    color: "#DBEAFE",
    fontFamily: "InterBold",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4B5563",
    backgroundColor: "#2A2D33",
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  seatChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#4B5563",
    backgroundColor: "#2A2D33",
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  chipSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#1F3654",
  },
  chipText: {
    color: "#CBD5E1",
    fontSize: 14,
    fontFamily: "InterMedium",
  },
  chipTextSelected: {
    color: "#DBEAFE",
    fontFamily: "InterBold",
  },
  fixedSeatsText: {
    fontSize: 14,
    color: "#6B7280",
    fontFamily: "InterMedium",
    marginBottom: 4,
  },
  postButton: {
    borderRadius: 12,
    minHeight: 52,
    backgroundColor: "#1E6CCC",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  postButtonDisabled: {
    opacity: 0.5,
  },
  postButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontFamily: "InterBold",
=======
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
>>>>>>> origin/main
  },
});
