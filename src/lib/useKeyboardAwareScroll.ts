import { useCallback, useEffect, useRef } from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  TextInput,
  UIManager,
  findNodeHandle,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

type KeyboardAwareScroll = {
  scrollViewRef: React.RefObject<ScrollView>;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onLayout: (event: LayoutChangeEvent) => void;
  onInputFocus: (inputRef: React.RefObject<TextInput>) => void;
};

export function useKeyboardAwareScroll(): KeyboardAwareScroll {
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const scrollViewHeightRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const focusedInputRef = useRef<React.RefObject<TextInput> | null>(null);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    scrollViewHeightRef.current = event.nativeEvent.layout.height;
  }, []);

  const scrollToFocusedInput = useCallback(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const currentInputRef = focusedInputRef.current;
    const scrollView = scrollViewRef.current;
    if (!currentInputRef?.current || !scrollView) {
      return;
    }

    const scrollViewHandle = findNodeHandle(scrollView);
    const inputHandle = findNodeHandle(currentInputRef.current);
    if (!scrollViewHandle || !inputHandle) {
      return;
    }

    UIManager.measureLayout(
      inputHandle,
      scrollViewHandle,
      () => {
        // Ignore failures from stale layout nodes.
      },
      (_x, y, _width, height) => {
        const scrollY = scrollYRef.current;
        const scrollViewHeight = scrollViewHeightRef.current;
        const keyboardHeight = keyboardHeightRef.current;
        if (scrollViewHeight === 0) {
          return;
        }

        const visibleBottom = scrollY + scrollViewHeight - keyboardHeight;
        const inputBottom = y + height;

        if (inputBottom > visibleBottom) {
          const targetScrollY = inputBottom - (scrollViewHeight - keyboardHeight);
          scrollView.scrollTo({ y: targetScrollY, animated: true });
        } else if (y < scrollY) {
          scrollView.scrollTo({ y, animated: true });
        }
      },
    );
  }, []);

  const onInputFocus = useCallback((inputRef: React.RefObject<TextInput>) => {
    focusedInputRef.current = inputRef;
    scrollToFocusedInput();
  }, [scrollToFocusedInput]);

  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
      keyboardHeightRef.current = event.endCoordinates?.height ?? 0;
      scrollToFocusedInput();
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      keyboardHeightRef.current = 0;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollToFocusedInput]);

  return { scrollViewRef, onScroll, onLayout, onInputFocus };
}
