import { mongodbDbName, mongodbDirectConnection, mongodbUrl } from "@/config/env";
import { EpubMongo, EpubResourceMongo } from "@/types/epub/epub.mongo";
import { GridFSBucket, MongoClient } from "mongodb";
import { migrationUp } from "./migration";

const mongoClient = new MongoClient(mongodbUrl, {
  directConnection: mongodbDirectConnection,
});

const db = mongoClient.db(mongodbDbName);

export const mongoConnectPromise = mongoClient
  .connect()
  .then(client => migrationUp(db, client))
  .catch(console.error);

export const withMongoSession = async <T>(callback: () => Promise<T>) => {
  await mongoConnectPromise;
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

mongoClient.on("open", async () => {
  epubCollection.createIndex({ bookName: 1 }, { unique: true });
  epubCollection.createIndex({ order: 1 });
  epubResourceCollection.createIndex({ resourceName: 1 });
});
