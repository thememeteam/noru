import { useQuery } from "convex/react";
import { router } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { api } from "../../convex/_generated/api";
import { useNotifications } from "../features/notifications/NotificationProvider";
import { deriveDisplayName, getAvatarInitial } from "../lib/userDisplay";

export function HeaderProfileActions() {
  const onboardingState = useQuery(api.onboarding.getOnboardingState);
  const { unreadCount, clearAll } = useNotifications();
  const displayName = deriveDisplayName(onboardingState?.displayName, onboardingState?.universityEmail);
  const avatarInitial = getAvatarInitial(displayName);

  if (!onboardingState?.isAuthenticated) {
    return null;
  }

  const handlePress = () => {
    if (unreadCount > 0) clearAll();
    router.push("/profile");
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginRight: 4 }}>
      <Pressable onPress={handlePress} style={{ position: "relative" }}>
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
        {unreadCount > 0 && <View style={badgeStyles.dot} />}
      </Pressable>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  dot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#60A5FA",
    borderWidth: 1.5,
    borderColor: "#2E2E2E",
  },
});
