import { callbackToPromise, noError } from "@/lib/utils/common";
import { sanitizeFilename } from "@/lib/utils/file";
import { Container, ContainerSchema } from "@/types/epub/container";
import { Epub, EpubInfo, EpubResource, NavPoint } from "@/types/epub/epub";
import { EpubNoContent, EpubResourceNoContent } from "@/types/epub/epub.mongo";
import { Opf, OpfSchema } from "@/types/epub/opf";
import { Toc, TocSchema } from "@/types/epub/toc";
import { R_OK } from "constants";
import { PathLike } from "fs";
import { access, readFile } from "fs/promises";
import { JSDOM } from "jsdom";
import JSZip, { loadAsync } from "jszip";
import { inlineContent } from "juice";
import { WithId } from "mongodb";
import { join, sep } from "path";
import pretty from "pretty";
import xml2js from "xml2js";
import { epubCollection, epubResourceCollection, withMongoSession } from "../database";

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
            savePath: join("novels", bookName, "assets", item.href.split(sep).slice(-1)[0]),
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
  return join(dirPath, href);
};

const processXhtmlResources = (resources: EpubResource[]): EpubResource[] => {
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
              element.setAttribute(replace.attribute, "/" + r.savePath);
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

  const processedResources = processXhtmlResources(resources);
  const processedNavPoints = navPoints
    .map(navPoint => {
      const src = processedResources.find(
        resource => resource.zipPath === join(rootPath, navPoint.src),
      )?.savePath;
      if (!src) {
        throw new Error(`Resource not found: ${navPoint.src}`);
      }
      return { ...navPoint, src };
    })
    .sort((a, b) => parseInt(a.playOrder) - parseInt(b.playOrder));
  const processedSpine = spine.map(id => {
    const src = processedResources.find(resource => resource.id === id)?.savePath;
    if (!src) {
      throw new Error(`Src not found: ${id}`);
    }
    return src;
  });

  const coverId = metadata["meta"]?.find(meta => meta.$["name"] === "cover")?.$["content"];
  const coverPath = coverId && processedResources.find(item => item.id === coverId)?.savePath;

  return {
    resources: processedResources,
    navPoints: processedNavPoints,
    spine: processedSpine,
    cover: coverPath,
    metadata: {
      title: metadata["dc:title"][0]._,
      language: metadata["dc:language"]?.[0]?._,
      creator: metadata["dc:creator"]?.[0]?._,
      identifier: metadata["dc:identifier"]?.[0]?._,
    },
    bookName,
  };
};

export const saveEpub = async (epub: Epub) => {
  const resourceInsertResult = await epubResourceCollection.insertMany(epub.resources);
  const resourceIds = Object.values(resourceInsertResult.insertedIds);
  await withMongoSession(async () => {
    const epubMongo = {
      ...epub,
      resources: resourceIds,
      order: (await epubCollection.countDocuments()) + 1,
      timeCreated: new Date(),
      timeUpdated: new Date(),
    };
    await epubCollection.insertOne(epubMongo);
  });
};

export const loadInfos = async (searchText?: string): Promise<EpubInfo[]> => {
  // Read bookName, metadata, cover from mongodb
  const projection = {
    bookName: 1,
    metadata: 1,
    cover: 1,
    order: 1,
    timeCreated: 1,
    timeUpdated: 1,
  };

  if (!searchText) {
    return await epubCollection.find().project<EpubInfo>(projection).sort({ order: -1 }).toArray();
  } else {
    const pipeline = [
      {
        $match: {
          $or: [
            { bookName: { $regex: searchText, $options: "i" } },
            { "metadata.title": { $regex: searchText, $options: "i" } },
            { "metadata.creator": { $regex: searchText, $options: "i" } },
          ],
        },
      },
      {
        $project: projection,
      },
      {
        $sort: {
          order: -1,
        },
      },
    ];
    const infos = await epubCollection.aggregate<EpubInfo>(pipeline).toArray();
    return infos;
  }
};

