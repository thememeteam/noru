import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppButton } from "../../components/AppButton";
import { useAppStyles } from "../theme/AppTheme";

const FEEDBACK_TAGS = ["Punctual", "Good music", "Friendly", "Smooth ride"];

export function FeedbackScreen() {
  const styles = useAppStyles();
  const params = useLocalSearchParams<{ ridePostId?: string }>();
  const ridePostId = params.ridePostId;
  const feedbackTargets = useQuery(
    api.rides.getRideFeedbackTargets,
    ridePostId ? { ridePostId: ridePostId as Id<"ridePosts"> } : "skip",
  );
  const submitRideUserFeedback = useMutation(api.rides.submitRideUserFeedback);

  const [selectedTagsByUser, setSelectedTagsByUser] = useState<Record<string, string[]>>({});
  const [elseByUser, setElseByUser] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (isSubmitting || !feedbackTargets || feedbackTargets.targets.length === 0) {
      return false;
    }

    return feedbackTargets.targets.every((target) => (selectedTagsByUser[String(target.userId)] ?? []).length > 0);
  }, [feedbackTargets, isSubmitting, selectedTagsByUser]);

  const onTagPress = (userId: string, label: string) => {
    const currentTags = selectedTagsByUser[userId] ?? [];
    const nextTags = currentTags.includes(label)
      ? currentTags.filter((tag) => tag !== label)
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
            whatWasGood: selectedTags.length > 0 ? selectedTags.join(", ") : undefined,
            anythingElse: elseByUser[key]?.trim() || undefined,
          };
        }),
      });

      Alert.alert("Thanks!", "Your feedback has been submitted.", [
        {
          text: "OK",
          onPress: () => router.replace("/"),
        },
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

  return (
    <KeyboardAvoidingView
      style={styles.screenContainer}
      behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.boardContent} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.title}>Ride feedback</Text>
            {feedbackTargets === undefined ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#1E6CCC" />
              </View>
            ) : feedbackTargets.targets.length === 0 ? (
              <Text style={styles.description}>No users to rate for this ride.</Text>
            ) : (
              <>
                <Text style={styles.description}>Share your feedback with each participant.</Text>
                {feedbackTargets.targets.map((target) => {
                  const key = String(target.userId);
                  const selectedTags = selectedTagsByUser[key] ?? [];

                  return (
                    <View key={key} style={styles.postItem}>
                      <View style={styles.personRow}>
                        {target.photoUrl ? (
                          <Image source={{ uri: target.photoUrl }} style={styles.personAvatarSmall} />
                        ) : (
                          <View style={styles.personAvatarFallbackSmall}>
                            <Text style={styles.personAvatarFallbackTextSmall}>U</Text>
                          </View>
                        )}
                        <View>
                          <Text style={styles.postName}>{target.displayName}</Text>
                          <Text style={styles.postMeta}>{target.email ?? "No email found"}</Text>
                        </View>
                      </View>

                      <Text style={feedbackStyles.questionLabel}>What went well?</Text>
                      <View style={styles.quickRow}>
                        {FEEDBACK_TAGS.map((tag) => {
                          const isActive = selectedTags.includes(tag);
                          return (
                            <Pressable
                              key={`${key}-${tag}`}
                              style={[styles.vehicleChip, isActive && styles.vehicleChipSelected]}
                              onPress={() => onTagPress(key, tag)}>
                              <Text style={[styles.vehicleChipText, isActive && styles.vehicleChipTextSelected]}>{tag}</Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      <Text style={styles.sectionLabel}>Add a note (optional)</Text>
                      <TextInput
                        style={[styles.input, styles.feedbackTextArea]}
                        value={elseByUser[key] ?? ""}
                        onChangeText={(value) => setElseByUser((prev) => ({ ...prev, [key]: value }))}
                        placeholder="e.g. always on time, easy to coordinate..."
                        placeholderTextColor="#7B879C"
                        multiline
                        textAlignVertical="top"
                      />

                      <Text style={styles.postMeta}>Safety concern? (Private)</Text>
                    </View>
                  );
                })}

                <AppButton
                  title={isSubmitting ? "Submitting..." : "Submit feedback"}
                  onPress={() => void onSubmit()}
                  disabled={!canSubmit}
                />
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const feedbackStyles = {
  questionLabel: {
    fontSize: 14,
    color: "#D1D5DB",
    fontFamily: "InterBold",
  },
} as const;
