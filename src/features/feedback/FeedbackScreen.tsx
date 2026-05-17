import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppButton } from "../../components/AppButton";
import { useKeyboardAwareScroll } from "../../lib/useKeyboardAwareScroll";
import { useAppStyles } from "../theme/AppTheme";

const FEEDBACK_TAGS = ["Punctual", "Friendly", "Good music", "Smooth ride", "Easy to coordinate"];
const STAR_COUNT = 5;

function StarPicker({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <View style={feedbackStyles.starRow}>
      {Array.from({ length: STAR_COUNT }, (_, i) => {
        const starValue = i + 1;
        const filled = value !== null && starValue <= value;
        return (
          <Pressable
            key={starValue}
            onPress={() => onChange(starValue)}
            hitSlop={6}
            style={({ pressed }) => [feedbackStyles.starButton, pressed && { opacity: 0.7 }]}>
            <Text style={[feedbackStyles.starGlyph, filled && feedbackStyles.starFilled]}>
              {filled ? "★" : "☆"}
            </Text>
          </Pressable>
        );
      })}
      {value !== null && (
        <Text style={feedbackStyles.starLabel}>
          {value === 1 ? "Poor" : value === 2 ? "Fair" : value === 3 ? "Good" : value === 4 ? "Great" : "Excellent"}
        </Text>
      )}
    </View>
  );
}

