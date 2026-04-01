import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
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
        <ActivityIndicator size="large" color="#b50246" />
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.boardContent}>
          <View style={styles.card}>
            <Text style={styles.title}>Host a ride</Text>
            <Text style={styles.description}>Create a ride post and wait for students to join.</Text>

            <Text style={styles.sectionLabel}>Source</Text>
            <TextInput
              style={styles.input}
              value={startPoint}
              onChangeText={setStartPoint}
              placeholder="Start point"
              placeholderTextColor="#7B879C"
            />

            <Text style={styles.sectionLabel}>Destination</Text>
            <TextInput
              style={styles.input}
              value={endPoint}
              onChangeText={setEndPoint}
              placeholder="Destination"
              placeholderTextColor="#7B879C"
            />

            <AppButton title="Swap source / destination" onPress={swapPoints} variant="secondary" />

            <Text style={styles.sectionLabel}>Vehicle</Text>
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

            <AppButton
              title={isCreating ? "Creating..." : "Create ride post"}
              onPress={() => void onCreate()}
              disabled={!canCreate}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
