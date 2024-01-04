import { mongodbDbName, mongodbDirectConnection, mongodbUrl } from "@/config/env";
import { EpubMongo, EpubResourceMongo } from "@/types/epub/epub.mongo";
import { GridFSBucket, MongoClient } from "mongodb";

const mongoClient = new MongoClient(mongodbUrl, {
  directConnection: mongodbDirectConnection,
});

export const connectPromise = mongoClient.connect().catch(console.error);

const db = mongoClient.db(mongodbDbName);

export const withMongoSession = async <T>(callback: () => Promise<T>) => {
  const session = mongoClient.startSession();
  try {
    return await session.withTransaction(callback);
  } finally {
    session.endSession();
  }
};

export const epubCollection = db.collection<EpubMongo>("epub");
export const epubResourceCollection = db.collection<EpubResourceMongo>("epubResource");
export const bucket = new GridFSBucket(db);

export const closeConnection = () => mongoClient.close();

mongoClient.on("open", () => {
  epubCollection.createIndex({ bookName: 1 }, { unique: true });
  epubCollection.createIndex({ order: 1 });
  epubResourceCollection.createIndex({ savePath: 1 });
});
