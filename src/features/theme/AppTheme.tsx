import React, { createContext, useContext, useMemo } from "react";
import type { PropsWithChildren } from "react";

import { styles as darkStyles } from "../styles";

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

export function AppThemeProvider({ children }: PropsWithChildren) {
  const value = useMemo<AppThemeContextValue>(() => {
    return {
      styles: darkStyles,
      colors: {
        headerTint: "#F3F4F6",
        headerBackground: "#2E2E2E",
        contentBackground: "#2E2E2E",
        activityIndicator: "#1E6CCC",
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
