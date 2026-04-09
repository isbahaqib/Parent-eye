"use client";

import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  type PaletteMode,
} from "@mui/material";
import { createContext, useContext } from "react";
import { AuthProvider } from "@/context/AuthContext";

type ColorModeContextValue = {
  mode: PaletteMode;
  toggleMode: () => void;
};

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

export function useColorMode() {
  const ctx = useContext(ColorModeContext);
  if (!ctx) throw new Error("useColorMode must be used within Providers");
  return ctx;
}

function makeTheme(mode: PaletteMode) {
  const isDark = mode === "dark";
  return createTheme({
    palette: {
      mode,
      primary: { main: "#7c5cff" },
      secondary: { main: "#5b8cff" },
      text: {
        primary: isDark ? "#e2e8f0" : "#0f172a",
        secondary: isDark ? "#94a3b8" : "#475569",
      },
      background: {
        default: isDark ? "#0b1220" : "#f8fafc",
        paper: isDark ? "#111827" : "#ffffff",
      },
      divider: isDark ? "rgba(148, 163, 184, 0.18)" : "rgba(15, 23, 42, 0.08)",
    },
    typography: {
      fontFamily: '"DM Sans", "Roboto", "Helvetica", "Arial", sans-serif',
      h5: { fontWeight: 800, letterSpacing: "-0.01em" },
      h6: { fontWeight: 700, letterSpacing: "-0.01em" },
      subtitle2: { fontWeight: 700 },
    },
    shape: { borderRadius: 14 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            background: isDark
              ? "radial-gradient(1200px 400px at 20% -10%, rgba(124, 92, 255, 0.20), transparent), #0b1220"
              : "radial-gradient(1200px 400px at 20% -10%, rgba(124, 92, 255, 0.12), transparent), #f8fafc",
            scrollbarColor: isDark ? "#475569 #0f172a" : "#94a3b8 #e2e8f0",
          },
          "*::-webkit-scrollbar": {
            width: "10px",
            height: "10px",
          },
          "*::-webkit-scrollbar-track": {
            backgroundColor: isDark ? "#0f172a" : "#e2e8f0",
          },
          "*::-webkit-scrollbar-thumb": {
            backgroundColor: isDark ? "#475569" : "#94a3b8",
            borderRadius: "8px",
            border: isDark ? "2px solid #0f172a" : "2px solid #e2e8f0",
          },
          "*::-webkit-scrollbar-thumb:hover": {
            backgroundColor: isDark ? "#64748b" : "#64748b",
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: isDark
              ? "1px solid rgba(148, 163, 184, 0.18)"
              : "1px solid rgba(15, 23, 42, 0.08)",
            backgroundImage: "none",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: "none", fontWeight: 700, borderRadius: 10 },
          containedPrimary: {
            boxShadow: "0 6px 14px rgba(124, 92, 255, 0.28)",
          },
        },
      },
      MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 600 } } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 10, backgroundColor: isDark ? "#0f172a" : "#ffffff" },
        },
      },
      MuiAlert: { styleOverrides: { root: { borderRadius: 10 } } },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const mode: PaletteMode = "dark";
  const toggleMode = () => {};
  const theme = makeTheme(mode);

  return (
    <ColorModeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
