import { ObjectId, WithId } from "mongodb";
import { Epub, EpubResource } from "./epub";

export type EpubMongo = Epub<ObjectId> & {
  order: number;
  timeCreated: Date;
  timeUpdated: Date;
};

export type EpubResourceMongo = EpubResource;

export type EpubResourceNoContent = Omit<EpubResource, "content">;
export type EpubNoContent = Epub<WithId<EpubResourceNoContent>> & {
  order: number;
  timeCreated: Date;
  timeUpdated: Date;
};
