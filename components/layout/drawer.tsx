"use client";

import { LayoutContext } from "@/app/providers";
import clsx from "clsx";
import { useContext, useEffect } from "react";

type DrawerProps = {
  children?: React.ReactNode;
};

export const Drawer: React.FC<DrawerProps> = ({ children }) => {
  const { showDrawer } = useContext(LayoutContext);
  return (
    <div
      className={clsx(
        "bg-default-100 transition-all duration-300 ease-in-out overflow-hidden fixed right-0 h-screen z-10 overflow-y-scroll",
        showDrawer && "w-64 lg:w-80",
        !showDrawer && "w-0",
      )}
    >
      <div className="flex flex-col items-center h-full w-64 lg:w-80">{children}</div>
    </div>
  );
};

export const DrawerMarker = () => {
  const { setHasDrawer } = useContext(LayoutContext);
  useEffect(() => {
    setHasDrawer(true);
    return () => {
      setHasDrawer(false);
    };
  });
  return <></>;
};
