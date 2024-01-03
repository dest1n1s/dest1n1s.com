import { noError } from "@/lib/utils/common";
import { R_OK } from "constants";
import { access, readFile } from "fs/promises";
import { join } from "path";

export async function GET(
  request: Request,
  { params: { bookName, imageName } }: { params: { bookName: string; imageName: string } },
) {
  const path = join("data", "novels", bookName, "images", imageName);
  // Check if the image exists
  if (!(await noError(access(path, R_OK)))) {
    return new Response("Image not found", { status: 404 });
  }

  // Read the file and return it
  const file = await readFile(join("data", "novels", bookName, "images", imageName));

  // Determine the content type
  const ext = imageName.split(".").pop();
  const contentType = ext === "png" ? "image/png" : "image/jpeg";

  return new Response(file, {
    headers: {
      "content-type": contentType,
    },
  });
}
