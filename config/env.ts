export const mongodbUrl = process.env.MONGODB_URL || "mongodb://localhost:27017";
export const mongodbDbName = process.env.MONGODB_DB_NAME || "mongo";
export const mongodbDirectConnection = process.env.MONGODB_DIRECT_CONNECTION === "true";
