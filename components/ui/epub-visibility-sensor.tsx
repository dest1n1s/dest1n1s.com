"use client";

import { useInView } from "framer-motion";
import { Children, useEffect, useRef } from "react";

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
  const element = Children.only(children) as React.ReactElement;
  const ref = useRef(null);
  const isInView = useInView(ref);

  useEffect(() => {}, [bookName, index, isInView, resourceName]);

  return <element.type {...element.props} ref={ref} />;
};
