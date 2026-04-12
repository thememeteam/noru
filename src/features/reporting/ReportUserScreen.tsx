import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
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
  const [selectedRidePostId, setSelectedRidePostId] = useState<string | null>(ridePostId ?? null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const suggestions = useQuery(api.moderation.getReportTargetSuggestions, {
    keyword: reportedName,
  }) ?? [];

  const sharedRidesQuery = useQuery(
    api.moderation.getSharedReportableRides,
    selectedReportedUserId ? { reportedUserId: selectedReportedUserId as Id<"users"> } : "skip",
  );
  const sharedRides = sharedRidesQuery ?? [];

  useEffect(() => {
    if (!selectedRidePostId || sharedRidesQuery === undefined) {
      return;
    }

    const isStillValid = sharedRides.some((ride) => ride.ridePostId === selectedRidePostId);
    if (!isStillValid) {
      setSelectedRidePostId(null);
    }
  }, [selectedRidePostId, sharedRides, sharedRidesQuery]);

  const isRideSelectionRequired = selectedReportedUserId !== null && sharedRides.length > 0;

  const canSubmit = useMemo(() => {
    return (
      reportedName.trim().length > 0
      && reason.trim().length >= 8
      && !isSubmitting
      && (!isRideSelectionRequired || Boolean(selectedRidePostId))
    );
  }, [isSubmitting, isRideSelectionRequired, reason, reportedName, selectedRidePostId]);

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
        ridePostId: selectedRidePostId ? (selectedRidePostId as Id<"ridePosts">) : undefined,
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
                        setSelectedRidePostId(ridePostId ?? null);
                      }}>
                      <Text style={styles.postName}>{item.displayName}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {selectedReportedUserId ? (
              <>
                <Text style={styles.sectionLabel}>Ride to report</Text>
                {sharedRidesQuery === undefined ? (
                  <Text style={styles.postMeta}>Loading shared rides...</Text>
                ) : sharedRides.length === 0 ? (
                  <Text style={styles.postMeta}>No shared rides found with this user today.</Text>
                ) : (
                  <View style={styles.postList}>
                    {sharedRides.map((ride) => {
                      const isSelected = selectedRidePostId === ride.ridePostId;
                      const rideDate = new Date(ride.createdAt).toLocaleString();
                      return (
                        <Pressable
                          key={ride.ridePostId}
                          style={[styles.postItem, isSelected && styles.moderationSelectedItem]}
                          onPress={() => setSelectedRidePostId(ride.ridePostId)}>
                          <Text style={styles.postName}>{ride.startPoint} {"->"} {ride.endPoint}</Text>
                          <Text style={styles.postMeta}>{rideDate}</Text>
                          <Text style={styles.postMeta}>Vehicle: {ride.vehicleType}</Text>
                          <Text style={styles.postMeta}>Hosted by: {ride.riderName}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                {isRideSelectionRequired && !selectedRidePostId ? (
                  <Text style={styles.postMeta}>Select a ride from the shared rides above.</Text>
                ) : null}
              </>
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

            <Pressable
              onPress={() => void onSubmit()}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.buttonBase,
                {
                  backgroundColor: "#F5E4E8",
                  borderWidth: 1,
                  borderColor: "#E3A7B5",
                },
                !canSubmit && styles.buttonDisabled,
                pressed && canSubmit && styles.buttonPressed,
              ]}>
              <Text style={[styles.buttonText, { color: "#8D2E47" }]}>
                {isSubmitting ? "Submitting..." : "Submit report"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
