import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { useAppStyles } from "../theme/AppTheme";

export function RideChatScreen() {
  const styles = useAppStyles();
  const params = useLocalSearchParams<{ ridePostId?: string }>();
  const ridePostId = params.ridePostId;

  const onboarding = useQuery(api.onboarding.getOnboardingState);
  const sendChatMessage = useMutation(api.chat.sendMessage);
  const messages = useQuery(
    api.chat.getMessages,
    ridePostId ? { ridePostId: ridePostId as Id<"ridePosts"> } : "skip",
  );

  const { bottom: bottomInset } = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [messageText, setMessageText] = useState("");
  const listRef = useRef<FlatList<any>>(null);
  const isAtBottomRef = useRef(true);
  const SCROLL_THRESHOLD = 40;

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  useEffect(() => {
    if (!ridePostId || (onboarding && !onboarding.isCompleted)) {
      router.replace("/");
    }
  }, [onboarding, ridePostId]);

  useEffect(() => {
    if (messages === null) {
      router.back();
    }
  }, [messages]);

  const onSend = async () => {
    if (!ridePostId || !messageText.trim()) return;
    const text = messageText.trim();
    setMessageText("");
    try {
      await sendChatMessage({ ridePostId: ridePostId as Id<"ridePosts">, text });
    } catch (error) {
      Alert.alert("Could not send message", error instanceof Error ? error.message : "Please try again.");
      setMessageText(text);
    }
  };

  if (!ridePostId || onboarding === undefined || !onboarding?.isCompleted) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#1E6CCC" />
      </View>
    );
  }

  const inputBottomPadding = keyboardHeight > 0 ? 32 : (bottomInset || 10);

  return (
    <View style={[chatStyles.root, { paddingBottom: keyboardHeight }]}>
      <FlatList
        ref={listRef}
        data={messages ?? []}
        keyExtractor={(item) => item._id}
        style={chatStyles.list}
        contentContainerStyle={chatStyles.listContent}
        onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            isAtBottomRef.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - SCROLL_THRESHOLD;
          }}
          scrollEventThrottle={100}
          onContentSizeChange={() => {
            if (isAtBottomRef.current) {
              listRef.current?.scrollToEnd({ animated: true });
            }
          }}
        ListEmptyComponent={
          messages !== undefined ? (
            <Text style={[styles.description, chatStyles.emptyText]}>No messages yet. Say hi!</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[chatStyles.bubble, item.isOwnMessage && chatStyles.ownBubble]}>
            {!item.isOwnMessage && (
              <Text style={chatStyles.sender}>{item.senderName}</Text>
            )}
            <Text selectable style={[chatStyles.messageText, item.isOwnMessage && chatStyles.ownMessageText]}>
              {item.text}
            </Text>
          </View>
        )}
      />
      <View style={[chatStyles.inputWrap, { paddingBottom: inputBottomPadding }]}>
        <TextInput
          style={[styles.input, chatStyles.input]}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message..."
          placeholderTextColor="#6B7280"
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={() => void onSend()}
        />
        <Pressable
          style={({ pressed }) => [
            chatStyles.sendButton,
            !messageText.trim() && chatStyles.sendButtonDisabled,
            pressed && !!messageText.trim() && styles.buttonPressed,
          ]}
          onPress={() => void onSend()}
          disabled={!messageText.trim()}>
          <Text style={chatStyles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const chatStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#2E2E2E",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 6,
    flexGrow: 1,
  },
  emptyText: {
    textAlign: "center",
    paddingTop: 48,
  },
  bubble: {
    alignSelf: "flex-start",
    backgroundColor: "#3A3F47",
    borderRadius: 14,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: "80%",
    gap: 2,
  },
  ownBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#1E4D85",
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 4,
  },
  sender: {
    color: "#94A3B8",
    fontSize: 11,
    fontFamily: "InterBold",
  },
  messageText: {
    color: "#E5E7EB",
    fontSize: 15,
    lineHeight: 20,
    fontFamily: "InterMedium",
  },
  ownMessageText: {
    color: "#DBEAFE",
  },
  inputWrap: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#4B5563",
    backgroundColor: "#2A2D33",
    alignItems: "center",
  },
  input: {
    flex: 1,
    minHeight: 42,
    paddingVertical: 8,
    fontSize: 15,
  },
  sendButton: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#1E6CCC",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontFamily: "InterBold",
  },
});
