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
  showNavbar: boolean;
  setShowDrawer: (showDrawer: boolean) => void;
  setShowNavbar: (showNavbar: boolean) => void;
}>({
  showDrawer: false,
  showNavbar: false,
  setShowDrawer: () => {},
  setShowNavbar: () => {},
});

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();
  const [showDrawer, setShowDrawer] = React.useState(false);
  const [showNavbar, setShowNavbar] = React.useState(true);

  return (
    <NextUIProvider navigate={router.push}>
      <NextThemesProvider {...themeProps}>
        <LayoutContext.Provider value={{ showDrawer, showNavbar, setShowDrawer, setShowNavbar }}>
          {children}
        </LayoutContext.Provider>
      </NextThemesProvider>
    </NextUIProvider>
  );
}
