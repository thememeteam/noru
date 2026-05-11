import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import { AppButton } from "../../components/AppButton";
import { useAppStyles } from "../theme/AppTheme";
import { VEHICLE_CAPACITIES, VEHICLE_LABELS, VEHICLE_OPTIONS, type VehicleType } from "./constants";

export function HostRideScreen() {
  const styles = useAppStyles();
  const onboarding = useQuery(api.onboarding.getOnboardingState);
  const createRidePost = useMutation(api.rides.createRidePost) as any;

  const [startPoint, setStartPoint] = useState("");
  const [endPoint, setEndPoint] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType>("auto");
  const [capacity, setCapacity] = useState(VEHICLE_CAPACITIES.auto);
  const [totalPrice, setTotalPrice] = useState("");
  const [rideStartAt, setRideStartAt] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [womenOnly, setWomenOnly] = useState(false);
  const [quietRide, setQuietRide] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const fieldY = useRef<Record<string, number>>({});
  const focusedField = useRef<string | null>(null);

  const maxCapacity = VEHICLE_CAPACITIES[vehicleType];
  const parsedPrice = Number(totalPrice);
  const canCreate =
    startPoint.trim().length > 0
    && endPoint.trim().length > 0
    && Number.isFinite(parsedPrice)
    && parsedPrice > 0
    && rideStartAt !== null
    && !isCreating;

  const isWomenOnlyEligible =
    (onboarding as any)?.gender === "female" || (onboarding as any)?.gender === "nonBinary";

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
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

  const scrollToField = (name: string) => {
    const y = fieldY.current[name];
    if (y === undefined) return;
    scrollRef.current?.scrollTo({ y: Math.max(0, y - 100), animated: true });
  };

  const handleFieldFocus = (name: string) => {
    focusedField.current = name;
    if (keyboardHeight > 0) {
      scrollToField(name);
    }
  };

  const handleVehicleTypeChange = (type: VehicleType) => {
    setVehicleType(type);
    setCapacity(VEHICLE_CAPACITIES[type]);
    if (type !== "auto" && type !== "cab" && type !== "ownCar") {
      setWomenOnly(false);
    }
  };

  const onTimeChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      setRideStartAt(selectedDate);
    }
  };

  const timeLabel = rideStartAt
    ? rideStartAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : null;

  const onCreate = async () => {
    if (!canCreate || !rideStartAt) {
      return;
    }
    try {
      setIsCreating(true);
      const createdId = await createRidePost({
        startPoint,
        endPoint,
        vehicleType,
        capacity,
        totalPrice: parsedPrice,
        rideStartAt: rideStartAt.getTime(),
        womenOnly: womenOnly || undefined,
        quietRide: quietRide || undefined,
      });
      setStartPoint("");
      setEndPoint("");
      setVehicleType("auto");
      setCapacity(VEHICLE_CAPACITIES.auto);
      setTotalPrice("");
      setRideStartAt(null);
      setWomenOnly(false);
      setQuietRide(false);
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
      <SafeAreaView edges={["bottom"]} style={[styles.safeArea, {paddingHorizontal: 0}]}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.boardContent, { paddingBottom: Math.max(28, keyboardHeight), paddingHorizontal: 16 }]}
          keyboardShouldPersistTaps="handled">

          <View
            style={hostStyles.fieldGroup}
            onLayout={(e) => { fieldY.current.startPoint = e.nativeEvent.layout.y; }}>
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

          <View
            style={hostStyles.fieldGroup}
            onLayout={(e) => { fieldY.current.endPoint = e.nativeEvent.layout.y; }}>
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

          <View style={hostStyles.fieldGroup}>
            <Text style={hostStyles.fieldLabel}>Vehicle type</Text>
            <View style={styles.vehicleRow}>
              {VEHICLE_OPTIONS.map((option) => (
                <Pressable
                  key={option}
                  style={[styles.vehicleChip, vehicleType === option && styles.vehicleChipSelected]}
                  onPress={() => handleVehicleTypeChange(option)}>
                  <Text style={[styles.vehicleChipText, vehicleType === option && styles.vehicleChipTextSelected]}>
                    {VEHICLE_LABELS[option]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {maxCapacity > 1 && (
            <View style={hostStyles.fieldGroup}>
              <Text style={hostStyles.fieldLabel}>Capacity</Text>
              <View style={styles.vehicleRow}>
                {Array.from({ length: maxCapacity }, (_, i) => i + 1).map((n) => (
                  <Pressable
                    key={n}
                    style={[styles.vehicleChip, capacity === n && styles.vehicleChipSelected]}
                    onPress={() => setCapacity(n)}>
                    <Text style={[styles.vehicleChipText, capacity === n && styles.vehicleChipTextSelected]}>
                      {n}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <View style={hostStyles.fieldGroup}>
            <Text style={hostStyles.fieldLabel}>Start time</Text>
            <Pressable
              style={[styles.input, hostStyles.timeButton]}
              onPress={() => setShowTimePicker(true)}>
              <Text style={timeLabel ? hostStyles.timeText : hostStyles.timePlaceholder}>
                {timeLabel ?? "Select time"}
              </Text>
            </Pressable>
          </View>

          {Platform.OS === "android" && showTimePicker && (
            <DateTimePicker
              value={rideStartAt ?? new Date()}
              mode="time"
              display="default"
              onChange={onTimeChange}
            />
          )}

          <View
            style={hostStyles.fieldGroup}
            onLayout={(e) => { fieldY.current.price = e.nativeEvent.layout.y; }}>
            <Text style={hostStyles.fieldLabel}>Total fare (₹, split between riders)</Text>
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

          <View style={hostStyles.fieldGroup}>
            <Text style={hostStyles.fieldLabel}>Ride options</Text>
            <View style={styles.vehicleRow}>
              {isWomenOnlyEligible && (
                <Pressable
                  style={[styles.vehicleChip, womenOnly && styles.vehicleChipSelected]}
                  onPress={() => setWomenOnly(!womenOnly)}>
                  <Text style={[styles.vehicleChipText, womenOnly && styles.vehicleChipTextSelected]}>
                    Women only
                  </Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.vehicleChip, quietRide && styles.vehicleChipSelected]}
                onPress={() => setQuietRide(!quietRide)}>
                <Text style={[styles.vehicleChipText, quietRide && styles.vehicleChipTextSelected]}>
                  Quiet ride
                </Text>
              </Pressable>
            </View>
          </View>

          <AppButton
            title={isCreating ? "Posting..." : "Post ride"}
            onPress={() => void onCreate()}
            disabled={!canCreate}
          />
        </ScrollView>
      </SafeAreaView>

      {Platform.OS === "ios" && (
        <Modal
          visible={showTimePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTimePicker(false)}>
          <Pressable style={hostStyles.pickerBackdrop} onPress={() => setShowTimePicker(false)}>
            <View style={hostStyles.pickerSheet}>
              <View style={hostStyles.pickerHeader}>
                <Pressable onPress={() => setShowTimePicker(false)}>
                  <Text style={hostStyles.pickerDone}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={rideStartAt ?? new Date()}
                mode="time"
                display="spinner"
                onChange={onTimeChange}
                style={hostStyles.picker}
              />
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const hostStyles = StyleSheet.create({
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    color: "#B8C0CC",
    letterSpacing: 0.4,
    fontFamily: "InterMedium",
  },
  timeButton: {
    justifyContent: "center",
  },
  timeText: {
    color: "#E5E7EB",
    fontSize: 15,
    fontFamily: "InterMedium",
  },
  timePlaceholder: {
    color: "#7B879C",
    fontSize: 15,
    fontFamily: "InterMedium",
  },
  pickerBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  pickerSheet: {
    backgroundColor: "#2A2D33",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#4B5563",
  },
  pickerDone: {
    color: "#60A5FA",
    fontSize: 16,
    fontFamily: "InterBold",
  },
  picker: {
    backgroundColor: "#2A2D33",
  },
});
