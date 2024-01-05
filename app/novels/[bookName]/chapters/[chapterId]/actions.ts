"use server";

import { removeEpubResource } from "@/lib/novel/epub";
import { revalidatePath } from "next/cache";

export const handleRemoveResource = async (bookName: string, savePath: string) => {
  await removeEpubResource(bookName, savePath);
  revalidatePath("/novels/[bookName]/chapters/[chapterId]");
};
