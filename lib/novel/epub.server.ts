import { cache } from "react";

import { Epub, EpubResource } from "@/types/epub/epub";
import { EpubNoContent, EpubResourceNoContent } from "@/types/epub/epub.mongo";
import { WithId } from "mongodb";
import {
  epubCollection,
  epubResourceCollection,
  mongoConnectPromise,
  withMongoSession,
} from "../database/database";

import "server-only";

export const saveEpub = async (epub: Epub) => {
  await withMongoSession(async () => {
    const resourceInsertResult = await epubResourceCollection.insertMany(epub.resources);
    const resourceIds = Object.values(resourceInsertResult.insertedIds);
    const resourceWithIds = epub.resources.map((resource, index) => ({
      ...resource,
      _id: resourceIds[index],
    }));
    const chapters = epub.chapters.map(chapter => ({
      ...chapter,
      sections: chapter.sections.map(section => {
        const resource = resourceWithIds.find(
          resource => resource.resourceName === section.resourceName,
        );
        if (!resource) {
          throw new Error("Resource not found");
        }
        return resource._id;
      }),
    }));
    const cover =
      (epub.cover &&
        resourceWithIds.find(resource => resource.resourceName === epub.cover?.resourceName)
          ?._id) ||
      null;
    const maxOrder =
      (
        await epubCollection
          .aggregate<{ max: number }>([{ $group: { _id: null, max: { $max: "$order" } } }])
          .next()
      )?.max || 0;
    const epubMongo = {
      ...epub,
      resources: resourceIds,
      chapters,
      cover,
      order: maxOrder + 1,
      timeCreated: new Date(),
      timeUpdated: new Date(),
    };
    await epubCollection.insertOne(epubMongo);
  });
};

export const loadEpubs = async (searchText?: string): Promise<EpubNoContent[]> => {
  await mongoConnectPromise;
  const foreignPipeline = [
    {
      $project: {
        content: 0,
      },
    },
  ];

  const matchPipeline = searchText
    ? [
        {
          $match: {
            $or: [
              { bookName: { $regex: searchText, $options: "i" } },
              { "metadata.title": { $regex: searchText, $options: "i" } },
              { "metadata.creator": { $regex: searchText, $options: "i" } },
            ],
          },
        },
      ]
    : [];

  const pipeline = [
    ...matchPipeline,
    {
      $unwind: "$chapters",
    },
    {
      $lookup: {
        from: "epubResource",
        localField: "resources",
        foreignField: "_id",
        as: "resources",
        pipeline: foreignPipeline,
      },
    },
    {
      $lookup: {
        from: "epubResource",
        localField: "chapters.sections",
        foreignField: "_id",
        as: "chapters.sections",
        pipeline: foreignPipeline,
      },
    },
    {
      $lookup: {
        from: "epubResource",
        localField: "cover",
        foreignField: "_id",
        as: "cover",
        pipeline: foreignPipeline,
      },
    },
    {
      $unwind: {
        path: "$cover",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: "$_id",
        chapters: { $push: "$chapters" },
        bookName: { $first: "$bookName" },
        cover: { $first: "$cover" },
        metadata: { $first: "$metadata" },
        order: { $first: "$order" },
        resources: { $first: "$resources" },
        timeCreated: { $first: "$timeCreated" },
        timeUpdated: { $first: "$timeUpdated" },
      },
    },
    {
      $sort: {
        order: -1,
      },
    },
  ];
  const epubs = await epubCollection.aggregate<EpubNoContent>(pipeline).toArray();

  return epubs;
};

export const loadEpub = async (bookName: string): Promise<EpubNoContent | null> => {
  await mongoConnectPromise;
  // Read from mongodb, without content of resources
  const foreignPipeline = [
    {
      $project: {
        content: 0,
      },
    },
  ];

  const pipeline = [
    {
      $match: { bookName },
    },
    {
      $unwind: "$chapters",
    },
    {
      $lookup: {
        from: "epubResource",
        localField: "resources",
        foreignField: "_id",
        as: "resources",
        pipeline: foreignPipeline,
      },
    },
    {
      $lookup: {
        from: "epubResource",
        localField: "chapters.sections",
        foreignField: "_id",
        as: "chapters.sections",
        pipeline: foreignPipeline,
      },
    },
    {
      $lookup: {
        from: "epubResource",
        localField: "cover",
        foreignField: "_id",
        as: "cover",
        pipeline: foreignPipeline,
      },
    },
    {
      $unwind: "$cover",
    },
    {
      $group: {
        _id: "$_id",
        chapters: { $push: "$chapters" },
        bookName: { $first: "$bookName" },
        cover: { $first: "$cover" },
        metadata: { $first: "$metadata" },
        order: { $first: "$order" },
        resources: { $first: "$resources" },
        timeCreated: { $first: "$timeCreated" },
        timeUpdated: { $first: "$timeUpdated" },
      },
    },
  ];
  const epub = await epubCollection.aggregate<EpubNoContent>(pipeline).next();
  return epub;
};

export const retrieveDetailedResource = async (
  ...resources: WithId<EpubResourceNoContent>[]
): Promise<EpubResource[]> => {
  await mongoConnectPromise;
  const resourceIds = resources.map(resource => resource._id);
  const resourceDetails = await epubResourceCollection
    .find({ _id: { $in: resourceIds } })
    .toArray();
  return resourceDetails;
};

export const retrieveResourceWithBookNameAndResourceName = async (
  bookName: string,
  resourceName: string,
  noContent: boolean = false,
): Promise<WithId<EpubResource> | null> => {
  await mongoConnectPromise;
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
      $match: { "resourceDetails.resourceName": resourceName },
    },
    {
      $replaceRoot: { newRoot: "$resourceDetails" },
    },
    ...(noContent ? [{ $project: { content: 0 } }] : []),
  ];

  const result = await epubCollection.aggregate<WithId<EpubResource>>(pipeline).next();
  return result;
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

export const removeEpubResource = async (bookName: string, resourceName: string) => {
  await withMongoSession(async () => {
    const [epub, resource] = await Promise.all([
      await epubCollection.findOne({ bookName }),
      await retrieveResourceWithBookNameAndResourceName(bookName, resourceName),
    ]);

    if (!epub || !resource) {
      throw new Error("Resource not found");
    }

    const newEpub = {
      ...epub,
      resources: epub.resources.filter(id => id.toString() !== resource._id.toString()),
      chapters: epub.chapters
        .map(chapter => ({
          ...chapter,
          sections: chapter.sections.filter(id => id.toString() !== resource._id.toString()),
        }))
        .filter(chapter => chapter.sections.length > 0),
      cover: epub.cover?.toString() === resource._id.toString() ? null : epub.cover,
      timeUpdated: new Date(),
    };

    await Promise.all([
      epubCollection.updateOne({ bookName }, { $set: newEpub }),
      epubResourceCollection.deleteOne({ _id: resource._id }),
    ]);
  });
};

export const loadEpubCached = cache(loadEpub);
export const loadEpubsCached = cache(loadEpubs);
