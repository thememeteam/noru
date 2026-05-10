import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import { AppButton } from "../../components/AppButton";
import { useAppStyles } from "../theme/AppTheme";
import { VEHICLE_LABELS, VEHICLE_OPTIONS, type VehicleType } from "./constants";

function parseRideStartAt(timeText: string) {
  const match = timeText.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  const now = new Date();
  const rideStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  return rideStart.getTime();
}

export function HostRideScreen() {
  const styles = useAppStyles();
  const onboarding = useQuery(api.onboarding.getOnboardingState);
  const createRidePost = useMutation(api.rides.createRidePost) as any;

  const [startPoint, setStartPoint] = useState("");
  const [endPoint, setEndPoint] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("auto");
  const [totalPrice, setTotalPrice] = useState("");
  const [rideStartTime, setRideStartTime] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const parsedPrice = Number(totalPrice);
  const parsedRideStartAt = parseRideStartAt(rideStartTime);
  const canCreate =
    startPoint.trim().length > 0
    && endPoint.trim().length > 0
    && Number.isFinite(parsedPrice)
    && parsedPrice > 0
    && parsedRideStartAt !== null
    && !isCreating;

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
        totalPrice: parsedPrice,
        rideStartAt: parsedRideStartAt as number,
      });
      setStartPoint("");
      setEndPoint("");
      setVehicleType("auto");
      setTotalPrice("");
      setRideStartTime("");
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
    <KeyboardAvoidingView
      style={styles.screenContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.boardContent} keyboardShouldPersistTaps="handled">
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

            <Text style={hostStyles.fieldLabel}>Start time (HH:MM - 24hr clock)</Text>
            <TextInput
              style={styles.input}
              value={rideStartTime}
              onChangeText={setRideStartTime}
              placeholder="08:30"
              placeholderTextColor="#7B879C"
              keyboardType="numbers-and-punctuation"
            />

            <Text style={hostStyles.fieldLabel}>Enter total price (to be split)</Text>
            <TextInput
              style={styles.input}
              value={totalPrice}
              onChangeText={setTotalPrice}
              placeholder="180"
              placeholderTextColor="#7B879C"
              keyboardType="numeric"
            />

            <AppButton
              title={isCreating ? "Posting..." : "Post ride"}
              onPress={() => void onCreate()}
              disabled={!canCreate}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const hostStyles = StyleSheet.create({
  fieldLabel: {
    fontSize: 13,
    color: "#B8C0CC",
    letterSpacing: 0.4,
    fontFamily: "GoogleSansFlexMedium",
  },
});
