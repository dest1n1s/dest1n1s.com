import { removeEpub } from "@/lib/novel/epub";

export async function DELETE(
  request: Request,
  { params: { bookName } }: { params: { bookName: string } },
): Promise<Response> {
  await removeEpub(bookName);
  return new Response();
}
