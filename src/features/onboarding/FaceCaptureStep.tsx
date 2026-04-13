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

export function FaceCaptureStep() {
  const styles = useAppStyles();
  const onboarding = useQuery(api.onboarding.getOnboardingState);
  const generateUploadUrl = useMutation(api.onboarding.generateProfilePhotoUploadUrl);
  const completeOnboarding = useMutation(api.onboarding.completeStudentOnboarding);

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const isCompleted = onboarding?.isCompleted ?? false;
  const email = onboarding?.universityEmail;

  const canSubmit = useMemo(() => !!photoUri && !isSubmitting, [photoUri, isSubmitting]);

  const captureFace = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.75 });
    if (!photo?.uri) {
      throw new Error("Photo capture failed.");
    }
    setPhotoUri(photo.uri);
  };

  const uploadAndComplete = async () => {
    if (!photoUri) {
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
          <Text style={styles.title}>Capture your face</Text>
          <Text style={styles.description}>A profile photo is mandatory before you can ride.</Text>
          <AppButton title="Allow camera access" onPress={() => void requestPermission()} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.boardContent}>
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Complete your profile</Text>
        <Text style={styles.postName}>Hello, {email?.split("@")[0] ?? "Student"}</Text>
        <Text style={styles.postMeta}>{email ?? "university email"}</Text>
        <Text style={styles.description}>One last step. Capture a profile photo so other students can recognize you.</Text>

        {!isCameraOpen && !photoUri ? (
          <>
            <View style={onboardingStyles.cameraIconWrap}>
              <Text style={onboardingStyles.cameraIcon}>⌾</Text>
            </View>
            <Text style={styles.postMeta}>Must be captured on camera - no uploads.</Text>
            <Pressable
              style={({ pressed }) => [onboardingStyles.openCameraButton, pressed && styles.buttonPressed]}
              onPress={() => setIsCameraOpen(true)}>
              <Text style={onboardingStyles.openCameraButtonText}>Open camera</Text>
            </Pressable>
          </>
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
                title={isSubmitting ? "Uploading..." : "Upload and finish"}
                onPress={() => void uploadAndComplete()}
                disabled={!canSubmit}
              />
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const onboardingStyles = StyleSheet.create({
  cameraIconWrap: {
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: "#5B6371",
    backgroundColor: "#2A2D33",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraIcon: {
    color: "#D1D5DB",
    fontSize: 28,
    lineHeight: 30,
  },
  openCameraButton: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: "#1E6CCC",
    alignItems: "center",
    justifyContent: "center",
  },
  openCameraButtonText: {
    color: "#EAF3FF",
    fontSize: 16,
    fontFamily: "GoogleSansFlexMedium",
  },
});
