import React, { createContext, useContext, useMemo } from "react";
import type { PropsWithChildren } from "react";

import { lightStyleOverrides, styles as darkStyles } from "../styles";

type AppThemeContextValue = {
  styles: typeof darkStyles;
  colors: {
    headerTint: string;
    headerBackground: string;
    contentBackground: string;
    activityIndicator: string;
  };
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function buildLightStyles() {
  const merged: Record<string, unknown> = { ...darkStyles };
  for (const [key, value] of Object.entries(lightStyleOverrides)) {
    const darkValue = merged[key];
    merged[key] = [darkValue, value];
  }

  return merged as typeof darkStyles;
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const value = useMemo<AppThemeContextValue>(() => {
    return {
      styles: buildLightStyles(),
      colors: {
        headerTint: "#111827",
        headerBackground: "#FFFFFF",
        contentBackground: "#F4F6FB",
        activityIndicator: "#b50246",
      },
    };
  }, []);

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within AppThemeProvider.");
  }
  return context;
}

export function useAppStyles() {
  return useAppTheme().styles;
}
