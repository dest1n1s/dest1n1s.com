"use server";

import { removeEpub, swapOrder } from "@/lib/novel/epub.server";
import { revalidatePath } from "next/cache";

export const handleSwapOrder = async (bookName1: string, bookName2: string) => {
  await swapOrder(bookName1, bookName2);
  revalidatePath("/novels");
};

export const handleRemoveBook = async (bookName: string) => {
  await removeEpub(bookName);
  revalidatePath("/novels");
};

export const handleNovelsRevalidate = () => {
  revalidatePath("/novels");
};
