"use client";

import { SwitchProps, useSwitch } from "@nextui-org/react";
import { VisuallyHidden } from "@react-aria/visually-hidden";
import clsx from "clsx";
import { FC } from "react";

export interface IconSwitchProps {
  className?: string;
  classNames?: SwitchProps["classNames"];
  active: boolean;
  onActiveChange: (active: boolean) => void;
  isDisabled?: boolean;
  ariaLabel?: string;
  activeIcon: React.ReactNode;
  inactiveIcon: React.ReactNode;
}

export const IconSwitch: FC<IconSwitchProps> = ({
  className,
  classNames,
  active,
  onActiveChange,
  isDisabled,
  ariaLabel,
  activeIcon,
  inactiveIcon,
}) => {
  const onChange = () => {
    active ? onActiveChange(false) : onActiveChange(true);
  };

  const { Component, slots, isSelected, getBaseProps, getInputProps, getWrapperProps } = useSwitch({
    isSelected: active,
    isDisabled,
    "aria-label": ariaLabel,
    onChange,
  });

  return (
    <Component
      {...getBaseProps({
        className: clsx(
          "px-px transition-opacity hover:opacity-80 cursor-pointer",
          className,
          classNames?.base,
        ),
      })}
    >
      <VisuallyHidden>
        <input {...getInputProps()} />
      </VisuallyHidden>
      <div
        {...getWrapperProps()}
        className={slots.wrapper({
          class: clsx(
            [
              "h-auto w-auto",
              "bg-transparent",
              "rounded-lg",
              "flex items-center justify-center",
              "group-data-[selected=true]:bg-transparent",
              "!text-default-500",
              "pt-px",
              "px-0",
              "mx-0",
            ],
            classNames?.wrapper,
          ),
        })}
      >
        {!isSelected ? activeIcon : inactiveIcon}
      </div>
    </Component>
  );
};
