import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Keyboard,
  PanResponder,
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
import { deriveDisplayName } from "../../lib/userDisplay";
import { useAppStyles } from "../theme/AppTheme";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;
const SWIPE_TRIGGER = 60;
const SWIPE_CLAMP = 80;
const EASE_OUT_QUAD = Easing.out(Easing.quad);
const EASE_IN_QUAD = Easing.in(Easing.quad);
const EASE_OUT_QUART = Easing.out(Easing.poly(4));

type ChatMessage = {
  _id: Id<"rideMessages">;
  userId: Id<"users">;
  senderName: string;
  text: string;
  isOwnMessage: boolean;
  replyToId?: Id<"rideMessages">;
  replyToText?: string;
  replyToSenderName?: string;
  reactions: Array<{ emoji: string; count: number; didReact: boolean }>;
  createdAt: number;
};

type ReplyTarget = {
  id: Id<"rideMessages">;
  senderName: string;
  text: string;
};

// ─── Typing dots ────────────────────────────────────────────────────────────

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) {
        dot1.setValue(1);
        dot2.setValue(1);
        dot3.setValue(1);
        return;
      }
      const pulse = (dot: Animated.Value) =>
        Animated.sequence([
          Animated.timing(dot, { toValue: 1, duration: 280, easing: EASE_OUT_QUAD, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 280, easing: EASE_IN_QUAD, useNativeDriver: true }),
        ]);
      const anim = Animated.loop(Animated.stagger(280, [pulse(dot1), pulse(dot2), pulse(dot3)]));
      animRef.current = anim;
      anim.start();
    });
    return () => { animRef.current?.stop(); };
  }, [dot1, dot2, dot3]);

  return (
    <View style={chatStyles.dotRow}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View key={i} style={[chatStyles.dot, { opacity: dot }]} />
      ))}
    </View>
  );
}

