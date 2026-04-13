import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppButton } from "../../components/AppButton";
import { useAppStyles } from "../theme/AppTheme";

const FEEDBACK_TAGS: Array<{ label: string; rating: number }> = [
  { label: "Punctual", rating: 5 },
  { label: "Good music", rating: 4 },
  { label: "Friendly", rating: 4 },
  { label: "Smooth ride", rating: 5 },
];

export function FeedbackScreen() {
  const styles = useAppStyles();
  const params = useLocalSearchParams<{ ridePostId?: string }>();
  const ridePostId = params.ridePostId;
  const feedbackTargets = useQuery(
    api.rides.getRideFeedbackTargets,
    ridePostId ? { ridePostId: ridePostId as Id<"ridePosts"> } : "skip",
  );
  const submitRideUserFeedback = useMutation(api.rides.submitRideUserFeedback);

  const [ratingsByUser, setRatingsByUser] = useState<Record<string, number>>({});
  const [selectedTagByUser, setSelectedTagByUser] = useState<Record<string, string>>({});
  const [elseByUser, setElseByUser] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (isSubmitting || !feedbackTargets || feedbackTargets.targets.length === 0) {
      return false;
    }

    return feedbackTargets.targets.every((target) => (ratingsByUser[String(target.userId)] ?? 0) > 0);
  }, [feedbackTargets, isSubmitting, ratingsByUser]);

  const onTagPress = (userId: string, label: string, rating: number) => {
    const isSameTag = selectedTagByUser[userId] === label;

    setSelectedTagByUser((prev) => {
      const next = { ...prev };
      if (isSameTag) {
        delete next[userId];
      } else {
        next[userId] = label;
      }
      return next;
    });

    setRatingsByUser((prev) => ({
      ...prev,
      [userId]: isSameTag ? 0 : rating,
    }));
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
          return {
            rateeUserId: target.userId,
            rating: ratingsByUser[key] ?? 0,
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
    <View style={styles.screenContainer}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.boardContent}>
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
                  const selectedTag = selectedTagByUser[key];

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
                          const isActive = selectedTag === tag.label;
                          return (
                            <Pressable
                              key={`${key}-${tag.label}`}
                              style={[styles.vehicleChip, isActive && styles.vehicleChipSelected]}
                              onPress={() => onTagPress(key, tag.label, tag.rating)}>
                              <Text style={[styles.vehicleChipText, isActive && styles.vehicleChipTextSelected]}>{tag.label}</Text>
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
    </View>
  );
}

const feedbackStyles = {
  questionLabel: {
    fontSize: 14,
    color: "#D1D5DB",
    fontFamily: "GoogleSansFlexBold",
  },
} as const;
