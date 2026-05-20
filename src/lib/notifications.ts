import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { router } from "expo-router";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupAndroidChannels() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("default", {
    name: "General",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });

  await Notifications.setNotificationChannelAsync("rides", {
    name: "Ride updates",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#4A90D9",
  });

  await Notifications.setNotificationChannelAsync("chat", {
    name: "Group chat",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 100],
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === "android") {
    await setupAndroidChannels();
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  try {
    const projectId =
      Constants.easConfig?.projectId ??
      (Constants.expoConfig?.extra as Record<string, any>)?.eas?.projectId;

    if (!projectId) {
      console.warn("[notifications] No EAS projectId found — run `eas init` to configure it");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenData.data;
  } catch (e) {
    console.warn("[notifications] Failed to get push token:", e);
    return null;
  }
}

export function handleNotificationNavigation(data: Record<string, string>) {
  const { screen, ridePostId } = data;

  if (screen === "chat" && ridePostId) {
    router.push({ pathname: "/chat", params: { ridePostId } });
  } else if (screen === "waiting" && ridePostId) {
    router.push({ pathname: "/waiting", params: { ridePostId } });
  } else if (screen === "home") {
    router.push("/");
  }
}

export function subscribeToNotificationResponses() {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = (response.notification.request.content.data ?? {}) as Record<string, string>;
    handleNotificationNavigation(data);
  });
  return subscription;
}