function TypingIndicator({ names }: { names: string[] }) {
  if (names.length === 0) return null;
  const label =
    names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing`
        : `${names[0]} and ${names.length - 1} others are typing`;

  return (
    <View style={chatStyles.typingRow}>
      <TypingDots />
      <Text style={chatStyles.typingText}>{label}</Text>
    </View>
  );
}

// ─── Reply strip (animates on mount) ─────────────────────────────────────────

function ReplyStripAnimated({ replyingTo, onDismiss }: { replyingTo: ReplyTarget; onDismiss: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) {
        opacity.setValue(1);
        slideY.setValue(0);
        return;
      }
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, easing: EASE_OUT_QUART, useNativeDriver: true }),
        Animated.timing(slideY, { toValue: 0, duration: 200, easing: EASE_OUT_QUART, useNativeDriver: true }),
      ]).start();
    });
  }, [opacity, slideY]);

  return (
    <Animated.View style={[chatStyles.replyStrip, { opacity, transform: [{ translateY: slideY }] }]}>
      <View style={chatStyles.replyStripContent}>
        <Text style={chatStyles.replyStripSender}>Replying to {replyingTo.senderName}</Text>
        <Text style={chatStyles.replyStripText} numberOfLines={1}>{replyingTo.text}</Text>
      </View>
      <Pressable onPress={onDismiss} style={chatStyles.replyStripClose} hitSlop={8}>
        <Text style={chatStyles.replyStripCloseText}>✕</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Emoji button with scale tap feedback ────────────────────────────────────

function EmojiButton({
  emoji,
  isActive,
  onPress,
}: {
  emoji: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.78, duration: 70, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 320, friction: 10, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <Pressable
      style={[chatStyles.emojiBtn, isActive && chatStyles.emojiBtnActive]}
      onPress={handlePress}>
      <Animated.Text style={[chatStyles.emojiBtnText, { transform: [{ scale }] }]}>
        {emoji}
      </Animated.Text>
    </Pressable>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

type MessageBubbleProps = {
  item: ChatMessage;
  isNew: boolean;
  isEmojiTrayOpen: boolean;
  onSwipeReply: (item: ChatMessage) => void;
  onOpenTray: (id: Id<"rideMessages">) => void;
  onDismissTray: () => void;
  onReactionPress: (messageId: Id<"rideMessages">, emoji: string) => void;
};

const MessageBubble = React.memo(function MessageBubble({
  item,
  isNew,
  isEmojiTrayOpen,
  onSwipeReply,
  onOpenTray,
  onDismissTray,
  onReactionPress,
}: MessageBubbleProps) {
  const isNewRef = useRef(isNew);

  // Entrance animation (fires once on mount)
  const entranceOpacity = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const entranceSlide = useRef(new Animated.Value(isNew ? 10 : 0)).current;

  useEffect(() => {
    if (!isNewRef.current) return;
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) {
        entranceOpacity.setValue(1);
        entranceSlide.setValue(0);
        return;
      }
      Animated.parallel([
        Animated.timing(entranceOpacity, { toValue: 1, duration: 220, easing: EASE_OUT_QUART, useNativeDriver: true }),
        Animated.timing(entranceSlide, { toValue: 0, duration: 220, easing: EASE_OUT_QUART, useNativeDriver: true }),
      ]).start();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Emoji tray reveal animation
  const emojiTrayOpacity = useRef(new Animated.Value(0)).current;
  const emojiTrayScale = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    if (isEmojiTrayOpen) {
      emojiTrayOpacity.setValue(0);
      emojiTrayScale.setValue(0.88);
      AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
        if (reduced) {
          emojiTrayOpacity.setValue(1);
          emojiTrayScale.setValue(1);
          return;
        }
        Animated.parallel([
          Animated.timing(emojiTrayOpacity, { toValue: 1, duration: 150, easing: EASE_OUT_QUART, useNativeDriver: true }),
          Animated.timing(emojiTrayScale, { toValue: 1, duration: 150, easing: EASE_OUT_QUART, useNativeDriver: true }),
        ]).start();
      });
    }
  }, [isEmojiTrayOpen, emojiTrayOpacity, emojiTrayScale]);

  // Reactions row pop-in (fires when first reaction is added)
  const reactionsLength = item.reactions.length;
  const prevReactionsLength = useRef(reactionsLength);
  const reactionsOpacity = useRef(new Animated.Value(reactionsLength > 0 ? 1 : 0)).current;
  const reactionsScale = useRef(new Animated.Value(reactionsLength > 0 ? 1 : 0.72)).current;

  useEffect(() => {
    const prev = prevReactionsLength.current;
    prevReactionsLength.current = reactionsLength;
    if (prev === 0 && reactionsLength > 0) {
      AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
        if (reduced) {
          reactionsOpacity.setValue(1);
          reactionsScale.setValue(1);
          return;
        }
        Animated.parallel([
          Animated.timing(reactionsOpacity, { toValue: 1, duration: 150, easing: EASE_OUT_QUART, useNativeDriver: true }),
          Animated.spring(reactionsScale, { toValue: 1, tension: 280, friction: 12, useNativeDriver: true }),
        ]).start();
      });
    } else if (reactionsLength === 0) {
      reactionsOpacity.setValue(0);
      reactionsScale.setValue(0.72);
    }
  }, [reactionsLength, reactionsOpacity, reactionsScale]);

  // Swipe-to-reply pan responder
  const translateX = useRef(new Animated.Value(0)).current;
  const hasTriggered = useRef(false);
  const lastTapRef = useRef(0);
  const pulseScale = useRef(new Animated.Value(1)).current;

  const handleBubbleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      onReactionPress(item._id, "❤️");
      Animated.sequence([
        Animated.spring(pulseScale, { toValue: 1.07, tension: 380, friction: 8, useNativeDriver: true }),
        Animated.spring(pulseScale, { toValue: 1, tension: 280, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      lastTapRef.current = now;
      if (isEmojiTrayOpen) onDismissTray();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 10 && gs.dx > 0 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderGrant: () => {
        hasTriggered.current = false;
        onDismissTray();
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dx > 0) {
          translateX.setValue(Math.min(gs.dx, SWIPE_CLAMP));
          if (!hasTriggered.current && gs.dx >= SWIPE_TRIGGER) {
            hasTriggered.current = true;
            onSwipeReply(item);
          }
        }
      },
      onPanResponderRelease: () => {
        Animated.spring(translateX, {
          toValue: 0,
          tension: 200,
          friction: 20,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        translateX.setValue(0);
      },
      onPanResponderTerminationRequest: () => true,
    }),
  ).current;

  const isOwn = item.isOwnMessage;

  return (
    <View style={[chatStyles.messageRow, isOwn && chatStyles.messageRowOwn]}>

      {/* Emoji tray (animated reveal on long-press) */}
      {isEmojiTrayOpen && (
        <Animated.View
          style={[
            chatStyles.emojiTray,
            { opacity: emojiTrayOpacity, transform: [{ scale: emojiTrayScale }] },
          ]}>
          {REACTION_EMOJIS.map((emoji) => {
            const existing = item.reactions.find((r) => r.emoji === emoji);
            return (
              <EmojiButton
                key={emoji}
                emoji={emoji}
                isActive={!!existing?.didReact}
                onPress={() => onReactionPress(item._id, emoji)}
              />
            );
          })}
        </Animated.View>
      )}

      {/* Bubble: entrance + swipe transforms combined */}
      <Pressable
        onLongPress={() => onOpenTray(item._id)}
        onPress={handleBubbleTap}
        delayLongPress={350}>
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            chatStyles.bubble,
            isOwn && chatStyles.ownBubble,
            {
              opacity: entranceOpacity,
              transform: [{ translateX }, { translateY: entranceSlide }, { scale: pulseScale }],
            },
          ]}>

          {item.replyToText ? (
            <View style={chatStyles.replyQuote}>
              <Text style={chatStyles.replyQuoteSender} numberOfLines={1}>
                {item.replyToSenderName}
              </Text>
              <Text style={chatStyles.replyQuoteText} numberOfLines={2}>
                {item.replyToText}
              </Text>
            </View>
          ) : null}

          {!isOwn && (
            <Text style={chatStyles.sender}>{item.senderName}</Text>
          )}

          <Text selectable={isOwn} style={[chatStyles.messageText, isOwn && chatStyles.ownMessageText]}>
            {item.text}
          </Text>
        </Animated.View>
      </Pressable>

      {/* Reactions row: pop-in on first reaction */}
      {reactionsLength > 0 && (
        <Animated.View
          style={[
            chatStyles.reactionsRow,
            { opacity: reactionsOpacity, transform: [{ scale: reactionsScale }] },
          ]}>
          {item.reactions.map((r) => (
            <Pressable
              key={r.emoji}
              style={[chatStyles.reactionPill, r.didReact && chatStyles.reactionPillActive]}
              onPress={() => onReactionPress(item._id, r.emoji)}>
              <Text style={[chatStyles.reactionPillText, r.didReact && chatStyles.reactionPillTextActive]}>
                {r.emoji} {r.count}
              </Text>
            </Pressable>
          ))}
        </Animated.View>
      )}
    </View>
  );
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export function RideChatScreen() {
  const styles = useAppStyles();
  const params = useLocalSearchParams<{ ridePostId?: string }>();
  const ridePostId = params.ridePostId;

  const onboarding = useQuery(api.onboarding.getOnboardingState);
  const sendChatMessage = useMutation(api.chat.sendMessage);
  const toggleReactionMutation = useMutation(api.chat.toggleReaction);
  const setTypingIndicatorMutation = useMutation(api.chat.setTypingIndicator);
  const clearTypingIndicatorMutation = useMutation(api.chat.clearTypingIndicator);

  const messages = useQuery(
    api.chat.getMessages,
    ridePostId ? { ridePostId: ridePostId as Id<"ridePosts"> } : "skip",
  );
  const typingNames = useQuery(
    api.chat.getTypingIndicators,
    ridePostId ? { ridePostId: ridePostId as Id<"ridePosts"> } : "skip",
  );

  const { bottom: bottomInset } = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [messageText, setMessageText] = useState("");
  const [replyingTo, setReplyingTo] = useState<ReplyTarget | null>(null);
  const [activeTrayId, setActiveTrayId] = useState<string | null>(null);

  const listRef = useRef<FlatList<any>>(null);
  const isAtBottomRef = useRef(true);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingCallRef = useRef(0);
  // Tracks IDs present at initial load so only truly new messages animate entrance
  const initialMessageIds = useRef<Set<string> | null>(null);
  const SCROLL_THRESHOLD = 40;

  const displayName = deriveDisplayName(onboarding?.displayName, onboarding?.universityEmail);
  const myName = displayName.split(" ")[0] || "Student";

  // Capture initial message set on first successful load
  useEffect(() => {
    if (messages && initialMessageIds.current === null) {
      initialMessageIds.current = new Set(messages.map((m) => m._id));
    }
  }, [messages]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const onHide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { onShow.remove(); onHide.remove(); };
  }, []);

  useEffect(() => {
    if (!ridePostId || (onboarding && !onboarding.isCompleted)) {
      router.replace("/");
    }
  }, [onboarding, ridePostId]);

  useEffect(() => {
    if (messages === null) router.back();
  }, [messages]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, []);

  const handleTextChange = (text: string) => {
    setMessageText(text);
    if (!ridePostId) return;

    if (text.trim()) {
      const now = Date.now();
      if (now - lastTypingCallRef.current > 2000) {
        lastTypingCallRef.current = now;
        void setTypingIndicatorMutation({
          ridePostId: ridePostId as Id<"ridePosts">,
          userName: myName,
        });
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        void clearTypingIndicatorMutation({ ridePostId: ridePostId as Id<"ridePosts"> });
      }, 3000);
    } else {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      void clearTypingIndicatorMutation({ ridePostId: ridePostId as Id<"ridePosts"> });
    }
  };

  const onSend = async () => {
    if (!ridePostId || !messageText.trim()) return;
    const text = messageText.trim();
    const reply = replyingTo;
    setMessageText("");
    setReplyingTo(null);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    void clearTypingIndicatorMutation({ ridePostId: ridePostId as Id<"ridePosts"> });

    try {
      await sendChatMessage({
        ridePostId: ridePostId as Id<"ridePosts">,
        text,
        replyToId: reply?.id,
      });
    } catch (error) {
      Alert.alert("Could not send message", error instanceof Error ? error.message : "Please try again.");
      setMessageText(text);
      setReplyingTo(reply);
    }
  };

  const handleToggleReaction = useCallback((messageId: Id<"rideMessages">, emoji: string) => {
    if (!ridePostId) return;
    setActiveTrayId(null);
    void toggleReactionMutation({
      ridePostId: ridePostId as Id<"ridePosts">,
      messageId,
      emoji,
    });
  }, [ridePostId, toggleReactionMutation]);

  const handleSwipeReply = useCallback((item: ChatMessage) => {
    setReplyingTo({ id: item._id, senderName: item.senderName, text: item.text });
  }, []);

  const handleOpenTray = useCallback((id: Id<"rideMessages">) => {
    setActiveTrayId((prev) => (prev === id ? null : id));
  }, []);

  const handleDismissTray = useCallback(() => {
    setActiveTrayId(null);
  }, []);

  if (!ridePostId || onboarding === undefined || !onboarding?.isCompleted) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#1E6CCC" />
      </View>
    );
  }

  const inputBottomPadding = keyboardHeight > 0 ? 32 : (bottomInset || 10);
  const activeTypingNames = typingNames ?? [];

  return (
    <View style={[chatStyles.root, { paddingBottom: keyboardHeight }]}>
      <FlatList
        ref={listRef}
        data={(messages ?? []) as ChatMessage[]}
        keyExtractor={(item) => item._id}
        style={chatStyles.list}
        contentContainerStyle={chatStyles.listContent}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => setActiveTrayId(null)}
        onScroll={(e) => {
          const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
          isAtBottomRef.current =
            contentOffset.y + layoutMeasurement.height >= contentSize.height - SCROLL_THRESHOLD;
        }}
        scrollEventThrottle={100}
        onContentSizeChange={() => {
          if (isAtBottomRef.current) listRef.current?.scrollToEnd({ animated: true });
        }}
        ListEmptyComponent={
          messages !== undefined ? (
            <Text style={[styles.description, chatStyles.emptyText]}>No messages yet. Say hi!</Text>
          ) : null
        }
        ListFooterComponent={<TypingIndicator names={activeTypingNames} />}
        renderItem={useCallback(({ item }: { item: ChatMessage }) => (
          <MessageBubble
            item={item}
            isNew={initialMessageIds.current !== null && !initialMessageIds.current.has(item._id)}
            isEmojiTrayOpen={activeTrayId === item._id}
            onSwipeReply={handleSwipeReply}
            onOpenTray={handleOpenTray}
            onDismissTray={handleDismissTray}
            onReactionPress={handleToggleReaction}
          />
        ), [activeTrayId, handleSwipeReply, handleOpenTray, handleDismissTray, handleToggleReaction])}
      />

      {replyingTo && (
        <ReplyStripAnimated
          replyingTo={replyingTo}
          onDismiss={() => setReplyingTo(null)}
        />
      )}

      <View style={[chatStyles.inputWrap, { paddingBottom: inputBottomPadding }]}>
        <TextInput
          style={[styles.input, chatStyles.input]}
          value={messageText}
          onChangeText={handleTextChange}
          placeholder="Type a message..."
          placeholderTextColor="#6B7280"
          maxLength={500}
          multiline
          blurOnSubmit={false}
          textAlignVertical="top"
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

  // Message rows
  messageRow: {
    alignItems: "flex-start",
    gap: 4,
  },
  messageRowOwn: {
    alignItems: "flex-end",
  },

  // Bubbles
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

  // Reply quote inside bubble
  replyQuote: {
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 8,
    borderTopLeftRadius: 2,
    padding: 7,
    marginBottom: 4,
    gap: 2,
  },
  replyQuoteSender: {
    color: "#60A5FA",
    fontSize: 11,
    fontFamily: "InterBold",
  },
  replyQuoteText: {
    color: "#C7CDD9",
    fontSize: 12,
    fontFamily: "InterMedium",
  },

  // Emoji tray (animated reveal)
  emojiTray: {
    flexDirection: "row",
    backgroundColor: "#32353B",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#5B6371",
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 8,
  },
  emojiBtn: {
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emojiBtnActive: {
    backgroundColor: "#1F3654",
  },
  emojiBtnText: {
    fontSize: 22,
  },

  // Reactions row (pop-in animated)
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 2,
  },
  reactionPill: {
    backgroundColor: "#2A2D33",
    borderWidth: 1,
    borderColor: "#5B6371",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reactionPillActive: {
    backgroundColor: "#1F3654",
    borderColor: "#60A5FA",
  },
  reactionPillText: {
    color: "#C7CDD9",
    fontSize: 12,
    fontFamily: "InterBold",
  },
  reactionPillTextActive: {
    color: "#DBEAFE",
  },

  // Typing indicator
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 8,
  },
  typingText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontFamily: "InterMedium",
  },
  dotRow: {
    flexDirection: "row",
    gap: 3,
    alignItems: "center",
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#9CA3AF",
  },

  // Reply strip (animated entrance)
  replyStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: "#2A2D33",
    borderTopWidth: 1,
    borderTopColor: "#4B5563",
    gap: 10,
  },
  replyStripContent: {
    flex: 1,
    gap: 2,
  },
  replyStripSender: {
    color: "#60A5FA",
    fontSize: 13,
    fontFamily: "InterBold",
  },
  replyStripText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontFamily: "InterMedium",
  },
  replyStripClose: {
    padding: 4,
  },
  replyStripCloseText: {
    color: "#9CA3AF",
    fontSize: 18,
    fontFamily: "InterBold",
  },

  // Input bar
  inputWrap: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#4B5563",
    backgroundColor: "#2A2D33",
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 116,
    paddingVertical: 10,
    fontSize: 15,
    textAlignVertical: "top",
  },
  sendButton: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#1E6CCC",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
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
