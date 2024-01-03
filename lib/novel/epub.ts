import { callbackToPromise, noError } from "@/lib/utils/common";
import { sanitizeFilename, writeFileSafe } from "@/lib/utils/file";
import { Container, ContainerSchema } from "@/types/epub/container";
import { Epub } from "@/types/epub/epub";
import { Opf, OpfSchema } from "@/types/epub/opf";
import { Toc, TocSchema } from "@/types/epub/toc";
import { R_OK } from "constants";
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

const loadZip = async (path: string) => {
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
    href: item.$.href,
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
    src: navPoint.content[0].$.src,
    title: navPoint.navLabel[0].text[0]["_"],
  }));
};

const resolveXhtmlAndResourcesFromZip = async (zip: JSZip, path: string, bookName: string) => {
  const xhtml = await resolvePathFromZip(zip, path);
  const dom = new JSDOM(xhtml);
  const document = dom.window.document;
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .map(link => link.getAttribute("href"))
    .flatMap(href => (href ? [href] : []))
    .map(href => join(path.split(sep).slice(0, -1).join(sep), href));
  const styles = await Promise.all(links.map(async link => await resolvePathFromZip(zip, link)));

  const inlinedXhtml = inlineContent(xhtml, styles.join("\n"));
  const inlinedDom = new JSDOM(inlinedXhtml);
  const inlinedDocument = inlinedDom.window.document;
  const images = await Promise.all(
    Array.from(inlinedDocument.querySelectorAll("img"))
      .map(img => img.getAttribute("src"))
      .flatMap(src => (src ? [src] : []))
      .map(async src => ({
        originalSrc: src,
        src: join("novels", bookName, "images", src.split(sep).slice(2).join("_")),
        image: await resolveImageFromZip(zip, join(path.split(sep).slice(0, -1).join(sep), src)),
      })),
  );

  // Replace image srcs
  inlinedDocument.querySelectorAll("img").forEach(img => {
    const src = img.getAttribute("src");
    if (!src) {
      return;
    }
    const image = images.find(image => image.originalSrc === src);
    if (!image) {
      return;
    }
    img.setAttribute("src", image.src);
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
    "text-align",
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
      src: join("novels", bookName, "html", path.split(sep).slice(2).join("_")),
      html: newHtml,
    },
    images,
  };
};

export const parseEpub = async (path: string): Promise<Epub> => {
  if (!path.endsWith(".epub")) {
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
        html: { ...xhtmlAndResources.html, originalSrc: item.href },
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
      const src = xhtmlList.find(xhtml => xhtml.originalSrc === navPoint.src)?.src;
      if (!src) {
        throw new Error(`Src not found: ${navPoint.src}`);
      }
      return { ...navPoint, src };
    })
    .sort((a, b) => parseInt(a.playOrder) - parseInt(b.playOrder));

  // Save toc, spine and metadata into a json file
  const opfJson = {
    toc: convertedNavPoints,
    spine: xhtmlList.map(xhtml => xhtml.src),
    metadata: {
      title: metadata["dc:title"][0]._,
      language: metadata["dc:language"]?.[0]?._,
      creator: metadata["dc:creator"]?.[0]?._,
      identifier: metadata["dc:identifier"]?.[0]?._,
    },
  };

  return {
    xhtmlList,
    resourceList,
    opf: opfJson,
    bookName,
  };
};

export const saveEpub = async ({ xhtmlList, resourceList, opf, bookName }: Epub) => {
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
};
