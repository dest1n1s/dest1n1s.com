import { callbackToPromise, noError } from "@/lib/utils/common";
import { sanitizeFilename } from "@/lib/utils/file";
import { Container, ContainerSchema } from "@/types/epub/container";
import { Epub, EpubChapter, EpubResource } from "@/types/epub/epub";
import { Opf, OpfSchema } from "@/types/epub/opf";
import { Toc, TocSchema } from "@/types/epub/toc";
import { R_OK } from "constants";
import { PathLike } from "fs";
import { access, readFile } from "fs/promises";
import { JSDOM } from "jsdom";
import JSZip, { loadAsync } from "jszip";
import { inlineContent } from "juice";
import { join, sep } from "path";
import pretty from "pretty";
import xml2js from "xml2js";

const parseXml = async <T>(xml: string) => {
  const xmlParser = new xml2js.Parser({ explicitCharkey: true, emptyTag: () => ({}) });
  return await callbackToPromise<T>(callback => xmlParser.parseString(xml, callback));
};

const loadZip = async (path: PathLike) => {
  const zipContent = await readFile(path);
  return await loadAsync(zipContent);
};

const resolvePathFromZip = async (zip: JSZip, path: string) => {
  const file = zip.file(path);
  if (!file) {
    throw new Error(`File not found: ${path}`);
  }
  return await file.async("string");
};

const resolveImageFromZip = async (zip: JSZip, path: string) => {
  const file = zip.file(path);
  if (!file) {
    throw new Error(`File not found: ${path}`);
  }
  return (await file.async("nodebuffer")).toString("base64");
};

const resolveXmlFromZip = async (zip: JSZip, path: string) => {
  const xml = await resolvePathFromZip(zip, path);
  return await parseXml(xml);
};

const getOpfPath = (container: Container) => {
  return container.container.rootfiles[0].rootfile[0].$["full-path"];
};

const getSpine = (opf: Opf) => {
  return opf.package.spine[0].itemref.map(itemref => itemref.$.idref);
};

const getManifest = (opf: Opf) => {
  return opf.package.manifest[0].item.map(item => ({
    id: item.$.id,
    href: decodeURIComponent(item.$.href),
    mediaType: item.$["media-type"],
  }));
};

const getResources = async (
  zip: JSZip,
  opf: Opf,
  rootPath: string,
  bookName: string,
): Promise<EpubResource[]> => {
  return (
    await Promise.all(
      getManifest(opf).map(
        async item =>
          ({
            id: item.id,
            zipPath: join(rootPath, item.href),
            resourceName: item.href.split(sep).slice(-1)[0],
            content: item.mediaType.startsWith("image/")
              ? await resolveImageFromZip(zip, join(rootPath, item.href))
              : await resolvePathFromZip(zip, join(rootPath, item.href)),
            mediaType: item.mediaType,
          }) as EpubResource,
      ),
    )
  ).filter(
    resource =>
      !resource.mediaType.startsWith("font/") &&
      !resource.mediaType.startsWith("application/x-font-") &&
      !resource.mediaType.startsWith("application/font-"),
  );
};

const getTocPath = (opf: Opf) => {
  const tocId = opf.package.spine[0].$["toc"];
  const manifest = getManifest(opf);
  const tocItem = manifest.find(item => item.id === tocId);
  if (!tocItem) {
    throw new Error(`Toc item not found: ${tocId}`);
  }
  return tocItem.href;
};

const getNavPoints = (toc: Toc) => {
  return toc.ncx.navMap[0].navPoint.map(navPoint => ({
    id: navPoint.$.id,
    playOrder: navPoint.$.playOrder,
    src: decodeURIComponent(navPoint.content[0].$.src),
    title: navPoint.navLabel[0].text[0]["_"],
  }));
};

const computeZipPath = (filePath: string, href: string) => {
  const dirPath = filePath.split(sep).slice(0, -1).join(sep);
  return join(dirPath, decodeURIComponent(href));
};

export const computeEpubResourceUrl = (bookName: string, resourceName: string) => {
  return `/novels/${bookName}/assets/${resourceName}`;
};