export const loadEpub = async (bookName: string): Promise<EpubNoContent | null> => {
  // Read from mongodb, without content of resources
  const pipeline = [
    {
      $match: { bookName: bookName },
    },
    {
      $lookup: {
        from: "epubResource",
        localField: "resources",
        foreignField: "_id",
        as: "resources",
      },
    },
    {
      $project: {
        "resources.content": 0, // Exclude content field
      },
    },
  ];
  const epub = await epubCollection.aggregate<EpubNoContent>(pipeline).next();
  return epub;
};

export const retrieveDetailedResource = async (
  ...resources: WithId<EpubResourceNoContent>[]
): Promise<EpubResource[]> => {
  const resourceIds = resources.map(resource => resource._id);
  const resourceDetails = await epubResourceCollection
    .find({ _id: { $in: resourceIds } })
    .toArray();
  return resourceDetails;
};

export const retrieveResourceWithBookNameAndSavePath = async (
  bookName: string,
  savePath: string,
): Promise<EpubResource | null> => {
  const pipeline = [
    {
      $match: { bookName: bookName },
    },
    {
      $lookup: {
        from: "epubResource",
        localField: "resources",
        foreignField: "_id",
        as: "resourceDetails",
      },
    },
    {
      $unwind: "$resourceDetails",
    },
    {
      $match: { "resourceDetails.savePath": savePath },
    },
    {
      $replaceRoot: { newRoot: "$resourceDetails" },
    },
  ];

  const result = await epubCollection.aggregate<EpubResource>(pipeline).next();
  return result;
};

export const paginateEpub = ({ resources, spine, navPoints }: EpubNoContent) => {
  const xhtmlResources = spine
    .map(path => resources.find(resource => resource.savePath === path))
    .flatMap(resource => (resource?.mediaType === "application/xhtml+xml" ? [resource] : []));

  // Insert a pseudo navPoint at the beginning
  const pseudoNavPoint: NavPoint = {
    id: "pseudo",
    playOrder: "-1",
    src: xhtmlResources[0].savePath,
  };

  const pseudoNavPoints = [pseudoNavPoint, ...navPoints];

  // Segregate xhtmlList into chapters
  const chapters = pseudoNavPoints
    .map((navPoint, index) => {
      const nextNavPoint = pseudoNavPoints[index + 1];
      const startIndex = xhtmlResources.findIndex(xhtml => xhtml.savePath === navPoint.src);
      const endIndex = nextNavPoint
        ? xhtmlResources.findIndex(xhtml => xhtml.savePath === nextNavPoint.src)
        : xhtmlResources.length;
      return {
        navPoint,
        xhtmlList: xhtmlResources.slice(startIndex, endIndex),
      };
    })
    .filter(chapter => chapter.xhtmlList.length > 0);

  return chapters;
};

export const removeEpub = async (bookName: string) => {
  await withMongoSession(async () => {
    const resources = (
      await epubResourceCollection.find({ bookName }).project<WithId<{}>>({ _id: 1 }).toArray()
    ).map(resource => resource._id);
    await epubResourceCollection.deleteMany({ _id: { $in: resources } });
    await epubCollection.deleteOne({ bookName });
  });
};

export const swapOrder = async (bookName1: string, bookName2: string) => {
  await withMongoSession(async () => {
    const [order1, order2] = (
      await Promise.all([
        epubCollection.findOne({ bookName: bookName1 }),
        epubCollection.findOne({ bookName: bookName2 }),
      ])
    ).map(epub => epub?.order);

    if (!order1 || !order2) {
      throw new Error("Book not found");
    }

    await Promise.all([
      epubCollection.updateOne({ bookName: bookName1 }, { $set: { order: order2 } }),
      epubCollection.updateOne({ bookName: bookName2 }, { $set: { order: order1 } }),
    ]);
  });
};
