import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { router } from "expo-router";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupAndroidChannels() {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("rides", {
    name: "Ride updates",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#4A90D9",
    sound: "default",
  });

  await Notifications.setNotificationChannelAsync("chat", {
    name: "Group chat",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 100],
    sound: "default",
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
      (Constants.expoConfig?.extra as any)?.eas?.projectId;

    const tokenData = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    return tokenData.data;
  } catch {
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
