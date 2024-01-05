"use client";

import { handleRemoveResource } from "@/app/novels/[bookName]/chapters/[chapterId]/actions";
import { Button } from "@nextui-org/react";
import clsx from "clsx";
import { HTMLAttributes, useState } from "react";
import { FaEllipsis, FaEllipsisVertical, FaXmark } from "react-icons/fa6";
import { IconSwitch } from "../common/icon-switch";

export type NovelSectionButtonsProps = HTMLAttributes<HTMLDivElement> & {
  bookName: string;
  savePath: string;
};

export const NovelSectionButtons = ({
  bookName,
  savePath,
  className,
  ...props
}: NovelSectionButtonsProps) => {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div
      {...props}
      className={clsx(
        "flex flex-col gap-2 items-center rounded-lg",
        className,
        showDetail && "shadow-sm bg-stone-100 bg-opacity-60",
      )}
    >
      <IconSwitch
        className="w-8 h-8"
        active={showDetail}
        onActiveChange={setShowDetail}
        ariaLabel="Show detail section buttons"
        activeIcon={
          <FaEllipsis size={20} className="text-default-900 opacity-30 hover:opacity-100" />
        }
        inactiveIcon={<FaEllipsisVertical size={20} className="text-default-400" />}
      />
      <div className={clsx("flex flex-col gap-2 items-center", !showDetail && "hidden")}>
        <Button
          isIconOnly
          variant="light"
          size="sm"
          onClick={async () => {
            await handleRemoveResource(bookName, savePath);
          }}
        >
          <FaXmark size={20} />
        </Button>
      </div>
    </div>
  );
};
