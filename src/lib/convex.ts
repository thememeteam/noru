import type { TokenStorage } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import * as SecureStore from "expo-secure-store";

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("Missing EXPO_PUBLIC_CONVEX_URL environment variable.");
}

export const convex = new ConvexReactClient(convexUrl);

export const convexAuthTokenStorage: TokenStorage = {
  async getItem(key) {
    return await SecureStore.getItemAsync(key);
  },
  async setItem(key, value) {
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key) {
    await SecureStore.deleteItemAsync(key);
  },
};
