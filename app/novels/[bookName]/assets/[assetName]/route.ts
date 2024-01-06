import { retrieveResourceWithBookNameAndResourceName } from "@/lib/novel/epub.server";

export const revalidate = "force-cache";

export async function GET(
  request: Request,
  { params: { bookName, assetName } }: { params: { bookName: string; assetName: string } },
) {
  const resource = await retrieveResourceWithBookNameAndResourceName(bookName, assetName);

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
