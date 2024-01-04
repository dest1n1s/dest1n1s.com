import { callbackToPromise, noError } from "@/lib/utils/common";
import { removeFolderSafe, sanitizeFilename, writeFileSafe } from "@/lib/utils/file";
import { Container, ContainerSchema } from "@/types/epub/container";
import { Epub, EpubInfo, NavPoint } from "@/types/epub/epub";
import { Opf, OpfSchema } from "@/types/epub/opf";
import { Toc, TocSchema } from "@/types/epub/toc";
import { F_OK, R_OK } from "constants";
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
  return await file.async("nodebuffer");
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

const resolveXhtmlAndResourcesFromZip = async (zip: JSZip, path: string, bookName: string) => {
  const xhtml = await resolvePathFromZip(zip, path);
  const dom = new JSDOM(xhtml);
  const document = dom.window.document;
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map(link => link.getAttribute("href"))
    .flatMap(href => (href ? [decodeURIComponent(href)] : []))
    .map(href => join(path.split(sep).slice(0, -1).join(sep), href));
  const styles = await Promise.all(links.map(async link => await resolvePathFromZip(zip, link)));

  const inlinedXhtml = inlineContent(xhtml, styles.join("\n"));
  const inlinedDom = new JSDOM(inlinedXhtml);
  const inlinedDocument = inlinedDom.window.document;

  const images = await Promise.all(
    Array.from(inlinedDocument.querySelectorAll("img"))
      .map(img => img.getAttribute("src"))
      .concat(
        Array.from(inlinedDocument.querySelectorAll("image")).map(img =>
          img.getAttribute("xlink:href"),
        ),
      )
      .flatMap(src => (src ? [decodeURIComponent(src)] : []))
      .map(async src => ({
        originalSrc: join(path.split(sep).slice(0, -1).join(sep), src),
        src: join("/", "novels", bookName, "images", src.split(sep).slice(-1)[0]),
        image: await resolveImageFromZip(zip, join(path.split(sep).slice(0, -1).join(sep), src)),
      })),
  );

  // Replace image srcs
  inlinedDocument.querySelectorAll("img").forEach(img => {
    const src = img.getAttribute("src");
    if (!src) {
      return;
    }
    const image = images.find(
      image =>
        image.originalSrc === join(path.split(sep).slice(0, -1).join(sep), decodeURIComponent(src)),
    );
    if (!image) {
      return;
    }
    img.setAttribute("src", image.src);
  });

  inlinedDocument.querySelectorAll("image").forEach(img => {
    const src = img.getAttribute("xlink:href");
    if (!src) {
      return;
    }
    const image = images.find(
      image =>
        image.originalSrc === join(path.split(sep).slice(0, -1).join(sep), decodeURIComponent(src)),
    );
    if (!image) {
      return;
    }
    img.setAttribute("xlink:href", image.src);
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
      if (level >= 1 && level <= 5) {
        const parent = element.parentElement;
        if (parent) {
          const newElement = document.createElement(`h${level + 1}`);
          newElement.innerHTML = element.innerHTML;
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
  return {
    html: {
      src: join("novels", bookName, "html", path.split(sep).slice(-1)[0]),
      html: newHtml,
    },
    images,
  };
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
  const manifest = getManifest(opf);
  const metadata = opf.package.metadata[0];
  const bookName = sanitizeFilename(metadata["dc:title"][0]["_"]);
  const xhtmlAndResourcesList = await Promise.all(
    spine.map(async id => {
      const item = manifest.find(item => item.id === id);
      if (!item) {
        throw new Error(`Item not found: ${id}`);
      }
      const xhtmlAndResources = await resolveXhtmlAndResourcesFromZip(
        zip,
        join(rootPath, item.href),
        bookName,
      );
      return {
        html: { ...xhtmlAndResources.html, originalSrc: join(rootPath, item.href) },
        images: xhtmlAndResources.images,
      };
    }),
  );

  const { xhtmlList, resourceList } = xhtmlAndResourcesList.reduce<{
    xhtmlList: { src: string; html: string; originalSrc: string }[];
    resourceList: { src: string; image: Buffer; originalSrc: string }[];
  }>(
    ({ xhtmlList, resourceList }, xhtmlAndResources) => {
      return {
        xhtmlList: xhtmlList.concat(xhtmlAndResources.html),
        resourceList: resourceList
          .concat(xhtmlAndResources.images)
          .filter((image, index, self) => self.findIndex(i => i.src === image.src) === index),
      };
    },
    { xhtmlList: [], resourceList: [] },
  );

  const convertedNavPoints = navPoints
    .map(navPoint => {
      const src = xhtmlList.find(xhtml => xhtml.originalSrc === join(rootPath, navPoint.src))?.src;
      if (!src) {
        throw new Error(`Src not found: ${navPoint.src}`);
      }
      return { ...navPoint, src };
    })
    .sort((a, b) => parseInt(a.playOrder) - parseInt(b.playOrder));

  const coverId = metadata["meta"]?.find(meta => meta.$["name"] === "cover")?.$["content"];
  const coverManifestSrc = coverId && manifest.find(item => item.id === coverId)?.href;
  const coverOriginalSrc = coverManifestSrc && join(rootPath, coverManifestSrc);
  const coverImage = coverOriginalSrc && {
    originalSrc: coverOriginalSrc,
    src: join("/", "novels", bookName, "images", coverOriginalSrc.split(sep).slice(-1)[0]),
    image: await resolveImageFromZip(zip, coverOriginalSrc),
  };

  return {
    xhtmlList,
    resourceList: (coverImage ? [coverImage, ...resourceList] : resourceList).filter(
      (resource, index, self) => self.findIndex(r => r.src === resource.src) === index,
    ),
    navPoints: convertedNavPoints,
    spine: xhtmlList.map(xhtml => xhtml.src),
    cover: coverImage.src,
    metadata: {
      title: metadata["dc:title"][0]._,
      language: metadata["dc:language"]?.[0]?._,
      creator: metadata["dc:creator"]?.[0]?._,
      identifier: metadata["dc:identifier"]?.[0]?._,
    },
    bookName,
  };
};

export const saveEpub = async ({ xhtmlList, resourceList, bookName, ...opf }: Epub) => {
  await Promise.all(
    xhtmlList.map(async xhtml => {
      await writeFileSafe(join("data", xhtml.src), xhtml.html);
    }),
  );

  await Promise.all(
    resourceList.map(async resource => {
      await writeFileSafe(join("data", resource.src), resource.image);
    }),
  );

  await writeFileSafe(join("data", "novels", bookName, "opf.json"), JSON.stringify(opf, null, 2));

  const infos = (await loadInfos()).filter(info => info.bookName !== bookName);
  const newInfos = [...infos, { bookName, metadata: opf.metadata, cover: opf.cover }];
  await writeFileSafe(join("data", "novels", "infos.json"), JSON.stringify(newInfos, null, 2));
};

export const loadInfos = async (): Promise<EpubInfo[]> => {
  const infosPath = join("data", "novels", "infos.json");
  return (await noError(access(infosPath, F_OK)))
    ? JSON.parse(await readFile(infosPath, { encoding: "utf-8" }))
    : [];
};

export const loadEpub = async (
  bookName: string,
  { noImage }: { noImage: boolean } = { noImage: false },
): Promise<Epub> => {
  const opf = JSON.parse(
    await readFile(join("data", "novels", bookName, "opf.json"), {
      encoding: "utf-8",
    }),
  );
  const xhtmlList = await Promise.all(
    opf.spine.map(async (src: string) => {
      const html = await readFile(join("data", src), { encoding: "utf-8" });
      return { src, html };
    }),
  );
  const resourceList = noImage
    ? []
    : await Promise.all(
        opf.resourceList.map(async (src: string) => {
          const image = await readFile(join("data", src));
          return { src, image };
        }),
      );
  return { ...opf, xhtmlList, resourceList };
};

export const paginateEpub = ({ xhtmlList, navPoints }: Epub) => {
  // Insert a pseudo navPoint at the beginning
  const pseudoNavPoint: NavPoint = {
    id: "pseudo",
    playOrder: "-1",
    src: xhtmlList[0].src,
  };

  const pseudoNavPoints = [pseudoNavPoint, ...navPoints];

  // Segregate xhtmlList into chapters
  const chapters = pseudoNavPoints
    .map((navPoint, index) => {
      const nextNavPoint = pseudoNavPoints[index + 1];
      const startIndex = xhtmlList.findIndex(xhtml => xhtml.src === navPoint.src);
      const endIndex = nextNavPoint
        ? xhtmlList.findIndex(xhtml => xhtml.src === nextNavPoint.src)
        : xhtmlList.length;
      return {
        navPoint,
        xhtmlList: xhtmlList.slice(startIndex, endIndex),
      };
    })
    .filter(chapter => chapter.xhtmlList.length > 0);

  return chapters;
};

export const removeEpub = async (bookName: string) => {
  const infos = await loadInfos();
  const newInfos = infos.filter(info => info.bookName !== bookName);
  await writeFileSafe(join("data", "novels", "infos.json"), JSON.stringify(newInfos, null, 2));

  await removeFolderSafe(join("data", "novels", bookName));
};
