import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppButton } from "../../components/AppButton";
import { useAppStyles } from "../theme/AppTheme";

export function ReportUserScreen() {
  const styles = useAppStyles();
  const params = useLocalSearchParams<{ reportedUserId?: string; reportedName?: string; ridePostId?: string; stopRideOnSubmit?: string }>();
  const createUserReport = useMutation(api.moderation.createUserReport);
  const stopRidePost = useMutation(api.rides.stopRidePost);

  const reportedUserId = params.reportedUserId;
  const initialReportedName = params.reportedName ?? "";
  const ridePostId = params.ridePostId;
  const stopRideOnSubmit = params.stopRideOnSubmit === "1";

  const [reportedName, setReportedName] = useState(initialReportedName);
  const [selectedReportedUserId, setSelectedReportedUserId] = useState<string | null>(reportedUserId ?? null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const suggestions = useQuery(api.moderation.getReportTargetSuggestions, {
    keyword: reportedName,
  }) ?? [];

  const canSubmit = useMemo(() => {
    return reportedName.trim().length > 0 && reason.trim().length >= 8 && !isSubmitting;
  }, [isSubmitting, reason, reportedName]);

  const onSubmit = async () => {
    if (!canSubmit) {
      return;
    }

    try {
      setIsSubmitting(true);
      await createUserReport({
        reportedUserId: selectedReportedUserId ? (selectedReportedUserId as Id<"users">) : undefined,
        reportedName: reportedName.trim(),
        reason: reason.trim(),
        ridePostId: ridePostId ? (ridePostId as Id<"ridePosts">) : undefined,
      });

      if (stopRideOnSubmit && ridePostId) {
        await stopRidePost({ ridePostId: ridePostId as Id<"ridePosts"> });
      }

      if (stopRideOnSubmit && ridePostId) {
        Alert.alert("Report submitted", "Ride has been stopped and your report is recorded.", [
          {
            text: "OK",
            onPress: () => router.replace({ pathname: "/feedback", params: { ridePostId } }),
          },
        ]);
      } else {
        Alert.alert("Report submitted", "Thanks for reporting. We will review this soon.", [
          {
            text: "OK",
            onPress: () => router.replace("/"),
          },
        ]);
      }
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
            <Text style={styles.description}>Submit an incident report for another user.</Text>

            <Text style={styles.sectionLabel}>User name</Text>
            <TextInput
              style={styles.input}
              value={reportedName}
              onChangeText={(value) => {
                setReportedName(value);
                setSelectedReportedUserId(null);
              }}
              placeholder="Enter the user's name"
              placeholderTextColor="#7B879C"
            />
            {suggestions.length > 0 ? (
              <View style={styles.postList}>
                {suggestions.map((item) => {
                  const isSelected = selectedReportedUserId === item.userId;
                  return (
                    <Pressable
                      key={item.userId}
                      style={[styles.postItem, isSelected && styles.moderationSelectedItem]}
                      onPress={() => {
                        setReportedName(item.plainName);
                        setSelectedReportedUserId(item.userId);
                      }}>
                      <Text style={styles.postName}>{item.displayName}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>Reason</Text>
            <TextInput
              style={[styles.input, styles.feedbackTextArea]}
              value={reason}
              onChangeText={setReason}
              placeholder="Describe what happened"
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
