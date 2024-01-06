"use client";

import { useState } from "react";
import VisibilitySensor from "react-visibility-sensor";

export type EpubVisibilitySensorProps = {
  bookName: string;
  resourceName: string;
  index: number;
  children?: React.ReactNode;
};

export const EpubVisibilitySensor = ({
  bookName,
  resourceName,
  index,
  children,
}: EpubVisibilitySensorProps) => {
  const [visible, setVisible] = useState(false);

  return <VisibilitySensor onChange={(isVisible: boolean) => {}}>{children}</VisibilitySensor>;
};
