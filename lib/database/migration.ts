import { readdir } from "fs/promises";
import { Db, MongoClient } from "mongodb";

export const migrationUp = async (db: Db, client: MongoClient) => {
  const executedMigrations = (
    await db.collection<{ fileName: string }>("migrations").find().toArray()
  ).map(migration => migration.fileName);
  const migrationFileNames = (await readdir("migrations"))
    .filter(file => {
      return file.match(/^\d+-[a-zA-Z0-9_]+\.ts$/);
    })
    .filter(file => {
      return !executedMigrations.includes(file);
    })
    .sort((a, b) => {
      const orderA = parseInt(a.split("-")[0]);
      const orderB = parseInt(b.split("-")[0]);
      return orderA - orderB;
    });
  const migrations = await Promise.all(
    migrationFileNames.map(async file => {
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
