import { mkdir, writeFile } from "fs/promises";
import { sep } from "path";
import { Stream } from "stream";

export const sanitizeFilename = (str: string, replacement: string = "_") => {
  const illegalRe = /[\/\?<>\\:\*\|\. "]/g;
  const controlRe = /[\x00-\x1f\x80-\x9f]/g;
  const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;

  const sanitized = str
    .replace(illegalRe, replacement)
    .replace(controlRe, replacement)
    .replace(windowsReservedRe, replacement);
  return sanitized;
};

export const writeFileSafe = async (
  path: string,
  content:
    | string
    | NodeJS.ArrayBufferView
    | Iterable<string | NodeJS.ArrayBufferView>
    | AsyncIterable<string | NodeJS.ArrayBufferView>
    | Stream,
) => {
  const dir = path.split(sep).slice(0, -1).join(sep);
  await mkdir(dir, { recursive: true });
  await writeFile(path, content);
};
