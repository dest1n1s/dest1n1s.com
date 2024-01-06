import { removeEpub } from "@/lib/novel/epub.server";
import { revalidatePath } from "next/cache";

export async function DELETE(
  request: Request,
  { params: { bookName } }: { params: { bookName: string } },
): Promise<Response> {
  await removeEpub(bookName);
  revalidatePath("/novels");
  return new Response();
}
