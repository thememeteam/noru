import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, ActivityIndicator, Alert, Animated, Easing, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import { AppButton } from "../../components/AppButton";
import { useAppStyles } from "../theme/AppTheme";
import { VEHICLE_CAPACITIES, VEHICLE_LABELS, VEHICLE_OPTIONS, type VehicleType } from "./constants";
import { PlacesAutocomplete } from "./PlacesAutocomplete";

const TIME_PRESETS = [
  { label: "Now", mins: 0 },
  { label: "+15m", mins: 15 },
  { label: "+30m", mins: 30 },
  { label: "+1h", mins: 60 },
] as const;

const HOME_LABEL = "Home";
const COLLEGE_LABEL = "College";
const COLLEGE_QUERY = "Amrita Vishwa Vidyapeetham, Bengaluru Campus";

const EASE_OUT_QUART = Easing.out(Easing.poly(4));

function validate(name: string, value: string): string {
  if (name === "startPoint" || name === "endPoint") {
    return value.trim().length < 3 ? "Enter at least 3 characters" : "";
  }
  if (name === "price") {
    const n = Number(value);
    if (!value.trim() || !Number.isFinite(n) || n <= 0) return "Enter a valid amount";
    if (n < 20) return "Minimum fare is ₹20";
    return "";
  }
  return "";
}

