"use client";

import { LayoutContext } from "@/app/providers";
import clsx from "clsx";
import { useContext, useEffect } from "react";

type DrawerProps = {
  children?: React.ReactNode;
};

export const Drawer: React.FC<DrawerProps> = ({ children }) => {
  const { showDrawer } = useContext(LayoutContext);
  //   const router = useRouter();
  //   const [isMounted, setIsMounted] = useState(false);
  //   useEffect(() => {
  //     setIsMounted(true);
  //   }, []);
  //   useEffect(() => {
  //     if (isMounted && showDrawer) {
  //       setShowDrawer(false);
  //     }
  //   }, [router.pathname, isMounted, showDrawer, setShowDrawer]);
  return (
    <div
      className={clsx(
        "flex-col bg-default-100 transition-all duration-300 ease-in-out overflow-hidden fixed right-0 h-screen z-10 overflow-y-scroll w-64 lg:w-80",
        !showDrawer && "-right-64 lg:-right-80",
      )}
    >
      {children}
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
