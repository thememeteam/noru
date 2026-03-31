import { useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";

import { api } from "../../convex/_generated/api";

export function HeaderProfileActions() {
  const onboardingState = useQuery(api.onboarding.getOnboardingState);
  const displayName =
    onboardingState?.displayName?.trim() || onboardingState?.universityEmail?.trim() || "User";
  const avatarInitial = displayName.charAt(0).toUpperCase() || "U";

  if (!onboardingState?.isAuthenticated) {
    return null;
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginRight: 4 }}>
      <Pressable onPress={() => router.push("/profile")}>
        {onboardingState.profilePhotoUrl ? (
          <Image
            source={{ uri: onboardingState.profilePhotoUrl }}
            style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: "#F9A8D4" }}
          />
        ) : (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#F9A8D4",
              backgroundColor: "#FCE7F3",
              alignItems: "center",
              justifyContent: "center",
            }}>
            <Text style={{ color: "#9D174D", fontWeight: "700", fontSize: 12 }}>{avatarInitial}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
