"use client";

import { useState } from "react";
import VisibilitySensor from "react-visibility-sensor";

export type EpubVisibilitySensorProps = {
  bookName: string;
  savePath: string;
  index: number;
  children?: React.ReactNode;
};

export const EpubVisibilitySensor = ({
  bookName,
  savePath,
  index,
  children,
}: EpubVisibilitySensorProps) => {
  const [visible, setVisible] = useState(false);

  return <VisibilitySensor onChange={(isVisible: boolean) => {}}>{children}</VisibilitySensor>;
};
