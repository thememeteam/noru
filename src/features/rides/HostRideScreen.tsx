import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  // Y of the card within the scroll content — set via onLayout
  const cardY = useRef(0);
  // Y of each field container within the card — set via onLayout
  const fieldY = useRef<Record<string, number>>({});
  // Which field is currently focused
  const focusedField = useRef<string | null>(null);

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
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      // Scroll to focused field once keyboard height is known
      if (focusedField.current) {
        scrollToField(focusedField.current);
      }
    });
    const onHide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { onShow.remove(); onHide.remove(); };
  }, []);

  useEffect(() => {
    if (onboarding && !onboarding.isCompleted) {
      router.replace("/");
    }
  }, [onboarding]);

  // Scrolls a field into view using layout positions relative to scroll content.
  // onLayout gives position relative to parent, so cardY + fieldY = position within scroll content,
  // which is exactly what scrollTo expects — unlike measureLayout which is relative to the visible frame.
  const scrollToField = (name: string) => {
    const y = fieldY.current[name];
    if (y === undefined) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, cardY.current + y - 100), animated: true });
  };

  const handleFieldFocus = (name: string) => {
    focusedField.current = name;
    if (keyboardHeight > 0) {
      // Keyboard already showing (switching fields), scroll immediately
      scrollToField(name);
    }
    // Otherwise keyboardWillShow fires next and scrolls there
  };

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
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.boardContent, { paddingBottom: Math.max(28, keyboardHeight) }]}
          keyboardShouldPersistTaps="handled">
          <View
            style={styles.card}
            onLayout={(e) => { cardY.current = e.nativeEvent.layout.y; }}>
            <Text style={styles.title}>Post a ride</Text>

            <View onLayout={(e) => { fieldY.current.startPoint = e.nativeEvent.layout.y; }}>
              <Text style={hostStyles.fieldLabel}>From (pickup)</Text>
              <TextInput
                style={styles.input}
                value={startPoint}
                onChangeText={setStartPoint}
                onFocus={() => handleFieldFocus("startPoint")}
                onTouchEnd={() => scrollToField("startPoint")}
                placeholder="Start point"
                placeholderTextColor="#7B879C"
              />
            </View>

            <View onLayout={(e) => { fieldY.current.endPoint = e.nativeEvent.layout.y; }}>
              <Text style={hostStyles.fieldLabel}>To (destination)</Text>
              <TextInput
                style={styles.input}
                value={endPoint}
                onChangeText={setEndPoint}
                onFocus={() => handleFieldFocus("endPoint")}
                onTouchEnd={() => scrollToField("endPoint")}
                placeholder="Destination"
                placeholderTextColor="#7B879C"
              />
            </View>

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

            <View onLayout={(e) => { fieldY.current.time = e.nativeEvent.layout.y; }}>
              <Text style={hostStyles.fieldLabel}>Start time (HH:MM - 24hr clock)</Text>
              <TextInput
                style={styles.input}
                value={rideStartTime}
                onChangeText={setRideStartTime}
                onFocus={() => handleFieldFocus("time")}
                onTouchEnd={() => scrollToField("time")}
                placeholder="08:30"
                placeholderTextColor="#7B879C"
                keyboardType="numbers-and-punctuation"
              />
            </View>

            <View onLayout={(e) => { fieldY.current.price = e.nativeEvent.layout.y; }}>
              <Text style={hostStyles.fieldLabel}>Enter total price (to be split)</Text>
              <TextInput
                style={styles.input}
                value={totalPrice}
                onChangeText={setTotalPrice}
                onFocus={() => handleFieldFocus("price")}
                onTouchEnd={() => scrollToField("price")}
                placeholder="180"
                placeholderTextColor="#7B879C"
                keyboardType="numeric"
              />
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
});
