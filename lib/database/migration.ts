import { readdir } from "fs/promises";
import { Db, MongoClient } from "mongodb";

export const migrationUp = async (db: Db, client: MongoClient) => {
  const migrationFileNames = (await readdir("migrations")).filter(file => {
    return file.match(/^\d+-[a-zA-Z0-9_]+\.ts$/);
  });
  const maxOrder = Math.max(...migrationFileNames.map(file => parseInt(file.split("-")[0])));
  const migrationInfo = await db.collection<{ order: number }>("migrations").find().next();
  if (!migrationInfo) {
    await db.collection("migrations").insertOne({ order: maxOrder });
    return;
  }
  const { order } = migrationInfo;
  const migrationFileNamesToRun = migrationFileNames
    .filter(file => {
      const fileOrder = parseInt(file.split("-")[0]);
      return fileOrder > order;
    })
    .sort((a, b) => {
      const aOrder = parseInt(a.split("-")[0]);
      const bOrder = parseInt(b.split("-")[0]);
      return aOrder - bOrder;
    });

  const migrations = await Promise.all(
    migrationFileNamesToRun.map(async file => {
      return [file, await import(`@/migrations/${file}`)];
    }),
  );

  for (const [fileName, migration] of migrations) {
    const session = client.startSession();
    try {
      return await session.withTransaction(async () => {
        await migration.up(db, client);
        await db.collection("migrations").insertOne({ fileName: fileName });
        console.log("Successfully migrated:", fileName);
      });
    } finally {
      session.endSession();
    }
  }
};
