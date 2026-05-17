import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";

type ToastItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  navigateHome?: boolean;
};

type NotificationContextType = {
  unreadCount: number;
  showLocalToast: (title: string, message: string, type?: string) => void;
  clearAll: () => void;
};

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  showLocalToast: () => {},
  clearAll: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

const TYPE_CONFIG: Record<string, { label: string; badgeBg: string; badgeText: string }> = {
  rideAccepted: { label: "Accepted",    badgeBg: "#052E16", badgeText: "#86EFAC" },
  rideStarted:  { label: "Ride started", badgeBg: "#052E16", badgeText: "#86EFAC" },
  joinRequest:  { label: "New request", badgeBg: "#1F3654", badgeText: "#93C5FD" },
  rideRemoved:  { label: "Removed",     badgeBg: "#3F1D1D", badgeText: "#FCA5A5" },
  newRide:      { label: "New ride",    badgeBg: "#1F3654", badgeText: "#93C5FD" },
  info:         { label: "Info",        badgeBg: "#2A2D33", badgeText: "#9CA3AF" },
};

const EASE_OUT = Easing.out(Easing.poly(4));
const EASE_IN  = Easing.in(Easing.poly(3));

function NotificationToast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0,   duration: 280, easing: EASE_OUT, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 1,   duration: 200, easing: EASE_OUT, useNativeDriver: true }),
    ]).start();
  }, []);

  const animateDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -120, duration: 200, easing: EASE_IN, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,    duration: 160, easing: EASE_IN, useNativeDriver: true }),
    ]).start(() => onDismiss());
  };

  const meta = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.info;

  return (
    <Animated.View
      style={[
        toastStyles.container,
        { top: insets.top + 8, opacity, transform: [{ translateY }] },
      ]}
      pointerEvents="box-none">
      <Pressable onPress={animateDismiss} style={toastStyles.inner}>
        <View style={toastStyles.headerRow}>
          <View style={[toastStyles.badge, { backgroundColor: meta.badgeBg }]}>
            <Text style={[toastStyles.badgeText, { color: meta.badgeText }]}>{meta.label}</Text>
          </View>
          <Text style={toastStyles.title} numberOfLines={1}>{item.title}</Text>
        </View>
        <Text style={toastStyles.message} numberOfLines={2}>{item.message}</Text>
      </Pressable>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    borderRadius: 14,
    backgroundColor: "#32353B",
    borderWidth: 1,
    borderColor: "#4B5563",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 9999,
  },
  inner: {
    padding: 12,
    gap: 5,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "InterBold",
  },
  title: {
    fontSize: 14,
    fontFamily: "InterBold",
    color: "#F8FAFC",
    flex: 1,
  },
  message: {
    fontSize: 13,
    fontFamily: "InterMedium",
    color: "#C7CDD9",
    lineHeight: 18,
    paddingLeft: 2,
  },
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const onboardingState = useQuery(api.onboarding.getOnboardingState);
  const isAuth = onboardingState?.isAuthenticated === true;

  const notifications = useQuery(api.rides.getMyUnreadNotifications, isAuth ? {} : "skip");
  const markRead    = useMutation(api.rides.markNotificationRead);
  const markAllRead = useMutation(api.rides.markAllNotificationsRead);

  const [activeToast, setActiveToast] = useState<ToastItem | null>(null);
  const seenIds         = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);
  const dismissTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeItemRef   = useRef<ToastItem | null>(null);

  const showToast = (item: ToastItem) => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    activeItemRef.current = item;
    setActiveToast(item);
    dismissTimer.current = setTimeout(() => {
      const current = activeItemRef.current;
      setActiveToast(null);
      activeItemRef.current = null;
      if (current?.navigateHome) router.replace("/");
    }, 4500);
  };

  const handleDismiss = () => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
    const current = activeItemRef.current;
    setActiveToast(null);
    activeItemRef.current = null;
    if (current?.navigateHome) router.replace("/");
  };

  useEffect(() => {
    if (!notifications) return;

    if (!initialLoadDone.current) {
      notifications.forEach((n) => seenIds.current.add(n._id));
      initialLoadDone.current = true;
      return;
    }

    const newNotif = notifications.find((n) => !seenIds.current.has(n._id));
    if (!newNotif) return;

    seenIds.current.add(newNotif._id);
    void markRead({ notificationId: newNotif._id });
    showToast({
      id: newNotif._id,
      title: newNotif.title,
      message: newNotif.message,
      type: newNotif.type,
      navigateHome: newNotif.type === "rideRemoved",
    });
  }, [notifications]);

  const showLocalToast = (title: string, message: string, type = "info") => {
    showToast({ id: `local-${Date.now()}`, title, message, type });
  };

  const clearAll = () => {
    if (isAuth) void markAllRead();
  };

  const unreadCount = notifications?.length ?? 0;

  return (
    <NotificationContext.Provider value={{ unreadCount, showLocalToast, clearAll }}>
      <View style={{ flex: 1 }}>
        {children}
        {activeToast && (
          <NotificationToast
            key={activeToast.id}
            item={activeToast}
            onDismiss={handleDismiss}
          />
        )}
      </View>
    </NotificationContext.Provider>
  );
}
