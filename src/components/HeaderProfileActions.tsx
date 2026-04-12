import { useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";

import { api } from "../../convex/_generated/api";
import { deriveDisplayName, getAvatarInitial } from "../lib/userDisplay";

export function HeaderProfileActions() {
  const onboardingState = useQuery(api.onboarding.getOnboardingState);
  const displayName = deriveDisplayName(onboardingState?.displayName, onboardingState?.universityEmail);
  const avatarInitial = getAvatarInitial(displayName);

  if (!onboardingState?.isAuthenticated) {
    return null;
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginRight: 4 }}>
      <Pressable onPress={() => router.push("/profile")}>
        {onboardingState.profilePhotoUrl ? (
          <Image
            source={{ uri: onboardingState.profilePhotoUrl }}
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#60A5FA",
            }}
          />
        ) : (
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "#60A5FA",
              backgroundColor: "#1F3654",
              alignItems: "center",
              justifyContent: "center",
            }}>
            <Text style={{ color: "#DBEAFE", fontWeight: "700", fontSize: 12 }}>
              {avatarInitial}
            </Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}
