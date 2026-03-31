import { useMutation } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppButton } from "../../components/AppButton";
import { styles } from "../styles";

type ReportCategory = "unsafeBehaviour" | "harassmentConcern" | "noShowComplaint";

const CATEGORY_OPTIONS: Array<{ key: ReportCategory; label: string }> = [
  { key: "unsafeBehaviour", label: "Unsafe behaviour" },
  { key: "harassmentConcern", label: "Harassment concern" },
  { key: "noShowComplaint", label: "No-show complaint" },
];

export function ReportUserScreen() {
  const params = useLocalSearchParams<{ reportedUserId?: string; reportedName?: string; ridePostId?: string }>();
  const createUserReport = useMutation(api.moderation.createUserReport);

  const reportedUserId = params.reportedUserId;
  const reportedName = params.reportedName ?? "Unknown user";
  const ridePostId = params.ridePostId;

  const [category, setCategory] = useState<ReportCategory>("unsafeBehaviour");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return !!reportedUserId && details.trim().length >= 8 && !isSubmitting;
  }, [details, isSubmitting, reportedUserId]);

  const onSubmit = async () => {
    if (!canSubmit || !reportedUserId) {
      return;
    }

    try {
      setIsSubmitting(true);
      await createUserReport({
        reportedUserId: reportedUserId as Id<"users">,
        reportedName,
        category,
        details: details.trim(),
        ridePostId: ridePostId ? (ridePostId as Id<"ridePosts">) : undefined,
      });

      Alert.alert("Report submitted", "Thanks for reporting. We will review this soon.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert(
        "Could not submit report",
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
            <Text style={styles.title}>Report user</Text>
            <Text style={styles.description}>Reported user: {reportedName}</Text>

            <Text style={styles.sectionLabel}>Issue type</Text>
            <View style={styles.vehicleRow}>
              {CATEGORY_OPTIONS.map((option) => {
                const isSelected = category === option.key;
                return (
                  <Pressable
                    key={option.key}
                    style={[styles.vehicleChip, isSelected && styles.vehicleChipSelected]}
                    onPress={() => setCategory(option.key)}>
                    <Text style={[styles.vehicleChipText, isSelected && styles.vehicleChipTextSelected]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>What happened?</Text>
            <TextInput
              style={[styles.input, styles.feedbackTextArea]}
              value={details}
              onChangeText={setDetails}
              placeholder="Please share details so moderation can take action"
              placeholderTextColor="#7B879C"
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.postMeta}>Minimum 8 characters.</Text>

            <AppButton
              title={isSubmitting ? "Submitting..." : "Submit report"}
              onPress={() => void onSubmit()}
              disabled={!canSubmit}
              variant="danger"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
