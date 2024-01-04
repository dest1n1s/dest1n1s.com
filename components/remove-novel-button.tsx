"use client";

import { ButtonProps } from "@nextui-org/react";
import { useRouter } from "next/navigation";
import { ButtonWithConfirm } from "./button-with-confirm";

export const RemoveNovelButton = ({
  bookName,
  title,
  ...props
}: ButtonProps & { bookName: string; title: string }) => {
  const router = useRouter();
  return (
    <ButtonWithConfirm
      {...props}
      confirmTitle="删除书籍"
      confirmText={`确认删除书籍 ${title} 吗？`}
      onConfirm={async () => {
        await fetch(`/api/novels/${encodeURIComponent(bookName)}`, {
          method: "DELETE",
        });
        router.refresh();
      }}
    />
  );
};
