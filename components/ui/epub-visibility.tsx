"use client";

import { useInView } from "framer-motion";
import { Children, createContext, useContext, useEffect, useRef, useState } from "react";

type Element = {
  bookName: string;
  resourceName: string;
  index: number;
};

export const LayoutContext = createContext<{
  visibleElements: Element[];
  setVisibleElements: (visibleElements: Element[]) => void;
  scrollTargetElement: Element | null;
}>({
  visibleElements: [],
  setVisibleElements: () => {},
  scrollTargetElement: null,
});

export const EpubVisibilityController = ({
  bookName,
  children,
}: {
  bookName: string;
  children: React.ReactNode;
}) => {
  const [visibleElements, setVisibleElements] = useState<
    { bookName: string; resourceName: string; index: number }[]
  >([]);
  const [scrollTargetElement, setScrollTargetElement] = useState<{
    bookName: string;
    resourceName: string;
    index: number;
  } | null>(null);

  useEffect(() => {
    if (visibleElements.length > 0) {
      const sortedVisibleElements = visibleElements.sort((a, b) =>
        a.bookName === b.bookName && a.resourceName === b.resourceName
          ? a.index - b.index
          : b.index - a.index,
      );
      const targetElement = sortedVisibleElements[0];
      localStorage.setItem(
        `${bookName}-scroll-target`,
        JSON.stringify({
          bookName: targetElement.bookName,
          resourceName: targetElement.resourceName,
          index: targetElement.index,
        }),
      );
    }
  }, [bookName, visibleElements]);

  useEffect(() => {
    const scrollTargetElement = localStorage.getItem(`${bookName}-scroll-target`);
    if (scrollTargetElement) {
      setScrollTargetElement(JSON.parse(scrollTargetElement));
    }
  }, [bookName]);

  return (
    <LayoutContext.Provider value={{ visibleElements, setVisibleElements, scrollTargetElement }}>
      {children}
    </LayoutContext.Provider>
  );
};

export type EpubVisibilitySensorProps = Element & {
  children: React.ReactNode;
};

export const EpubVisibilitySensor = ({
  bookName,
  resourceName,
  index,
  children,
}: EpubVisibilitySensorProps) => {
  const { visibleElements, setVisibleElements, scrollTargetElement } = useContext(LayoutContext);
  const element = Children.only(children) as React.ReactElement;
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref);

  useEffect(() => {
    if (isInView) {
      if (
        visibleElements.some(
          element =>
            element.bookName === bookName &&
            element.resourceName === resourceName &&
            element.index === index,
        )
      ) {
        return;
      }
      setVisibleElements([...visibleElements, { bookName, resourceName, index }]);
    } else {
      if (
        !visibleElements.some(
          element =>
            element.bookName === bookName &&
            element.resourceName === resourceName &&
            element.index === index,
        )
      ) {
        return;
      }
      setVisibleElements(
        visibleElements.filter(
          element =>
            element.bookName !== bookName ||
            element.resourceName !== resourceName ||
            element.index !== index,
        ),
      );
    }
  }, [bookName, index, isInView, resourceName, setVisibleElements, visibleElements]);

  useEffect(() => {
    if (
      scrollTargetElement?.bookName === bookName &&
      scrollTargetElement?.resourceName === resourceName &&
      scrollTargetElement?.index === index
    ) {
      const targetElement = document.getElementById(`${bookName}-${resourceName}-${index}`);
      if (targetElement) {
        targetElement.scrollIntoView();
      }
    }
  }, [bookName, index, resourceName, scrollTargetElement]);

  const lastRead = scrollTargetElement?.bookName === bookName &&
    scrollTargetElement?.resourceName === resourceName &&
    scrollTargetElement?.index === index && (
      <div className="flex items-center justify-center gap-4 not-prose">
        <div className="border-b border-yellow-300 dark:border-yellow-600 border-dashed grow" />
        <div className="text-yellow-500">上次阅读到此处</div>
        <div className="border-b border-yellow-300 dark:border-yellow-600 border-dashed grow" />
      </div>
    );

  return (
    <>
      <element.type {...element.props} ref={ref} id={`${bookName}-${resourceName}-${index}`} />
    </>
  );
};
