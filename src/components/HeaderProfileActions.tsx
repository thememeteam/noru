import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";

import { api } from "../../convex/_generated/api";

export function HeaderProfileActions() {
  const onboardingState = useQuery(api.onboarding.getOnboardingState);
  const { signOut } = useAuthActions();

  if (!onboardingState?.isAuthenticated) {
    return null;
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginRight: 4 }}>
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
          <Text style={{ color: "#9D174D", fontWeight: "700", fontSize: 12 }}>U</Text>
        </View>
      )}
      <Pressable onPress={() => void signOut()}>
        <Text style={{ color: "#9D174D", fontSize: 12, fontWeight: "600" }}>Sign out</Text>
      </Pressable>
    </View>
  );
}
