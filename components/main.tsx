"use client";

import { LayoutContext } from "@/app/providers";
import clsx from "clsx";
import React, { useContext } from "react";

export const Main = ({ children }: { children: React.ReactNode }) => {
  const { showDrawer, showNavbar } = useContext(LayoutContext);
  return (
    <div
      className={clsx(
        "relative grow flex-col min-w-0 transition-all duration-300 ease-in-out",
        showDrawer && "mr-64 lg:mr-80",
        showNavbar && "mt-[--navbar-height]",
      )}
    >
      {children}
    </div>
  );
};
