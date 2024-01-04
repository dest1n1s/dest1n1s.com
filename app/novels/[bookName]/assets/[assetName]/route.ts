import { retrieveResourceWithBookNameAndSavePath } from "@/lib/novel/epub";
import { join } from "path";

export const revalidate = "force-cache";

export async function GET(
  request: Request,
  { params: { bookName, assetName } }: { params: { bookName: string; assetName: string } },
) {
  const path = join("novels", bookName, "assets", assetName);

  const resource = await retrieveResourceWithBookNameAndSavePath(bookName, path);

  if (!resource) {
    return new Response("Asset not found", { status: 404 });
  }

  const content = resource.mediaType.startsWith("image/")
    ? Buffer.from(resource.content, "base64")
    : resource.content;

  const response = new Response(content, {
    headers: {
      "content-type": resource.mediaType,
    },
  });

  return response;
}
