import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Image, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import { AppButton } from "../../components/AppButton";
import { deriveDisplayName, getAvatarInitial } from "../../lib/userDisplay";
import { VEHICLE_LABELS } from "../rides/constants";
import { PlacesAutocomplete } from "../rides/PlacesAutocomplete";
import { useAppStyles } from "../theme/AppTheme";

const rideDateFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function formatRideDateTime(timestamp: number) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Unknown time";
  }

  return rideDateFormatter.format(date);
}

export function ProfileScreen() {
  const styles = useAppStyles();
  const { signOut } = useAuthActions();
  const onboardingState = useQuery(api.onboarding.getOnboardingState);
  const moderationAccess = useQuery(
    api.moderation.getModerationAccess,
    onboardingState?.isAuthenticated ? {} : "skip",
  );
  const rideHistory = useQuery(
    api.rides.getMyRideHistory,
    onboardingState?.isAuthenticated ? {} : "skip",
  );
  const myRatingSummary = useQuery(
    api.rides.getMyRatingSummary,
    onboardingState?.isAuthenticated ? {} : "skip",
  );
  const myRatingReviews = useQuery(
    api.rides.getMyRatingReviews,
    onboardingState?.isAuthenticated ? {} : "skip",
  );
  const updateHomeAddress = useMutation(api.onboarding.updateHomeAddress);
  const updateWorkAddress = useMutation(api.onboarding.updateWorkAddress);
  const clearHomeAddress = useMutation(api.onboarding.clearHomeAddress);
  const clearWorkAddress = useMutation(api.onboarding.clearWorkAddress);

  const pastRides = useMemo(() => {
    if (!rideHistory) {
      return [];
    }
    return rideHistory.filter((item) => item.status === "Stopped");
  }, [rideHistory]);

  const previewRides = useMemo(() => pastRides.slice(0, 3), [pastRides]);

  const [reviewIndex, setReviewIndex] = useState(0);
  const reviewItems = useMemo(() => myRatingReviews ?? [], [myRatingReviews]);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const reviewLengthRef = useRef(0);
  const [isRatingsOpen, setIsRatingsOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<"home" | "work" | null>(null);
  const [homeAddressInput, setHomeAddressInput] = useState("");
  const [workAddressInput, setWorkAddressInput] = useState("");
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const fieldY = useRef<Record<string, number>>({});
  const focusedField = useRef<string | null>(null);

  useEffect(() => {
    reviewLengthRef.current = reviewItems.length;
    if (reviewItems.length <= 1) {
      setReviewIndex(0);
    }
  }, [reviewItems]);

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
    const intervalId = setInterval(() => {
      if (reviewLengthRef.current <= 1) {
        return;
      }
      setReviewIndex((prev) => (prev + 1) % reviewLengthRef.current);
    }, 2000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!reviewItems || reviewItems.length === 0) {
      return;
    }
    slideAnim.setValue(14);
    fadeAnim.setValue(0);
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 360, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 360, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, reviewIndex, reviewItems, slideAnim]);

  const onSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  const startEditing = (field: "home" | "work") => {
    if (field === "home") {
      setHomeAddressInput(onboardingState?.homeAddress ?? "");
    } else {
      setWorkAddressInput((onboardingState as any)?.workAddress ?? "");
    }
    setEditingAddress(field);
  };

  const onSaveAddress = async (field: "home" | "work") => {
    if (isSavingAddress) return;
    const input = field === "home" ? homeAddressInput : workAddressInput;
    if (!input.trim()) return;
    try {
      setIsSavingAddress(true);
      if (field === "home") {
        await updateHomeAddress({ homeAddress: input.trim() });
      } else {
        await updateWorkAddress({ workAddress: input.trim() });
      }
      setEditingAddress(null);
    } catch (error) {
      Alert.alert("Could not save", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const onClearAddress = async (field: "home" | "work") => {
    if (editingAddress === field) setEditingAddress(null);
    try {
      if (field === "home") {
        await clearHomeAddress({});
      } else {
        await clearWorkAddress({});
      }
    } catch (error) {
      Alert.alert("Could not remove", error instanceof Error ? error.message : "Please try again.");
    }
  };

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

  if (onboardingState === undefined) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#276EF1" />
      </View>
    );
  }

  if (!onboardingState.isAuthenticated) {
    return (
      <View style={styles.screenContainer}>
        <SafeAreaView edges={["bottom"]} style={[styles.safeArea, { paddingHorizontal: 0 }]}>
          <ScrollView contentContainerStyle={[styles.boardContent, { paddingHorizontal: 16 }]}>
            <Text style={styles.description}>Sign in to view your profile.</Text>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  const displayName = deriveDisplayName(onboardingState.displayName, onboardingState.universityEmail);
  const avatarInitial = getAvatarInitial(displayName);

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView style={[styles.safeArea, { paddingHorizontal: 0 }]}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.boardContent, { paddingHorizontal: 16, paddingBottom: Math.max(28, keyboardHeight) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          <View style={profileStyles.identityRow}>
            {onboardingState.profilePhotoUrl ? (
              <Image source={{ uri: onboardingState.profilePhotoUrl }} style={styles.profileHeroAvatar} />
            ) : (
              <View style={styles.profileHeroAvatarFallback}>
                <Text style={styles.profileHeroAvatarFallbackText}>{avatarInitial}</Text>
              </View>
            )}
            <View style={profileStyles.identityTextCol}>
              <Text style={styles.profileName}>{displayName}</Text>
              <View style={profileStyles.emailRow}>
                <Text style={[styles.profileEmail, profileStyles.emailText]} numberOfLines={1}>
                  {onboardingState.universityEmail ?? "No email found"}
                </Text>
                {onboardingState.universityEmail ? (
                  <View style={profileStyles.verifiedBadge}>
                    <Text style={profileStyles.verifiedBadgeText}>Verified</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          <Text style={profileStyles.sectionHeading}>SAVED PLACES</Text>
          <View style={profileStyles.addressCard}>
            <Pressable
              style={({ pressed }) => [profileStyles.addressRow, pressed && editingAddress !== "home" && { opacity: 0.88 }]}
              onPress={() => startEditing("home")}>
              <View style={profileStyles.addressIconWrap}>
                <Text style={profileStyles.addressIcon}>🏠</Text>
              </View>
              <View style={profileStyles.addressTextCol}>
                <Text style={profileStyles.addressLabel}>Home</Text>
                <Text
                  style={[profileStyles.addressValue, !onboardingState.homeAddress && profileStyles.addressEmpty]}
                  numberOfLines={1}>
                  {onboardingState.homeAddress ?? "Not set"}
                </Text>
              </View>
              {onboardingState.homeAddress ? (
                <Pressable
                  style={({ pressed }) => [profileStyles.clearAddressBtn, pressed && { opacity: 0.88 }]}
                  onPress={() => void onClearAddress("home")}
                  hitSlop={8}>
                  <Text style={profileStyles.clearAddressBtnText}>×</Text>
                </Pressable>
              ) : (
                <Text style={profileStyles.addressAddHint}>Add</Text>
              )}
            </Pressable>
            {editingAddress === "home" && (
              <View
                style={profileStyles.inlineEditor}
                onLayout={(e) => { fieldY.current.homeAddress = e.nativeEvent.layout.y; }}>
                <PlacesAutocomplete
                  value={homeAddressInput}
                  onChangeText={setHomeAddressInput}
                  onFocus={() => handleFieldFocus("homeAddress")}
                  placeholder="Enter home address"
                  inputStyle={styles.input}
                />
                <View style={profileStyles.inlineEditorActions}>
                  <View style={{ flex: 1 }}>
                    <AppButton
                      title={isSavingAddress ? "Saving..." : "Save"}
                      onPress={() => void onSaveAddress("home")}
                      disabled={!homeAddressInput.trim() || isSavingAddress}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppButton
                      title="Cancel"
                      onPress={() => setEditingAddress(null)}
                      variant="secondary"
                    />
                  </View>
                </View>
              </View>
            )}
            <View style={profileStyles.addressDivider} />
            <Pressable
              style={({ pressed }) => [profileStyles.addressRow, pressed && editingAddress !== "work" && { opacity: 0.88 }]}
              onPress={() => startEditing("work")}>
              <View style={profileStyles.addressIconWrap}>
                <Text style={profileStyles.addressIcon}>💼</Text>
              </View>
              <View style={profileStyles.addressTextCol}>
                <Text style={profileStyles.addressLabel}>Work</Text>
                <Text
                  style={[profileStyles.addressValue, !(onboardingState as any).workAddress && profileStyles.addressEmpty]}
                  numberOfLines={1}>
                  {(onboardingState as any).workAddress ?? "Not set"}
                </Text>
              </View>
              {(onboardingState as any).workAddress ? (
                <Pressable
                  style={({ pressed }) => [profileStyles.clearAddressBtn, pressed && { opacity: 0.88 }]}
                  onPress={() => void onClearAddress("work")}
                  hitSlop={8}>
                  <Text style={profileStyles.clearAddressBtnText}>×</Text>
                </Pressable>
              ) : (
                <Text style={profileStyles.addressAddHint}>Add</Text>
              )}
            </Pressable>
            {editingAddress === "work" && (
              <View
                style={profileStyles.inlineEditor}
                onLayout={(e) => { fieldY.current.workAddress = e.nativeEvent.layout.y; }}>
                <PlacesAutocomplete
                  value={workAddressInput}
                  onChangeText={setWorkAddressInput}
                  onFocus={() => handleFieldFocus("workAddress")}
                  placeholder="Enter work address"
                  inputStyle={styles.input}
                />
                <View style={profileStyles.inlineEditorActions}>
                  <View style={{ flex: 1 }}>
                    <AppButton
                      title={isSavingAddress ? "Saving..." : "Save"}
                      onPress={() => void onSaveAddress("work")}
                      disabled={!workAddressInput.trim() || isSavingAddress}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppButton
                      title="Cancel"
                      onPress={() => setEditingAddress(null)}
                      variant="secondary"
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          <Text style={profileStyles.sectionHeading}>RIDE HISTORY</Text>
          {rideHistory === undefined ? (
            <Text style={styles.description}>Loading your rides...</Text>
          ) : pastRides.length === 0 ? (
            <Text style={styles.description}>No past rides found yet.</Text>
          ) : (
            <>
              <View style={styles.postList}>
                {previewRides.map((item) => (
                  <View key={item.id} style={[styles.postItem, profileStyles.historyRow]}>
                    <View style={profileStyles.historyLeft}>
                      <Text style={styles.postName} numberOfLines={1}>{item.startPoint} → {item.endPoint}</Text>
                      <Text style={styles.postMeta}>{VEHICLE_LABELS[item.vehicleType]} · {formatRideDateTime(item.createdAt)}</Text>
                    </View>
                    {item.stopReason === "cancelled" ? (
                      <View style={profileStyles.cancelledPill}>
                        <Text style={profileStyles.cancelledPillText}>Cancelled</Text>
                      </View>
                    ) : (
                      <View style={profileStyles.completedPill}>
                        <Text style={profileStyles.completedPillText}>Completed</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
              {pastRides.length > 3 && (
                <Pressable
                  style={({ pressed }) => [profileStyles.seeAllButton, pressed && styles.buttonPressed]}
                  onPress={() => router.push("/ride-history")}>
                  <Text style={profileStyles.seeAllText}>See all {pastRides.length} rides</Text>
                </Pressable>
              )}
            </>
          )}

          <Text style={profileStyles.sectionHeading}>MY RATINGS</Text>
          {myRatingReviews === undefined || myRatingSummary === undefined ? (
            <Text style={styles.description}>Loading rating...</Text>
          ) : myRatingSummary.totalRatings === 0 ? (
            <Text style={styles.description}>No ratings yet.</Text>
          ) : (
            <>
              {myRatingSummary.averageRating !== null && (
                <View style={profileStyles.ratingScoreRow}>
                  <Text style={profileStyles.ratingNumber}>{myRatingSummary.averageRating.toFixed(1)}</Text>
                  <View style={profileStyles.ratingStarsCol}>
                    <View style={profileStyles.starsRow}>
                      {Array.from({ length: 5 }, (_, i) => {
                        const filled = i < Math.round(myRatingSummary.averageRating!);
                        return (
                          <Text key={i} style={[profileStyles.starDisplay, filled && profileStyles.starDisplayFilled]}>
                            {filled ? "★" : "☆"}
                          </Text>
                        );
                      })}
                    </View>
                    <Text style={profileStyles.ratingCountLabel}>
                      {myRatingSummary.totalRatings} {myRatingSummary.totalRatings === 1 ? "rating" : "ratings"}
                    </Text>
                  </View>
                </View>
              )}
              {reviewItems.length > 0 && (
                <View style={profileStyles.reviewCard}>
                  <View style={profileStyles.reviewSlot}>
                    <Animated.View
                      style={[
                        profileStyles.reviewAnimated,
                        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
                      ]}>
                      {reviewItems[reviewIndex]?.rating !== null && (
                        <View style={profileStyles.reviewStarRow}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <Text key={i} style={[profileStyles.reviewStarGlyph, i < (reviewItems[reviewIndex]?.rating ?? 0) && profileStyles.reviewStarFilled]}>
                              {i < (reviewItems[reviewIndex]?.rating ?? 0) ? "★" : "☆"}
                            </Text>
                          ))}
                        </View>
                      )}
                      {reviewItems[reviewIndex]?.note ? (
                        <Text style={profileStyles.reviewQuote}>
                          "{reviewItems[reviewIndex]?.note}"
                        </Text>
                      ) : null}
                      <Text style={profileStyles.reviewMeta}>
                        {reviewItems[reviewIndex]?.reviewerName}
                      </Text>
                    </Animated.View>
                  </View>
                </View>
              )}
              {reviewItems.length > 1 && (
                <Pressable
                  style={({ pressed }) => [profileStyles.seeAllButton, pressed && styles.buttonPressed]}
                  onPress={() => setIsRatingsOpen(true)}>
                </Pressable>
              )}
            </>
          )}

          <Text style={profileStyles.sectionHeading}>ACCOUNT</Text>
          <AppButton title="Report a user" onPress={() => router.push("/report")} variant="secondary" />
          {moderationAccess?.isAdmin ? (
            <AppButton
              title="Moderation dashboard"
              onPress={() => router.push("/moderation")}
              variant="secondary"
            />
          ) : null}
          <AppButton title="Sign out" onPress={() => void onSignOut()} variant="danger" />

        </ScrollView>
      </SafeAreaView>

      <Modal visible={isRatingsOpen} transparent animationType="fade" onRequestClose={() => setIsRatingsOpen(false)}>
        <Pressable style={styles.overlayBackdrop} onPress={() => setIsRatingsOpen(false)}>
          <View style={styles.overlayCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.sectionLabel}>My ratings</Text>
            <ScrollView style={profileStyles.modalScroll} showsVerticalScrollIndicator>
              <View style={profileStyles.reviewList}>
                {reviewItems.map((review) => (
                  <View key={review.id} style={profileStyles.reviewCard}>
                    {review.rating !== null && (
                      <View style={profileStyles.reviewStarRow}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <Text key={i} style={[profileStyles.reviewStarGlyph, i < (review.rating ?? 0) && profileStyles.reviewStarFilled]}>
                            {i < (review.rating ?? 0) ? "★" : "☆"}
                          </Text>
                        ))}
                      </View>
                    )}
                    {review.note ? (
                      <Text style={profileStyles.reviewQuote}>"{review.note}"</Text>
                    ) : null}
                    <Text style={profileStyles.reviewMeta}>{review.reviewerName}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const profileStyles = StyleSheet.create({
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  identityTextCol: {
    flex: 1,
    gap: 4,
  },
  emailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flexWrap: "wrap",
  },
  emailText: {
    flexShrink: 1,
  },
  verifiedBadge: {
    borderRadius: 999,
    backgroundColor: "#1A2C45",
    borderWidth: 1,
    borderColor: "#276EF1",
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  verifiedBadgeText: {
    color: "#DBEAFE",
    fontSize: 11,
    fontFamily: "InterBold",
    letterSpacing: 0.3,
  },
  sectionHeading: {
    color: "#8A8A8A",
    fontSize: 12,
    letterSpacing: 0.8,
    fontFamily: "InterBold",
    textTransform: "uppercase",
  },
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
  seeAllButton: {
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  seeAllText: {
    color: "#5BA0F2",
    fontSize: 14,
    fontFamily: "InterMedium",
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: "#383838",
    backgroundColor: "#1E1E1E",
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  reviewSlot: {
    overflow: "hidden",
    minHeight: 56,
    justifyContent: "center",
  },
  reviewAnimated: {
    gap: 6,
  },
  reviewList: {
    gap: 12,
  },
  reviewQuote: {
    color: "#F0F0F0",
    fontSize: 15,
    fontFamily: "InterMedium",
  },
  reviewMeta: {
    color: "#8A8A8A",
    fontSize: 12,
    fontFamily: "InterMedium",
  },
  modalScroll: {
    maxHeight: 420,
  },
  ratingScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 4,
  },
  ratingNumber: {
    fontSize: 42,
    fontFamily: "InterBold",
    color: "#FFFFFF",
    lineHeight: 48,
    letterSpacing: -1,
  },
  ratingStarsCol: {
    gap: 4,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  starDisplay: {
    fontSize: 20,
    color: "#404040",
    lineHeight: 24,
  },
  starDisplayFilled: {
    color: "#F59E0B",
  },
  ratingCountLabel: {
    color: "#8A8A8A",
    fontSize: 12,
    fontFamily: "InterMedium",
  },
  reviewStarRow: {
    flexDirection: "row",
    gap: 2,
    marginBottom: 2,
  },
  reviewStarGlyph: {
    fontSize: 14,
    color: "#404040",
    lineHeight: 18,
  },
  reviewStarFilled: {
    color: "#F59E0B",
  },
  addressCard: {
    borderWidth: 1,
    borderColor: "#383838",
    backgroundColor: "#262626",
    borderRadius: 16,
    overflow: "hidden",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  addressIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#1E1E1E",
    alignItems: "center",
    justifyContent: "center",
  },
  addressIcon: {
    fontSize: 16,
    lineHeight: 20,
  },
  addressTextCol: {
    flex: 1,
    gap: 2,
  },
  addressLabel: {
    fontSize: 13,
    color: "#C0C0C0",
    fontFamily: "InterBold",
  },
  addressValue: {
    fontSize: 13,
    color: "#F0F0F0",
    fontFamily: "InterMedium",
  },
  addressEmpty: {
    color: "#505050",
  },
  addressAddHint: {
    color: "#5BA0F2",
    fontSize: 13,
    fontFamily: "InterMedium",
  },
  clearAddressBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: "#1E1E1E",
    borderWidth: 1,
    borderColor: "#383838",
    alignItems: "center",
    justifyContent: "center",
  },
  clearAddressBtnText: {
    color: "#8A8A8A",
    fontSize: 18,
    fontFamily: "InterMedium",
    lineHeight: 22,
  },
  addressDivider: {
    height: 1,
    backgroundColor: "#383838",
  },
  inlineEditor: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 10,
  },
  inlineEditorActions: {
    flexDirection: "row",
    gap: 8,
  },
});