// Slides + fades in from below when mounted
function AnimatedError({ message }: { message: string }) {
  const slide = useRef(new Animated.Value(8)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, { toValue: 0, duration: 150, easing: EASE_OUT_QUART, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.Text style={[hostStyles.fieldError, { opacity: fade, transform: [{ translateY: slide }] }]}>
      {message}
    </Animated.Text>
  );
}

// Scale-springs on press, then returns to 1.0
function TimePresetChip({ label, onPress }: { label: string; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.07, tension: 400, friction: 8, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1.0, tension: 260, friction: 14, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Pressable onPress={handlePress} hitSlop={4}>
      <Animated.View style={[hostStyles.timePreset, { transform: [{ scale }] }]}>
        <Text style={hostStyles.timePresetText}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

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
  const [scheduledDate, setScheduledDate] = useState<"today" | "tomorrow" | "custom">("today");
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [womenOnly, setWomenOnly] = useState(false);
  const [quietRide, setQuietRide] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [fieldTouched, setFieldTouched] = useState<Record<string, boolean>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [startInputKey, setStartInputKey] = useState(0);
  const [endInputKey, setEndInputKey] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const fieldY = useRef<Record<string, number>>({});
  const focusedField = useRef<string | null>(null);
  const isSubmittingRef = useRef(false);
  const prevCanCreate = useRef(false);

  // Spring animation for confirmation sheet (slides up from below)
  const confirmSlide = useRef(new Animated.Value(600)).current;
  // Pulse animation for the submit button when form becomes valid
  const buttonPulse = useRef(new Animated.Value(1)).current;
  // Controls whether motion is suppressed
  const motionEnabled = useRef(true);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      motionEnabled.current = !reduced;
    });
  }, []);

  const maxCapacity = VEHICLE_CAPACITIES[vehicleType];
  const parsedPrice = Number(totalPrice);
  const pricePerRider = capacity >= 1 && Number.isFinite(parsedPrice) && parsedPrice > 0
    ? Math.round(parsedPrice / (capacity + 1))
    : null;

  const isWomenOnlyEligible =
    (onboarding as any)?.gender === "female" || (onboarding as any)?.gender === "nonBinary";
  const womenOnlyEligibleVehicle = vehicleType !== "ownBike";
  const canToggleWomenOnly = isWomenOnlyEligible && womenOnlyEligibleVehicle;

  const normalizeAddress = (value: string) => value.trim().toLowerCase();
  const isSameAddress = Boolean(startPoint.trim())
    && Boolean(endPoint.trim())
    && normalizeAddress(startPoint) === normalizeAddress(endPoint);

  const canCreate =
    startPoint.trim().length >= 3
    && endPoint.trim().length >= 3
    && Number.isFinite(parsedPrice)
    && parsedPrice >= 20
    && rideStartAt !== null
    && !isCreating
    && !isSameAddress
    && Object.values(fieldErrors).every(e => !e);

  // Button pulse: fires once when canCreate transitions false → true
  useEffect(() => {
    if (!prevCanCreate.current && canCreate && motionEnabled.current) {
      Animated.sequence([
        Animated.timing(buttonPulse, { toValue: 0.94, duration: 80, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.spring(buttonPulse, { toValue: 1, tension: 240, friction: 10, useNativeDriver: true }),
      ]).start();
    }
    prevCanCreate.current = canCreate;
  }, [canCreate]);

  // Confirmation sheet spring
  useEffect(() => {
    if (showConfirm) {
      if (motionEnabled.current) {
        confirmSlide.setValue(600);
        Animated.spring(confirmSlide, {
          toValue: 0,
          tension: 80,
          friction: 14,
          useNativeDriver: true,
        }).start();
      } else {
        confirmSlide.setValue(0);
      }
    } else {
      confirmSlide.setValue(600);
    }
  }, [showConfirm]);

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

  const handleBlur = (name: string, value: string) => {
    setFieldTouched(p => ({ ...p, [name]: true }));
    setFieldErrors(p => ({ ...p, [name]: validate(name, value) }));
  };

  const handleVehicleTypeChange = (type: VehicleType) => {
    setVehicleType(type);
    setCapacity(VEHICLE_CAPACITIES[type]);
    if (type === "ownBike") {
      setWomenOnly(false);
    }
  };

  const getBaseDate = (type?: "today" | "tomorrow" | "custom"): Date => {
    const which = type ?? scheduledDate;
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    if (which === "tomorrow") {
      base.setDate(base.getDate() + 1);
      return base;
    }
    if (which === "custom" && customDate) {
      const d = new Date(customDate);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return base;
  };

  const combineDateTime = (base: Date, time: Date): Date =>
    new Date(base.getFullYear(), base.getMonth(), base.getDate(), time.getHours(), time.getMinutes(), 0, 0);

  const handleDateChip = (type: "today" | "tomorrow" | "custom") => {
    if (type === "custom") {
      setShowDatePicker(true);
      return;
    }
    setScheduledDate(type);
    if (rideStartAt) setRideStartAt(combineDateTime(getBaseDate(type), rideStartAt));
  };

  const onDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (selectedDate) {
      setCustomDate(selectedDate);
      setScheduledDate("custom");
      if (rideStartAt) setRideStartAt(combineDateTime(selectedDate, rideStartAt));
    }
  };

  const applyTimePreset = (minutesFromNow: number) => {
    const base = getBaseDate();
    const t = new Date();
    t.setSeconds(0, 0);
    t.setMinutes(t.getMinutes() + minutesFromNow);
    setRideStartAt(combineDateTime(base, t));
  };

  const onTimeChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowTimePicker(false);
    if (selectedDate) setRideStartAt(combineDateTime(getBaseDate(), selectedDate));
  };

  const timeOnlyLabel = rideStartAt
    ? rideStartAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : null;

  const fullDateTimeLabel = (() => {
    if (!rideStartAt) return null;
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const time = timeOnlyLabel!;
    if (rideStartAt.toDateString() === now.toDateString()) return time;
    if (rideStartAt.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;
    return `${rideStartAt.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}, ${time}`;
  })();

  const customChipLabel = scheduledDate === "custom" && customDate
    ? customDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
    : "Pick date";

  const onCreate = async () => {
    if (isSubmittingRef.current || !canCreate || !rideStartAt) return;
    isSubmittingRef.current = true;
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
      setScheduledDate("today");
      setCustomDate(null);
      setWomenOnly(false);
      setQuietRide(false);
      setFieldErrors({});
      setFieldTouched({});
      setShowConfirm(false);
      router.replace({ pathname: "/waiting", params: { ridePostId: createdId } });
    } catch (error) {
      setShowConfirm(false);
      Alert.alert(
        "Could not post ride",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsCreating(false);
      isSubmittingRef.current = false;
    }
  };

  const swapPoints = () => {
    setStartPoint(endPoint);
    setEndPoint(startPoint);
  };

  if (onboarding === undefined || !onboarding?.isCompleted) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#276EF1" />
      </View>
    );
  }

  const activeFilters = [
    womenOnly && "Women only",
    quietRide && "Quiet ride",
  ].filter(Boolean).join(", ");

  const isAfterNoon = new Date().getHours() >= 12;
  const homeAddress = onboarding.homeAddress?.trim() ?? "";
  const workAddress = (onboarding as any).workAddress?.trim() ?? "";

  const setFieldValue = (field: "start" | "end", value: string) => {
    if (field === "start") {
      setStartPoint(value);
    } else {
      setEndPoint(value);
    }
  };

  const applyHomeToField = (field: "start" | "end") => {
    if (!homeAddress) {
      Alert.alert("Set a home address", "Add your home address in the profile screen first.");
      return;
    }

    setFieldValue(field, homeAddress);
  };

  const applyCollegeToField = (field: "start" | "end") => {
    setFieldValue(field, COLLEGE_QUERY);
  };

  const handleStartChange = (text: string) => {
    const kw = text.trim().toLowerCase();
    if (kw === "home") {
      if (!homeAddress) { Alert.alert("Set a home address", "Add your home address in the profile screen first."); return; }
      setStartPoint(homeAddress); setStartInputKey(k => k + 1); return;
    }
    if (kw === "work") {
      if (!workAddress) { Alert.alert("Set a work address", "Add your work address in the profile screen first."); return; }
      setStartPoint(workAddress); setStartInputKey(k => k + 1); return;
    }
    if (kw === "college") { setStartPoint(COLLEGE_QUERY); setStartInputKey(k => k + 1); return; }
    setStartPoint(text);
  };

  const handleEndChange = (text: string) => {
    const kw = text.trim().toLowerCase();
    if (kw === "home") {
      if (!homeAddress) { Alert.alert("Set a home address", "Add your home address in the profile screen first."); return; }
      setEndPoint(homeAddress); setEndInputKey(k => k + 1); return;
    }
    if (kw === "work") {
      if (!workAddress) { Alert.alert("Set a work address", "Add your work address in the profile screen first."); return; }
      setEndPoint(workAddress); setEndInputKey(k => k + 1); return;
    }
    if (kw === "college") { setEndPoint(COLLEGE_QUERY); setEndInputKey(k => k + 1); return; }
    setEndPoint(text);
  };

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView edges={["bottom"]} style={[styles.safeArea, { paddingHorizontal: 0 }]}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.boardContent, { paddingBottom: Math.max(28, keyboardHeight), paddingHorizontal: 16 }]}
          keyboardShouldPersistTaps="handled">

          <View
            style={hostStyles.fieldGroup}
            onLayout={(e) => { fieldY.current.startPoint = e.nativeEvent.layout.y; }}>
            <Text style={hostStyles.fieldLabel}>From</Text>
            <PlacesAutocomplete
              key={startInputKey}
              value={startPoint}
              onChangeText={handleStartChange}
              onFocus={() => handleFieldFocus("startPoint")}
              onBlur={() => handleBlur("startPoint", startPoint)}
              placeholder="Start point"
              inputStyle={[styles.input, fieldTouched.startPoint && fieldErrors.startPoint ? hostStyles.inputError : null]}
              actionLabel={isAfterNoon ? COLLEGE_LABEL : HOME_LABEL}
              onActionPress={isAfterNoon ? () => applyCollegeToField("start") : () => applyHomeToField("start")}
            />
            {fieldTouched.startPoint && fieldErrors.startPoint
              ? <AnimatedError key={fieldErrors.startPoint} message={fieldErrors.startPoint} />
              : null}
          </View>

          <View
            style={hostStyles.fieldGroup}
            onLayout={(e) => { fieldY.current.endPoint = e.nativeEvent.layout.y; }}>
            <Text style={hostStyles.fieldLabel}>To</Text>
            <PlacesAutocomplete
              key={endInputKey}
              value={endPoint}
              onChangeText={handleEndChange}
              onFocus={() => handleFieldFocus("endPoint")}
              onBlur={() => handleBlur("endPoint", endPoint)}
              placeholder="Destination"
              inputStyle={[styles.input, fieldTouched.endPoint && fieldErrors.endPoint ? hostStyles.inputError : null]}
              actionLabel={isAfterNoon ? HOME_LABEL : COLLEGE_LABEL}
              onActionPress={isAfterNoon ? () => applyHomeToField("end") : () => applyCollegeToField("end")}
            />
            {fieldTouched.endPoint && fieldErrors.endPoint
              ? <AnimatedError key={fieldErrors.endPoint} message={fieldErrors.endPoint} />
              : null}
          </View>

          <AppButton title="Swap source / destination" onPress={swapPoints} variant="secondary" />
          {isSameAddress ? (
            <Text style={hostStyles.sameAddressWarning}>Start and End point cannot be the same</Text>
          ) : null}

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
            {(vehicleType === "ownCar" || vehicleType === "ownBike") && (
              <Text style={hostStyles.vehicleNote}>Riders share your personal vehicle</Text>
            )}
          </View>

          {maxCapacity > 1 && (
            <View style={hostStyles.fieldGroup}>
              <Text style={hostStyles.fieldLabel}>Extra seats for riders</Text>
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
            <Text style={hostStyles.fieldLabel}>Date</Text>
            <View style={styles.vehicleRow}>
              <Pressable
                style={[styles.vehicleChip, scheduledDate === "today" && styles.vehicleChipSelected]}
                onPress={() => handleDateChip("today")}>
                <Text style={[styles.vehicleChipText, scheduledDate === "today" && styles.vehicleChipTextSelected]}>
                  Today
                </Text>
              </Pressable>
              <Pressable
                style={[styles.vehicleChip, scheduledDate === "tomorrow" && styles.vehicleChipSelected]}
                onPress={() => handleDateChip("tomorrow")}>
                <Text style={[styles.vehicleChipText, scheduledDate === "tomorrow" && styles.vehicleChipTextSelected]}>
                  Tomorrow
                </Text>
              </Pressable>
              <Pressable
                style={[styles.vehicleChip, scheduledDate === "custom" && styles.vehicleChipSelected]}
                onPress={() => handleDateChip("custom")}>
                <Text style={[styles.vehicleChipText, scheduledDate === "custom" && styles.vehicleChipTextSelected]}>
                  {customChipLabel}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={hostStyles.fieldGroup}>
            <Text style={hostStyles.fieldLabel}>Start time</Text>
            <View style={hostStyles.timePresetsRow}>
              {TIME_PRESETS.map((p) => (
                <TimePresetChip
                  key={p.label}
                  label={p.label}
                  onPress={() => applyTimePreset(p.mins)}
                />
              ))}
            </View>
            <Pressable
              style={[styles.input, hostStyles.timeButton]}
              onPress={() => setShowTimePicker(true)}>
              <Text style={timeOnlyLabel ? hostStyles.timeText : hostStyles.timePlaceholder}>
                {timeOnlyLabel ?? "Or pick a custom time"}
              </Text>
            </Pressable>
          </View>

          {Platform.OS === "android" && showDatePicker && (
            <DateTimePicker
              value={customDate ?? new Date()}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onValueChange={onDateChange}
              onDismiss={() => setShowDatePicker(false)}
            />
          )}

          {Platform.OS === "android" && showTimePicker && (
            <DateTimePicker
              value={rideStartAt ?? new Date()}
              mode="time"
              display="default"
              onValueChange={onTimeChange}
              onDismiss={() => setShowTimePicker(false)}
            />
          )}

          <View
            style={hostStyles.fieldGroup}
            onLayout={(e) => { fieldY.current.price = e.nativeEvent.layout.y; }}>
            <Text style={hostStyles.fieldLabel}>Total trip fare</Text>
            <View style={[styles.input, hostStyles.fareRow, fieldTouched.price && fieldErrors.price ? hostStyles.inputError : null]}>
              <Text style={hostStyles.farePrefix}>₹</Text>
              <TextInput
                style={hostStyles.fareInput}
                value={totalPrice}
                onChangeText={setTotalPrice}
                onFocus={() => handleFieldFocus("price")}
                onBlur={() => handleBlur("price", totalPrice)}
                onTouchEnd={() => scrollToField("price")}
                placeholder="e.g. 180"
                placeholderTextColor="#606060"
                keyboardType="numeric"
              />
            </View>
            {fieldTouched.price && fieldErrors.price
              ? <AnimatedError key={fieldErrors.price} message={fieldErrors.price} />
              : pricePerRider !== null
              ? <Text style={hostStyles.fieldHint}>≈₹{pricePerRider} / person when full</Text>
              : null}
          </View>

          <View style={hostStyles.fieldGroup}>
            <Text style={hostStyles.fieldLabel}>Ride options</Text>
            <View style={styles.vehicleRow}>
              <Pressable
                style={[
                  styles.vehicleChip,
                  womenOnly && styles.vehicleChipSelected,
                  !canToggleWomenOnly && hostStyles.chipDisabled,
                ]}
                onPress={() => canToggleWomenOnly && setWomenOnly(!womenOnly)}>
                <Text style={[
                  styles.vehicleChipText,
                  womenOnly && styles.vehicleChipTextSelected,
                  !canToggleWomenOnly && hostStyles.chipTextDisabled,
                ]}>
                  Women only
                </Text>
              </Pressable>
              <Pressable
                style={[styles.vehicleChip, quietRide && styles.vehicleChipSelected]}
                onPress={() => setQuietRide(!quietRide)}>
                <Text style={[styles.vehicleChipText, quietRide && styles.vehicleChipTextSelected]}>
                  Quiet ride
                </Text>
              </Pressable>
            </View>
            {!isWomenOnlyEligible && (
              <Text style={hostStyles.optionHint}>Women only: available to female riders</Text>
            )}
            {isWomenOnlyEligible && !womenOnlyEligibleVehicle && (
              <Text style={hostStyles.optionHint}>Women only: not available for bikes</Text>
            )}
            <Text style={hostStyles.optionHint}>Quiet ride: passengers keep conversation minimal</Text>
          </View>

          {/* Button pulses once when the form transitions from invalid → valid */}
          <Animated.View style={{ transform: [{ scale: buttonPulse }] }}>
            <AppButton
              title="Review & post"
              onPress={() => setShowConfirm(true)}
              disabled={!canCreate}
            />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* iOS date picker */}
      {Platform.OS === "ios" && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}>
          <Pressable style={hostStyles.pickerBackdrop} onPress={() => setShowDatePicker(false)}>
            <View style={hostStyles.pickerSheet}>
              <View style={hostStyles.pickerHeader}>
                <Pressable onPress={() => setShowDatePicker(false)}>
                  <Text style={hostStyles.pickerDone}>Done</Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={customDate ?? new Date()}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onValueChange={onDateChange}
                style={hostStyles.picker}
              />
            </View>
          </Pressable>
        </Modal>
      )}

      {/* iOS time picker */}
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
                onValueChange={onTimeChange}
                style={hostStyles.picker}
              />
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Confirmation sheet — spring entrance */}
      <Modal
        visible={showConfirm}
        transparent
        animationType="none"
        onRequestClose={() => !isCreating && setShowConfirm(false)}>
        <Pressable
          style={hostStyles.pickerBackdrop}
          onPress={() => !isCreating && setShowConfirm(false)}>
          <Animated.View
            style={[hostStyles.confirmSheet, { transform: [{ translateY: confirmSlide }] }]}
            onStartShouldSetResponder={() => true}>
            <View style={hostStyles.confirmHandle} />
            <Text style={hostStyles.confirmTitle}>Post this ride?</Text>

            <View style={hostStyles.confirmRow}>
              <Text style={hostStyles.confirmLabel}>Route</Text>
              <Text style={hostStyles.confirmValue} numberOfLines={2}>
                {startPoint} → {endPoint}
              </Text>
            </View>

            <View style={hostStyles.confirmRow}>
              <Text style={hostStyles.confirmLabel}>Vehicle</Text>
              <Text style={hostStyles.confirmValue}>
                {VEHICLE_LABELS[vehicleType]}{maxCapacity > 1 ? `, ${capacity} extra seat${capacity !== 1 ? "s" : ""}` : ""}
              </Text>
            </View>

            <View style={hostStyles.confirmRow}>
              <Text style={hostStyles.confirmLabel}>Departs</Text>
              <Text style={hostStyles.confirmValue}>{fullDateTimeLabel}</Text>
            </View>

            <View style={hostStyles.confirmRow}>
              <Text style={hostStyles.confirmLabel}>Fare</Text>
              <Text style={hostStyles.confirmValue}>
                ₹{parsedPrice} total{pricePerRider !== null ? ` · ₹${pricePerRider} per person` : ""}
              </Text>
            </View>

            {activeFilters ? (
              <View style={hostStyles.confirmRow}>
                <Text style={hostStyles.confirmLabel}>Filters</Text>
                <Text style={hostStyles.confirmValue}>{activeFilters}</Text>
              </View>
            ) : null}

            <View style={hostStyles.confirmActions}>
              <AppButton
                title={isCreating ? "Posting..." : "Confirm"}
                onPress={() => void onCreate()}
                disabled={isCreating}
              />
              <AppButton
                title="Edit"
                onPress={() => setShowConfirm(false)}
                variant="secondary"
              />
            </View>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const hostStyles = StyleSheet.create({
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    color: "#8A8A8A",
    letterSpacing: 0.4,
    fontFamily: "InterMedium",
  },
  fieldError: {
    fontSize: 12,
    color: "#FCA5A5",
    fontFamily: "InterMedium",
  },
  fieldHint: {
    fontSize: 12,
    color: "#8A8A8A",
    fontFamily: "InterMedium",
  },
  inputError: {
    borderColor: "#7F1D1D",
  },
  swapBtn: {
    alignSelf: "center",
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#404040",
    alignItems: "center",
    justifyContent: "center",
  },
  swapIcon: {
    color: "#8A8A8A",
    fontSize: 16,
    fontFamily: "InterMedium",
  },
  timePresetsRow: {
    flexDirection: "row",
    gap: 8,
  },
  timePreset: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#404040",
  },
  timePresetText: {
    fontSize: 13,
    color: "#8A8A8A",
    fontFamily: "InterMedium",
  },
  sameAddressWarning: {
    fontSize: 12,
    color: "#FCA5A5",
    fontFamily: "InterMedium",
  },
  timeButton: {
    justifyContent: "center",
  },
  timeText: {
    color: "#F0F0F0",
    fontSize: 15,
    fontFamily: "InterMedium",
  },
  timePlaceholder: {
    color: "#606060",
    fontSize: 15,
    fontFamily: "InterMedium",
  },
  fareRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 0,
    paddingHorizontal: 12,
  },
  farePrefix: {
    color: "#8A8A8A",
    fontSize: 15,
    fontFamily: "InterMedium",
    marginRight: 4,
  },
  fareInput: {
    flex: 1,
    color: "#F0F0F0",
    fontSize: 15,
    fontFamily: "InterMedium",
    paddingVertical: 12,
  },
  vehicleNote: {
    fontSize: 12,
    color: "#8A8A8A",
    fontFamily: "InterMedium",
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipTextDisabled: {
    color: "#9CA3AF",
  },
  optionHint: {
    fontSize: 12,
    color: "#8A8A8A",
    fontFamily: "InterMedium",
  },
  pickerBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  pickerSheet: {
    backgroundColor: "#1E1E1E",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
  },
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#383838",
  },
  pickerDone: {
    color: "#5BA0F2",
    fontSize: 16,
    fontFamily: "InterBold",
  },
  picker: {
    backgroundColor: "#1E1E1E",
  },
  confirmSheet: {
    backgroundColor: "#262626",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 36,
    paddingHorizontal: 20,
    gap: 16,
  },
  confirmHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#444444",
    alignSelf: "center",
    marginBottom: 4,
  },
  confirmTitle: {
    fontSize: 18,
    color: "#FFFFFF",
    fontFamily: "InterBold",
  },
  confirmRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  confirmLabel: {
    fontSize: 13,
    color: "#8A8A8A",
    fontFamily: "InterMedium",
    minWidth: 60,
  },
  confirmValue: {
    fontSize: 14,
    color: "#F0F0F0",
    fontFamily: "InterMedium",
    flex: 1,
    textAlign: "right",
  },
  confirmActions: {
    gap: 10,
    marginTop: 4,
  },
});
