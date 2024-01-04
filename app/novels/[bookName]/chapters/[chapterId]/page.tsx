"use server";

import { paginateEpub } from "@/lib/novel/epub";
import { loadEpubCached } from "@/lib/novel/epub.server";
import { Button, Link } from "@nextui-org/react";

export default async function Page({
  params: { bookName, chapterId },
}: {
  params: { bookName: string; chapterId: string };
}) {
  const decodedBookName = decodeURIComponent(bookName);
  const epub = await loadEpubCached(decodedBookName, { noImage: true }).catch(() => null);
  if (!epub) {
    return <div>Book not found</div>;
  }

  const chapters = paginateEpub(epub);
  const chapterIndex = parseInt(chapterId, 10) - 1;
  const chapter = chapters[chapterIndex];
  const html = await chapter.xhtmlList.map(x => x.html).join("\n");

  const hasPrev = chapterIndex > 0;
  const hasNext = chapterIndex < chapters.length - 1;

  if (!chapter) {
    return <div>Chapter not found</div>;
  }

  return (
    <section className="flex flex-col items-center justify-center gap-12">
      <div
        className="w-full prose prose-sm md:prose-lg lg:prose-xl"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <div className="flex gap-24 md:gap-36 lg:gap-48">
        <Link href={`/novels/${bookName}/chapters/${chapterIndex}`} isDisabled={!hasPrev}>
          <Button size="sm" className="text-sm" color="primary" isDisabled={!hasPrev} radius="lg">
            {hasPrev
              ? `上一章：${chapters[chapterIndex - 1].navPoint.title || "(无题)"}`
              : "没有上一章"}
          </Button>
        </Link>
        <Link href={`/novels/${bookName}/chapters/${chapterIndex + 2}`} isDisabled={!hasNext}>
          <Button
            size="sm"
            className="text-sm bg-gradient-to-br from-indigo-500 to-pink-500 text-white shadow-lg"
            color="primary"
            radius="lg"
            isDisabled={!hasNext}
          >
            {hasNext
              ? `下一章：${chapters[chapterIndex + 1].navPoint.title || "(无题)"}`
              : "全文终"}
          </Button>
        </Link>
      </div>
    </section>
  );
}
