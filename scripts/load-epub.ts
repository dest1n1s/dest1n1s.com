import { closeConnection } from "@/lib/database";
import { parseEpub, saveEpub } from "@/lib/novel/epub";
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