const processXhtmlResources = (bookName: string, resources: EpubResource[]): EpubResource[] => {
  return resources.map(resource => {
    if (resource.mediaType === "application/xhtml+xml") {
      const dom = new JSDOM(resource.content as string);
      const document = dom.window.document;
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(link => link.getAttribute("href"))
        .flatMap(href => (href ? [href] : []))
        .map(href => computeZipPath(resource.zipPath, href));
      const styles = resources.filter(resource => links.includes(resource.zipPath));
      const inlinedContent = inlineContent(
        resource.content as string,
        styles.map(s => s.content as string).join("\n"),
      );

      const inlinedDom = new JSDOM(inlinedContent);
      const inlinedDocument = inlinedDom.window.document;

      // Replace srcs and hrefs

      const replaceList = [
        {
          tag: "img",
          attribute: "src",
        },
        {
          tag: "image",
          attribute: "xlink:href",
        },
        {
          tag: "a",
          attribute: "href",
        },
        {
          tag: "link",
          attribute: "href",
        },
      ];

      resources.forEach(r => {
        replaceList.forEach(replace => {
          inlinedDocument.querySelectorAll(replace.tag).forEach(element => {
            const attribute = element.getAttribute(replace.attribute);
            if (attribute && computeZipPath(resource.zipPath, attribute) === r.zipPath) {
              element.setAttribute(
                "resource",
                JSON.stringify({
                  resourceName: r.resourceName,
                  attribute: replace.attribute,
                }),
              );
              element.removeAttribute(replace.attribute);
            }
          });
        });
      });

      // Remove reserved styles
      const reservedStyles = [
        "width",
        "height",
        "margin",
        "margin-top",
        "margin-bottom",
        "margin-left",
        "margin-right",
        "padding",
        "padding-top",
        "padding-bottom",
        "padding-left",
        "padding-right",
        "line-height",
        "font-size",
        "font-family",
        "font-style",
        "text-indent",
        "display",
        "duokan-text-indent",
        "border",
      ];
      inlinedDocument.querySelectorAll("*").forEach(element => {
        if (element.hasAttribute("style")) {
          const style = element.getAttribute("style");
          if (!style) {
            return;
          }
          const newStyle = style
            .split(";")
            .filter(style => {
              const [key] = style.split(":");
              return !reservedStyles.includes(key.trim());
            })
            .join(";")
            .trim();
          if (newStyle === "") {
            element.removeAttribute("style");
          } else {
            element.setAttribute("style", newStyle);
          }
        }
        if (element.hasAttribute("class")) {
          element.removeAttribute("class");
        }
        // Downgrade heading by 1 level
        if (element.tagName.startsWith("H")) {
          const level = parseInt(element.tagName[1]);
          if (level == 1) {
            const parent = element.parentElement;
            if (parent) {
              const newElement = document.createElement(`h${level + 1}`);
              newElement.innerHTML = element.innerHTML;
              if (element.attributes.length > 0) {
                Array.from(element.attributes).forEach(attr => {
                  newElement.setAttribute(attr.name, attr.value);
                });
              }
              parent.replaceChild(newElement, element);
            }
          }
        }
      });

      while (
        inlinedDocument.body.children.length === 1 &&
        inlinedDocument.body.children[0].tagName === "DIV"
      ) {
        inlinedDocument.body.innerHTML = inlinedDocument.body.children[0].innerHTML;
      }

      const newHtml = pretty(`<div>${inlinedDocument.body.innerHTML}</div>`);

      return { ...resource, content: newHtml };
    }
    return resource;
  });
};

export const parseEpub = async (path: PathLike): Promise<Epub> => {
  if (typeof path === "string" && !path.endsWith(".epub") && !path.startsWith("/tmp")) {
    throw new Error("File must be an epub");
  }

  if (!(await noError(access(path, R_OK)))) {
    throw new Error("File not found");
  }

  const zip = await loadZip(path);
  const container: Container = ContainerSchema.parse(
    await resolveXmlFromZip(zip, join("META-INF", "container.xml")),
  );
  const opfPath = getOpfPath(container);
  const rootPath = opfPath.split(sep).slice(0, -1).join(sep);
  const opf: Opf = OpfSchema.parse(await resolveXmlFromZip(zip, opfPath));
  const tocPath = getTocPath(opf);
  const toc: Toc = TocSchema.parse(await resolveXmlFromZip(zip, join(rootPath, tocPath)));
  const navPoints = getNavPoints(toc);
  const spine = getSpine(opf);
  const metadata = opf.package.metadata[0];
  const bookName = sanitizeFilename(metadata["dc:title"][0]["_"]);
  const resources = await getResources(zip, opf, rootPath, bookName);

  const processedResources = processXhtmlResources(bookName, resources);
  const processedNavPoints = navPoints
    .map(navPoint => {
      const src = processedResources.find(
        resource => resource.zipPath === join(rootPath, navPoint.src),
      )?.resourceName;
      if (!src) {
        throw new Error(`Resource not found: ${navPoint.src}`);
      }
      return { ...navPoint, src };
    })
    .sort((a, b) => parseInt(a.playOrder) - parseInt(b.playOrder));
  const processedSpineResources = spine.map(id => {
    const resource = processedResources.find(resource => resource.id === id);
    if (!resource) {
      throw new Error(`Resource not found: ${id}`);
    }
    return resource;
  });

  const coverId: string | undefined = metadata["meta"]?.find(meta => meta.$["name"] === "cover")?.$[
    "content"
  ];
  const cover = (coverId && processedResources.find(item => item.id === coverId)) || null;

  const chapters = paginateEpub(processedSpineResources, processedNavPoints);

  return {
    resources: processedResources,
    chapters,
    cover,
    metadata: {
      title: metadata["dc:title"][0]._,
      language: metadata["dc:language"]?.[0]?._,
      creator: metadata["dc:creator"]?.[0]?._,
      identifier: metadata["dc:identifier"]?.[0]?._,
    },
    bookName,
  };
};

export const paginateEpub = (
  spineResources: EpubResource[],
  navPoints: { id: string; playOrder: string; src: string }[],
): EpubChapter[] => {
  // Insert a pseudo navPoint at the beginning
  const pseudoNavPoint = {
    id: "pseudo",
    playOrder: "-1",
    src: spineResources[0].resourceName,
  };

  const pseudoNavPoints = [pseudoNavPoint, ...navPoints];

  // Segregate xhtmlList into chapters
  const chapters = pseudoNavPoints
    .map((navPoint, index) => {
      const nextNavPoint = pseudoNavPoints[index + 1];
      const startIndex = spineResources.findIndex(s => s.resourceName === navPoint.src);
      const endIndex = nextNavPoint
        ? spineResources.findIndex(s => s.resourceName === nextNavPoint.src)
        : spineResources.length;
      return {
        ...navPoint,
        src: undefined,
        sections: spineResources.slice(startIndex, endIndex),
      };
    })
    .filter(chapter => chapter.sections.length > 0);

  return chapters;
};
