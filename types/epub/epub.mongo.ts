import { ObjectId, WithId } from "mongodb";
import { Epub, EpubResource } from "./epub";

export type EpubMongo = Omit<Epub, "resources"> & {
  resources: ObjectId[];
};

export type EpubResourceMongo = EpubResource;

export type EpubResourceNoContent = Omit<EpubResource, "content">;
export type EpubNoContent = Omit<Epub, "resources"> & {
  resources: WithId<EpubResourceNoContent>[];
};
