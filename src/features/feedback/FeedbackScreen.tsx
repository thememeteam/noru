import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppButton } from "../../components/AppButton";
import { styles } from "../styles";

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

export function FeedbackScreen() {
  const params = useLocalSearchParams<{ ridePostId?: string }>();
  const ridePostId = params.ridePostId;

  const [rating, setRating] = useState(0);
  const [whatWasGood, setWhatWasGood] = useState("");
  const [whatWasBad, setWhatWasBad] = useState("");
  const [anythingElse, setAnythingElse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => !isSubmitting, [isSubmitting]);

  const onStarPress = (value: number) => {
    setRating((prev) => (prev === value ? 0 : value));
  };

  const onSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        ridePostId: ridePostId ?? null,
        rating,
        whatWasGood: whatWasGood.trim(),
        whatWasBad: whatWasBad.trim(),
        anythingElse: anythingElse.trim(),
      };

      console.log("Ride feedback submitted", payload);

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
            <Text style={styles.description}>Tell us about this ride to help improve future trips.</Text>

            <Text style={styles.sectionLabel}>Rating (0-5 stars)</Text>
            <View style={styles.starRow}>
              {STAR_VALUES.map((value) => {
                const isActive = value <= rating;
                return (
                  <Pressable
                    key={value}
                    style={[styles.starButton, isActive && styles.starButtonActive]}
                    onPress={() => onStarPress(value)}>
                    <Text style={[styles.starText, isActive && styles.starTextActive]}>★</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.postMeta}>Selected rating: {rating}</Text>

            <Text style={styles.sectionLabel}>What was good?</Text>
            <TextInput
              style={[styles.input, styles.feedbackTextArea]}
              value={whatWasGood}
              onChangeText={setWhatWasGood}
              placeholder="Share what you liked"
              placeholderTextColor="#7B879C"
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.sectionLabel}>What was bad?</Text>
            <TextInput
              style={[styles.input, styles.feedbackTextArea]}
              value={whatWasBad}
              onChangeText={setWhatWasBad}
              placeholder="Share what could be improved"
              placeholderTextColor="#7B879C"
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.sectionLabel}>Anything else?</Text>
            <TextInput
              style={[styles.input, styles.feedbackTextArea]}
              value={anythingElse}
              onChangeText={setAnythingElse}
              placeholder="Any other comments"
              placeholderTextColor="#7B879C"
              multiline
              textAlignVertical="top"
            />

            <AppButton
              title={isSubmitting ? "Submitting..." : "Submit feedback"}
              onPress={() => void onSubmit()}
              disabled={!canSubmit}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
