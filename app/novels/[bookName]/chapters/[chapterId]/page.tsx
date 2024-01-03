"use server";

import { loadEpub, paginateEpub } from "@/lib/novel/epub";

export default async function Page({
  params: { bookName, chapterId },
}: {
  params: { bookName: string; chapterId: string };
}) {
  const decodedBookName = decodeURIComponent(bookName);
  const epub = await loadEpub(decodedBookName, { noImage: true }).catch(() => null);
  if (!epub) {
    return <div>Book not found</div>;
  }

  const chapters = paginateEpub(epub);
  const chapterIndex = parseInt(chapterId, 10) - 1;
  const chapter = chapters[chapterIndex];
  const html = await chapter.xhtmlList.map(x => x.html).join("\n");

  if (!chapter) {
    return <div>Chapter not found</div>;
  }

  return (
    <section className="flex flex-col items-center justify-center gap-12">
      <div
        className="w-full prose prose-sm md:prose-lg lg:prose-xl"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}
