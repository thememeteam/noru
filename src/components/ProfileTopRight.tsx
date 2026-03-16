import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import React from "react";
import { Image, Pressable, Text, View } from "react-native";

import { api } from "../../convex/_generated/api";
import { styles } from "../features/styles";

export function ProfileTopRight() {
  const onboardingState = useQuery(api.onboarding.getOnboardingState);
  const { signOut } = useAuthActions();

  const profilePhotoUrl = onboardingState?.profilePhotoUrl ?? null;

  return (
    <View style={styles.profileTopRight}>
      {profilePhotoUrl ? (
        <Image source={{ uri: profilePhotoUrl }} style={styles.profileAvatar} />
      ) : (
        <View style={styles.profileAvatarFallback}>
          <Text style={styles.profileAvatarFallbackText}>U</Text>
        </View>
      )}
      <Pressable onPress={() => void signOut()}>
        <Text style={styles.profileSignOut}>Sign out</Text>
      </Pressable>
    </View>
  );
}
