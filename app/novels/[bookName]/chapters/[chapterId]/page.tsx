import { EpubVisibilityController, EpubVisibilitySensor } from "@/components/ui/epub-visibility";
import { NovelSectionButtons } from "@/components/ui/novel-section-buttons";
import { loadEpubCached, retrieveDetailedResource } from "@/lib/novel/epub.server";
import { EpubResource } from "@/types/epub/epub";
import { Button, Link } from "@nextui-org/react";
import clsx from "clsx";
import parse, {
  DOMNode,
  Element,
  HTMLReactParserOptions,
  attributesToProps,
  domToReact,
} from "html-react-parser";

export default async function Page({
  params: { bookName, chapterId },
}: {
  params: { bookName: string; chapterId: string };
}) {
  const decodedBookName = decodeURIComponent(bookName);
  const epub = await loadEpubCached(decodedBookName);
  if (!epub) {
    return <div>Book not found</div>;
  }

  const chapters = epub.chapters;
  const chapterIndex = parseInt(chapterId, 10) - 1;
  const chapter = chapters[chapterIndex];
  const sections = await retrieveDetailedResource(...chapter.sections);

  const hasPrev = chapterIndex > 0;
  const hasNext = chapterIndex < chapters.length - 1;

  if (!chapter) {
    return <div>Chapter not found</div>;
  }

  const rootSubNodeParserOption = (
    section: EpubResource,
    index: number,
  ): HTMLReactParserOptions => ({
    replace: domNode => {
      const el = domNode as Element;
      if (!el.children) {
        return;
      }
      return (
        <EpubVisibilitySensor
          bookName={decodedBookName}
          resourceName={section.resourceName}
          index={index}
        >
          {domToReact([domNode])}
        </EpubVisibilitySensor>
      );
    },
  });

  const rootParserOption = (section: EpubResource): HTMLReactParserOptions => ({
    replace: domNode => {
      const el = domNode as Element;
      const { className, ...props } = attributesToProps(el.attribs);
      if (!el.children) return;

      return (
        <div {...props} className={clsx(className, "relative")} key={section.resourceName}>
          <NovelSectionButtons
            bookName={decodedBookName}
            resourceName={section.resourceName}
            className="absolute top-0 right-0 not-prose"
          />
          {el.children.map((child, index) => {
            return domToReact([child as DOMNode], rootSubNodeParserOption(section, index));
          })}
        </div>
      );
    },
  });

  const nodes = sections.map(section => parse(section.content, rootParserOption(section)));

  return (
    <section className="flex flex-col items-center justify-center gap-12">
      <div className="w-full prose prose-sm md:prose-lg lg:prose-xl dark:prose-invert">
        <EpubVisibilityController bookName={bookName}>{nodes}</EpubVisibilityController>
      </div>

      <div className="flex gap-24 md:gap-36 lg:gap-48">
        <Link href={`/novels/${bookName}/chapters/${chapterIndex}`} isDisabled={!hasPrev}>
          <Button size="sm" className="text-sm" color="primary" isDisabled={!hasPrev} radius="lg">
            {hasPrev ? `上一章：${chapters[chapterIndex - 1].title || "(无题)"}` : "没有上一章"}
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
            {hasNext ? `下一章：${chapters[chapterIndex + 1].title || "(无题)"}` : "全文终"}
          </Button>
        </Link>
      </div>
    </section>
  );
}
