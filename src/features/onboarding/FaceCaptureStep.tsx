import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppButton } from "../../components/AppButton";
import { RidePickScreen } from "../rides/RidePickScreen";
import { useAppStyles } from "../theme/AppTheme";

type GenderOption = "female" | "male" | "nonBinary" | "preferNotToSay";

const GENDER_OPTIONS: { value: GenderOption; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "nonBinary", label: "Non-binary" },
  { value: "preferNotToSay", label: "Prefer not to say" },
];

export function FaceCaptureStep() {
  const styles = useAppStyles();
  const { signOut } = useAuthActions();
  const onboarding = useQuery(api.onboarding.getOnboardingState);
  const generateUploadUrl = useMutation(api.onboarding.generateProfilePhotoUploadUrl);
  const completeOnboarding = useMutation(api.onboarding.completeStudentOnboarding);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedGender, setSelectedGender] = useState<GenderOption | null>(null);

  const isCompleted = onboarding?.isCompleted ?? false;
  const email = onboarding?.universityEmail;
  const firstName = onboarding?.displayName?.split(" ")[0] || email?.split("@")[0] || "Student";

  const canSubmit = useMemo(
    () => !!photoUri && !isSubmitting && selectedGender !== null,
    [photoUri, isSubmitting, selectedGender],
  );

  const captureFace = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.75 });
    if (!photo?.uri) {
      throw new Error("Photo capture failed.");
    }
    setPhotoUri(photo.uri);
  };

  const uploadAndComplete = async () => {
    if (!photoUri || !selectedGender) {
      return;
    }

    setIsSubmitting(true);
    try {
      const uploadUrl = await generateUploadUrl({});
      const uploadResponse = await FileSystem.uploadAsync(uploadUrl, photoUri, {
        httpMethod: "POST",
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          "Content-Type": "image/jpeg",
        },
      });

      if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
        throw new Error("Could not upload profile photo.");
      }

      const uploadData = JSON.parse(uploadResponse.body) as { storageId?: string };
      if (!uploadData.storageId) {
        throw new Error("Upload did not return a storage id.");
      }

      await completeOnboarding({
        profilePhotoStorageId: uploadData.storageId as Id<"_storage">,
        gender: selectedGender,
      });
    } catch (error) {
      Alert.alert(
        "Onboarding failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (onboarding === undefined) {
    return <ActivityIndicator size="large" color="#1E6CCC" />;
  }

  if (isCompleted) {
    return <RidePickScreen />;
  }

  if (!permission?.granted) {
    return (
      <View style={styles.centeredWrap}>
        <View style={styles.card}>
          <Text style={styles.title}>Camera access needed</Text>
          <Text style={styles.description}>Your photo is verified against your university account. That's what makes everyone on Noru a real student.</Text>
          <AppButton title="Allow camera access" onPress={() => void requestPermission()} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.boardContent, { paddingTop: 20 }]}>
      <View style={styles.card}>
        <View style={onboardingStyles.identityBlock}>
          <Text style={styles.postName}>Hello, {firstName}</Text>
          <Text style={styles.postMeta}>{email ?? "university email"}</Text>
        </View>

        <Text style={onboardingStyles.stepLabel}>Gender</Text>
        <Text style={styles.description}>
          Used for women-only ride options.
        </Text>
        <View style={onboardingStyles.genderGrid}>
          {GENDER_OPTIONS.map(({ value, label }) => {
            const active = selectedGender === value;
            return (
              <Pressable
                key={value}
                style={({ pressed }) => [
                  onboardingStyles.genderChip,
                  active && onboardingStyles.genderChipActive,
                  pressed && !active && onboardingStyles.genderChipPressed,
                ]}
                onPress={() => setSelectedGender(value)}>
                <Text style={[onboardingStyles.genderChipText, active && onboardingStyles.genderChipTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[onboardingStyles.stepLabel, { marginTop: 8 }]}>Profile photo</Text>
        <Text style={styles.description}>
          Your photo is verified against your university account. That's what makes everyone on Noru a real student. Must be taken on camera.
        </Text>

        {!isCameraOpen && !photoUri ? (
          <Pressable
            style={({ pressed }) => [onboardingStyles.openCameraButton, pressed && styles.buttonPressed]}
            onPress={() => setIsCameraOpen(true)}>
            <Text style={onboardingStyles.openCameraButtonText}>Open camera</Text>
          </Pressable>
        ) : !photoUri ? (
          <>
            <View style={styles.cameraWrap}>
              <CameraView ref={cameraRef} facing="front" style={styles.camera} />
            </View>
            <View style={styles.buttonRow}>
              <AppButton title="Capture face photo" onPress={() => void captureFace()} />
              <AppButton title="Close camera" onPress={() => setIsCameraOpen(false)} variant="secondary" />
            </View>
          </>
        ) : (
          <>
            <Image source={{ uri: photoUri }} style={styles.camera} />
            <View style={styles.buttonRow}>
              <AppButton
                title="Retake"
                onPress={() => {
                  setPhotoUri(null);
                  setIsCameraOpen(true);
                }}
                variant="secondary"
              />
              <AppButton
                title={isSubmitting ? "Uploading..." : "Finish setup"}
                onPress={() => void uploadAndComplete()}
                disabled={!canSubmit}
              />
            </View>
            {!canSubmit && !isSubmitting && !selectedGender && (
              <Text style={onboardingStyles.submitHint}>
                Select a gender above to continue.
              </Text>
            )}
          </>
        )}

        <Pressable
          style={({ pressed }) => [onboardingStyles.signOutLink, pressed && { opacity: 0.6 }]}
          onPress={() => void signOut()}>
          <Text style={onboardingStyles.signOutLinkText}>Not you? Sign out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const onboardingStyles = StyleSheet.create({
  identityBlock: {
    gap: 2,
  },
  stepLabel: {
    fontSize: 13,
    color: "#AEB5C0",
    fontFamily: "InterBold",
    letterSpacing: 0.3,
  },
  genderGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genderChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#5B6371",
    backgroundColor: "#2A2D33",
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  genderChipActive: {
    backgroundColor: "#1F3654",
    borderColor: "#60A5FA",
  },
  genderChipPressed: {
    opacity: 0.88,
  },
  genderChipText: {
    color: "#9CA3AF",
    fontSize: 14,
    fontFamily: "InterMedium",
  },
  genderChipTextActive: {
    color: "#DBEAFE",
    fontFamily: "InterBold",
  },
  openCameraButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: "#1E6CCC",
    alignItems: "center",
    justifyContent: "center",
  },
  openCameraButtonText: {
    color: "#EAF3FF",
    fontSize: 16,
    fontFamily: "InterBold",
  },
  submitHint: {
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 13,
    fontFamily: "InterMedium",
  },
  signOutLink: {
    alignSelf: "center",
    paddingVertical: 6,
    marginTop: 4,
  },
  signOutLinkText: {
    color: "#6B7280",
    fontSize: 13,
    fontFamily: "InterMedium",
  },
});