export function FeedbackScreen() {
  const styles = useAppStyles();
  const params = useLocalSearchParams<{ ridePostId?: string }>();
  const ridePostId = params.ridePostId;
  const feedbackTargets = useQuery(
    api.rides.getRideFeedbackTargets,
    ridePostId ? { ridePostId: ridePostId as Id<"ridePosts"> } : "skip",
  );
  const submitRideUserFeedback = useMutation(api.rides.submitRideUserFeedback);

  const [selectedStarByUser, setSelectedStarByUser] = useState<Record<string, number>>({});
  const [selectedTagsByUser, setSelectedTagsByUser] = useState<Record<string, string[]>>({});
  const [elseByUser, setElseByUser] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const noteInputRefs = useRef<Record<string, React.RefObject<TextInput>>>({});
  const { scrollViewRef, onScroll, onLayout, onInputFocus } = useKeyboardAwareScroll();

  const getNoteInputRef = (key: string) => {
    if (!noteInputRefs.current[key]) {
      noteInputRefs.current[key] = React.createRef<TextInput>();
    }
    return noteInputRefs.current[key];
  };

  const canSubmit = useMemo(() => {
    if (isSubmitting || !feedbackTargets || feedbackTargets.targets.length === 0) {
      return false;
    }
    return feedbackTargets.targets.every(
      (target) => typeof selectedStarByUser[String(target.userId)] === "number",
    );
  }, [feedbackTargets, isSubmitting, selectedStarByUser]);

  const onTagPress = (userId: string, label: string) => {
    const currentTags = selectedTagsByUser[userId] ?? [];
    const nextTags = currentTags.includes(label)
      ? currentTags.filter((t) => t !== label)
      : [...currentTags, label];
    setSelectedTagsByUser((prev) => ({ ...prev, [userId]: nextTags }));
  };

  const onSubmit = async () => {
    if (!canSubmit || !feedbackTargets || !ridePostId) {
      return;
    }

    try {
      setIsSubmitting(true);
      await submitRideUserFeedback({
        ridePostId: ridePostId as Id<"ridePosts">,
        ratings: feedbackTargets.targets.map((target) => {
          const key = String(target.userId);
          const selectedTags = selectedTagsByUser[key] ?? [];
          return {
            rateeUserId: target.userId,
            rating: selectedStarByUser[key]!,
            whatWasGood: selectedTags.length > 0 ? selectedTags.join(", ") : undefined,
            anythingElse: elseByUser[key]?.trim() || undefined,
          };
        }),
      });

      Alert.alert("Thanks!", "Your feedback has been submitted.", [
        { text: "OK", onPress: () => router.replace("/") },
      ]);
    } catch (error) {
      Alert.alert(
        "Could not submit feedback",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (feedbackTargets === undefined) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#1E6CCC" />
        </View>
      );
    }

    if (feedbackTargets.targets.length === 0) {
      return (
        <>
          <Text style={styles.description}>No participants to rate for this ride.</Text>
          <AppButton title="Go home" onPress={() => router.replace("/")} variant="secondary" />
        </>
      );
    }

    return (
      <>
        <Text style={feedbackStyles.intro}>
          Rate each participant to submit. Tags are optional.
        </Text>

        {feedbackTargets.targets.map((target) => {
          const key = String(target.userId);
          const selectedTags = selectedTagsByUser[key] ?? [];
          const starValue = selectedStarByUser[key] ?? null;

          return (
            <View key={key} style={feedbackStyles.personCard}>
              <View style={styles.personRow}>
                {target.photoUrl ? (
                  <Image source={{ uri: target.photoUrl }} style={styles.personAvatarSmall} />
                ) : (
                  <View style={styles.personAvatarFallbackSmall}>
                    <Text style={styles.personAvatarFallbackTextSmall}>
                      {target.displayName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View>
                  <Text style={styles.postName}>{target.displayName}</Text>
                  <Text style={styles.postMeta}>{target.email ?? "No email"}</Text>
                </View>
              </View>

              <Text style={feedbackStyles.questionLabel}>Rating</Text>
              <StarPicker
                value={starValue}
                onChange={(v) => setSelectedStarByUser((prev) => ({ ...prev, [key]: v }))}
              />

              <Text style={feedbackStyles.questionLabel}>What went well? (optional)</Text>
              <View style={styles.quickRow}>
                {FEEDBACK_TAGS.map((tag) => {
                  const isActive = selectedTags.includes(tag);
                  return (
                    <Pressable
                      key={`${key}-${tag}`}
                      style={[styles.vehicleChip, isActive && styles.vehicleChipSelected]}
                      onPress={() => onTagPress(key, tag)}>
                      <Text style={[styles.vehicleChipText, isActive && styles.vehicleChipTextSelected]}>
                        {tag}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={feedbackStyles.noteLabel}>Note (optional)</Text>
              <TextInput
                style={[styles.input, styles.feedbackTextArea]}
                value={elseByUser[key] ?? ""}
                onChangeText={(value) => setElseByUser((prev) => ({ ...prev, [key]: value }))}
                ref={getNoteInputRef(key)}
                onFocus={() => onInputFocus(getNoteInputRef(key))}
                placeholder="Anything else worth mentioning..."
                placeholderTextColor="#7B879C"
                multiline
                textAlignVertical="top"
              />
            </View>
          );
        })}

        <AppButton
          title={isSubmitting ? "Submitting..." : "Submit feedback"}
          onPress={() => void onSubmit()}
          disabled={!canSubmit}
        />

        <Pressable
          style={({ pressed }) => [feedbackStyles.skipButton, pressed && styles.buttonPressed]}
          onPress={() => router.replace("/")}>
          <Text style={feedbackStyles.skipButtonText}>Skip for now</Text>
        </Pressable>
      </>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screenContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <SafeAreaView edges={["bottom"]} style={[styles.safeArea, { paddingHorizontal: 0 }]}>
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={[styles.boardContent, { paddingHorizontal: 16 }]}
          keyboardShouldPersistTaps="handled"
          onScroll={onScroll}
          onLayout={onLayout}
          scrollEventThrottle={16}>
          {renderContent()}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const feedbackStyles = StyleSheet.create({
  intro: {
    color: "#C7CDD9",
    fontSize: 14,
    fontFamily: "InterMedium",
    lineHeight: 20,
  },
  personCard: {
    borderWidth: 1,
    borderColor: "#4B5563",
    backgroundColor: "#2A2D33",
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  questionLabel: {
    fontSize: 13,
    color: "#AEB5C0",
    fontFamily: "InterBold",
    letterSpacing: 0.4,
  },
  noteLabel: {
    fontSize: 13,
    color: "#AEB5C0",
    fontFamily: "InterBold",
    letterSpacing: 0.4,
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  starButton: {
    padding: 2,
  },
  starGlyph: {
    fontSize: 32,
    color: "#3A3F47",
    lineHeight: 38,
  },
  starFilled: {
    color: "#F59E0B",
  },
  starLabel: {
    color: "#C7CDD9",
    fontSize: 13,
    fontFamily: "InterMedium",
    marginLeft: 6,
  },
  skipButton: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    color: "#6B7280",
    fontSize: 14,
    fontFamily: "InterMedium",
  },
});
