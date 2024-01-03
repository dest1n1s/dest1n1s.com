"use client";

import { NextUIProvider } from "@nextui-org/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ThemeProviderProps } from "next-themes/dist/types";
import { useRouter } from "next/navigation";
import * as React from "react";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

export const LayoutContext = React.createContext<{
  showDrawer: boolean;
  hasDrawer: boolean;
  showNavbar: boolean;
  setShowDrawer: (showDrawer: boolean) => void;
  setHasDrawer: (hasDrawer: boolean) => void;
  setShowNavbar: (showNavbar: boolean) => void;
}>({
  showDrawer: false,
  hasDrawer: false,
  showNavbar: false,
  setShowDrawer: () => {},
  setHasDrawer: () => {},
  setShowNavbar: () => {},
});

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();
  const [showDrawer, setShowDrawer] = React.useState(false);
  const [showNavbar, setShowNavbar] = React.useState(true);
  const [hasDrawer, setHasDrawer] = React.useState(false);

  return (
    <NextUIProvider navigate={router.push}>
      <NextThemesProvider {...themeProps}>
        <LayoutContext.Provider
          value={{ showDrawer, setShowDrawer, showNavbar, setShowNavbar, hasDrawer, setHasDrawer }}
        >
          {children}
        </LayoutContext.Provider>
      </NextThemesProvider>
    </NextUIProvider>
  );
}
