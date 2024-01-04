import { noError } from "@/lib/utils/common";
import { R_OK } from "constants";
import { access, readFile } from "fs/promises";
import { join } from "path";

export const revalidate = "force-cache";

export async function GET(
  request: Request,
  { params: { bookName, assetName } }: { params: { bookName: string; assetName: string } },
) {
  const path = join("data", "novels", bookName, "assets", assetName);
  // Check if the image exists
  if (!(await noError(access(path, R_OK)))) {
    return new Response("Asset not found", { status: 404 });
  }

  const ext = assetName.split(".").slice(-1)[0];
  const encoding = ext === "xhtml" ? "utf-8" : null;
  const contentType = (() => {
    switch (ext) {
      case "xhtml":
      case "html":
        return "text/html";
      case "css":
        return "text/css";
      case "png":
        return "image/png";
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "svg":
        return "image/svg+xml";
      default:
        return "text/plain";
    }
  })();

  // Read the file and return it
  const file = await readFile(join("data", "novels", bookName, "assets", assetName), { encoding });

  return new Response(file, {
    headers: {
      "content-type": contentType,
    },
  });
}
