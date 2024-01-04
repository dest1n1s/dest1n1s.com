import { mongodbDbName, mongodbDirectConnection, mongodbUrl } from "@/config/env";
import { EpubMongo, EpubResourceMongo } from "@/types/epub/epub.mongo";
import { GridFSBucket, MongoClient } from "mongodb";

const client = new MongoClient(mongodbUrl, {
  directConnection: mongodbDirectConnection,
});

export const connectPromise = client.connect().catch(console.error);

const db = client.db(mongodbDbName);

export const epubCollection = db.collection<EpubMongo>("epub");
export const epubResourceCollection = db.collection<EpubResourceMongo>("epubResource");
export const bucket = new GridFSBucket(db);

export const closeConnection = () => client.close();

client.on("open", () => {});
