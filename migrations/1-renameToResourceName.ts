import { Db, MongoClient, ObjectId } from "mongodb";

export const up = async (db: Db, client: MongoClient) => {
  const epubResourceCollection = db.collection<{ _id: ObjectId; savePath: string }>("epubResource");
  const resources = await epubResourceCollection
    .find()
    .project<{ _id: ObjectId; savePath: string }>({ _id: 1, savePath: 1 })
    .toArray();

  for (const resource of resources) {
    epubResourceCollection.updateOne(
      { _id: resource._id },
      {
        $set: {
          resourceName: resource.savePath.split("/").slice(-1)[0],
        },
        $unset: {
          savePath: "",
        },
      },
    );
  }
};
