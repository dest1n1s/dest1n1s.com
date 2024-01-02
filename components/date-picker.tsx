"use client";

import { InputProps, useInput } from "@nextui-org/react";
import { CloseFilledIcon } from "@nextui-org/shared-icons";
import { FC, forwardRef, useMemo, useState } from "react";
import ReactDatePicker from "react-datepicker";
import { FaCalendarDays } from "react-icons/fa6";

type ClickableInputProps = InputProps & {
  onClickInput?: () => void;
};

const ClickableInput = forwardRef<HTMLInputElement, ClickableInputProps>((props, ref) => {
  const {
    Component,
    label,
    description,
    isClearable,
    startContent,
    endContent,
    labelPlacement,
    hasHelper,
    isOutsideLeft,
    shouldLabelBeOutside,
    errorMessage,
    getBaseProps,
    getLabelProps,
    getInputProps,
    getInnerWrapperProps,
    getInputWrapperProps,
    getMainWrapperProps,
    getHelperWrapperProps,
    getDescriptionProps,
    getErrorMessageProps,
    getClearButtonProps,
  } = useInput({ ...props, ref });
  const { onClickInput } = props;

  const labelContent = useMemo(() => {
    return label ? <label {...getLabelProps()}>{label}</label> : null;
  }, [label, getLabelProps]);

  const end = useMemo(() => {
    if (isClearable) {
      return <span {...getClearButtonProps()}>{endContent || <CloseFilledIcon />}</span>;
    }

    return endContent;
  }, [isClearable, endContent, getClearButtonProps]);

  const helperWrapper = useMemo(() => {
    if (!hasHelper) return null;

    return (
      <div {...getHelperWrapperProps()}>
        {errorMessage ? (
          <div {...getErrorMessageProps()}>{errorMessage}</div>
        ) : description ? (
          <div {...getDescriptionProps()}>{description}</div>
        ) : null}
      </div>
    );
  }, [
    hasHelper,
    errorMessage,
    description,
    getHelperWrapperProps,
    getErrorMessageProps,
    getDescriptionProps,
  ]);

  const innerWrapper = useMemo(() => {
    if (startContent || end) {
      return (
        <div {...getInnerWrapperProps()}>
          {startContent}
          <input {...getInputProps()} />
          {end}
        </div>
      );
    }

    return (
      <div {...getInnerWrapperProps()}>
        <input {...getInputProps()} />
      </div>
    );
  }, [startContent, end, getInnerWrapperProps, getInputProps]);

  const mainWrapper = useMemo(() => {
    if (shouldLabelBeOutside) {
      return (
        <div {...getMainWrapperProps()}>
          <div {...getInputWrapperProps()} onClick={onClickInput}>
            {!isOutsideLeft ? labelContent : null}
            {innerWrapper}
          </div>
          {helperWrapper}
        </div>
      );
    }

    return (
      <>
        <div {...getInputWrapperProps()}>
          {labelContent}
          {innerWrapper}
        </div>
        {helperWrapper}
      </>
    );
  }, [
    shouldLabelBeOutside,
    getInputWrapperProps,
    labelContent,
    innerWrapper,
    helperWrapper,
    getMainWrapperProps,
    onClickInput,
    isOutsideLeft,
  ]);

  return (
    <Component {...getBaseProps()}>
      {isOutsideLeft ? labelContent : null}
      {mainWrapper}
    </Component>
  );
});

ClickableInput.displayName = "ClickableInput";

export type DatePickerProps = InputProps & { inputClassName?: string };

export const DatePicker: FC<DatePickerProps> = props => {
  const [startDate, setStartDate] = useState(new Date());
  const { className, inputClassName, classNames, ...inputProps } = props;
  const DatePickerInput = forwardRef<HTMLInputElement, InputProps & { onClick?: () => void }>(
    ({ value, onClick }, ref) => (
      <ClickableInput
        ref={ref}
        value={value}
        onClickInput={onClick}
        startContent={<FaCalendarDays />}
        className={inputClassName}
        classNames={{
          inputWrapper: "!cursor-pointer select-none",
          input: "cursor-pointer select-none",
          ...classNames,
        }}
        style={{ caretColor: "transparent" }}
        {...inputProps}
      />
    ),
  );
  DatePickerInput.displayName = "DatePickerInput";
  return (
    <div className={className}>
      <ReactDatePicker
        selected={startDate}
        onChange={(date: Date) => setStartDate(date)}
        customInput={<DatePickerInput />}
        popperClassName="!z-50"
        wrapperClassName="w-full"
      />
    </div>
  );
};
