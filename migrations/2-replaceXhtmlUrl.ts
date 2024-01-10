import { JSDOM } from "jsdom";
import { Db, MongoClient, ObjectId, WithId } from "mongodb";
import pretty from "pretty";

export const up = async (db: Db, client: MongoClient) => {
  const epubResourceCollection = db.collection<{
    _id: ObjectId;
    content: string;
    mediaType: string;
  }>("epubResource");
  const resources = await epubResourceCollection
    .find({ mediaType: "application/xhtml+xml" })
    .project<WithId<{ content: string }>>({ _id: 1, content: 1 })
    .toArray();

  for (const resource of resources) {
    const dom = new JSDOM(resource.content);
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

    for (const { tag, attribute } of replaceList) {
      const elements = dom.window.document.getElementsByTagName(tag);
      for (const element of elements) {
        const value = element.getAttribute(attribute);
        if (value && value.startsWith("/novels")) {
          element.setAttribute(
            "resource",
            JSON.stringify({
              resourceName: value.split("/").slice(-1)[0],
              attribute: attribute,
            }),
          );
          element.removeAttribute(attribute);
        }
      }
    }

    const newContent = pretty(dom.window.document.body.innerHTML);

    await epubResourceCollection.updateOne(
      { _id: resource._id },
      { $set: { content: newContent } },
    );
  }
};
