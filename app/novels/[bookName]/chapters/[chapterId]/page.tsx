import { LinkButton } from "@/components/common/link-button";
import { EpubVisibilityController, EpubVisibilitySensor } from "@/components/ui/epub-visibility";
import { NovelSectionButtons } from "@/components/ui/novel-section-buttons";
import { computeEpubResourceUrl } from "@/lib/novel/epub";
import { loadEpubCached, retrieveDetailedResource } from "@/lib/novel/epub.server";
import { EpubResource } from "@/types/epub/epub";
import { Image, Link } from "@nextui-org/react";
import clsx from "clsx";
import parse, {
  DOMNode,
  Element,
  HTMLReactParserOptions,
  attributesToProps,
  domToReact,
} from "html-react-parser";
import { JSDOM } from "jsdom";

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

  const preTransform = (html: string) => {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    // Transform svg with image to img
    const svgs = document.querySelectorAll("svg");
    svgs.forEach(svg => {
      if (svg.children.length === 1 && svg.children[0].tagName === "image") {
        const image = svg.children[0];
        const src = image.getAttribute("xlink:href") || image.getAttribute("href");
        const alt = image.getAttribute("alt");
        const className = svg.getAttribute("class");
        const resource = image.getAttribute("resource");
        const img = document.createElement("img");
        if (src) {
          img.setAttribute("src", src);
        }
        if (alt) {
          img.setAttribute("alt", alt);
        }
        if (className) {
          img.setAttribute("class", className);
        }
        if (resource) {
          img.setAttribute("resource", resource);
        }
        svg.replaceWith(img);
      }
    });
    return document.body.innerHTML;
  };

  const parserOption = {
    replace: (domNode: DOMNode) => {
      const el = domNode as Element;
      const tagName = el.name;
      if (!el.attribs || !el.attribs.resource) {
        return;
      }
      const { resource, ...attr } = el.attribs;
      const src = JSON.parse(resource).resourceName;
      const url = computeEpubResourceUrl(decodedBookName, src);
      if (tagName === "img") {
        // eslint-disable-next-line jsx-a11y/alt-text
        return <Image src={url} {...attributesToProps(attr)} />;
      } else if (tagName === "image") {
        return <image xlinkHref={url} {...attributesToProps(attr)} />;
      } else if (tagName === "a" || tagName === "link") {
        return (
          <Link href={computeEpubResourceUrl(decodedBookName, src)} {...attributesToProps(attr)}>
            {domToReact(el.children as DOMNode[], parserOption)}
          </Link>
        );
      } else {
        return;
      }
    },
  };

  const rootSubNodeParserOption = (
    section: EpubResource,
    index: number,
  ): HTMLReactParserOptions => ({
    replace: domNode => {
      const el = domNode as Element;
      if (!el.children) {
        return;
      }
      if (el.children.length === 1 && el.children[0].type === "text") {
        if (el.children[0].data.trim().length === 0) {
          return <></>;
        }
      }
      return (
        <EpubVisibilitySensor
          bookName={decodedBookName}
          resourceName={section.resourceName}
          index={index}
        >
          {domToReact([domNode], parserOption)}
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

  const nodes = sections.map(section =>
    parse(preTransform(section.content), rootParserOption(section)),
  );

  return (
    <section className="flex flex-col items-center justify-center gap-12">
      <div className="w-full prose prose-sm md:prose-lg lg:prose-xl dark:prose-invert">
        <EpubVisibilityController bookName={bookName}>{nodes}</EpubVisibilityController>
      </div>

      <div className="flex gap-24 md:gap-36 lg:gap-48">
        <LinkButton
          size="sm"
          className="text-sm"
          color="primary"
          isDisabled={!hasPrev}
          radius="lg"
          href={hasPrev ? `/novels/${bookName}/chapters/${chapterIndex}` : undefined}
        >
          {hasPrev ? `上一章：${chapters[chapterIndex - 1].title || "(无题)"}` : "没有上一章"}
        </LinkButton>
        <LinkButton
          size="sm"
          className="text-sm bg-gradient-to-br from-indigo-500 to-pink-500 text-white shadow-lg"
          color="primary"
          radius="lg"
          isDisabled={!hasNext}
          href={hasNext ? `/novels/${bookName}/chapters/${chapterIndex + 2}` : undefined}
        >
          {hasNext ? `下一章：${chapters[chapterIndex + 1].title || "(无题)"}` : "全文终"}
        </LinkButton>
      </div>
    </section>
  );
}
