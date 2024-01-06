import { closeConnection } from "@/lib/database/database";
import { parseEpub } from "@/lib/novel/epub";
import { saveEpub } from "@/lib/novel/epub.server";
import assert from "assert";

const parsePathToEpub = () => {
  assert(process.argv.length === 3, "Path to epub is required");
  return process.argv[2];
};

const main = async () => {
  const path = parsePathToEpub();
  const epub = await parseEpub(path);
  await saveEpub(epub);
  await closeConnection();
};

main();
