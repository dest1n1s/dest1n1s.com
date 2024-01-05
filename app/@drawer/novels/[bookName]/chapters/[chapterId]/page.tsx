"use server";

import { DrawerMarker } from "@/components/layout/drawer";
import { paginateEpub } from "@/lib/novel/epub";
import { loadEpubCached } from "@/lib/novel/epub.server";
import clsx from "clsx";
import Link from "next/link";

export default async function Drawer({
  params: { bookName, chapterId },
}: {
  params: { bookName: string; chapterId: string };
}) {
  const decodedBookName = decodeURIComponent(bookName);
  const epub = await loadEpubCached(decodedBookName).catch(() => null);
  if (!epub) {
    return <div>Book not found</div>;
  }

  const chapters = paginateEpub(epub);
  const chapterIndex = parseInt(chapterId, 10) - 1;

  // Return the toc of the book
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-4 px-4 lg:px-8 w-full">
      <div className="w-full flex flex-col gap-1">
        <h3 className="text-xl text-center font-bold">{epub.metadata.title}</h3>
        <p className="text-gray-700">{epub.metadata.creator}</p>
      </div>
      <div className="w-full text-end font-semibold">共 {chapters.length} 章</div>
      <div className="w-full text-neutral-800 flex flex-col gap-1">
        {chapters.map((chapter, index) => (
          <div
            key={index}
            className={clsx(
              "border-b border-gray-400 py-2 border-opacity-30 w-full",
              chapterIndex === index && "text-primary",
            )}
          >
            <Link href={`/novels/${bookName}/chapters/${index + 1}`}>
              {chapter.navPoint.title || "(无题)"}
            </Link>
          </div>
        ))}
      </div>
      <DrawerMarker />
    </div>
  );
}
