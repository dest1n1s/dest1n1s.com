"use server";

import { removeEpubResource } from "@/lib/novel/epub.server";
import { revalidatePath } from "next/cache";

export const handleRemoveResource = async (bookName: string, resourceName: string) => {
  await removeEpubResource(bookName, resourceName);
  revalidatePath("/novels/[bookName]/chapters/[chapterId]");
};
