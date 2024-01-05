"use client";

import { handleRemoveBook } from "@/app/novels/actions";
import { ButtonProps } from "@nextui-org/react";
import { ButtonWithConfirm } from "../common/button-with-confirm";

export const RemoveNovelButton = ({
  bookName,
  title,
  ...props
}: ButtonProps & { bookName: string; title: string }) => {
  return (
    <ButtonWithConfirm
      {...props}
      confirmTitle="删除书籍"
      confirmText={`确认删除书籍 ${title} 吗？`}
      onConfirm={async () => {
        await handleRemoveBook(bookName);
      }}
    />
  );
};
