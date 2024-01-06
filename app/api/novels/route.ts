import { parseEpub } from "@/lib/novel/epub";
import { saveEpub } from "@/lib/novel/epub.server";
import { writeFile } from "fs/promises";
import { revalidatePath } from "next/cache";
import { fileSync } from "tmp";

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  try {
    await Promise.all(
      formData.getAll("files").map(async file => {
        if (file instanceof File) {
          const { name: tempPath, removeCallback } = fileSync();
          console.log(`Uploading ${file.name} to ${tempPath}`);
          await writeFile(tempPath, Buffer.from(await file.arrayBuffer()));
          const epub = await parseEpub(tempPath);
          await saveEpub(epub);
          console.log(
            `Uploaded ${epub.metadata.title} by ${epub.metadata.creator} (${epub.metadata.language})`,
          );
          removeCallback();
        }
      }),
    );
  } catch (error: any) {
    console.error(error.stack);
    if (error instanceof Error) {
      return new Response(error.message, { status: 400 });
    }
    return new Response(error, { status: 400 });
  }
  revalidatePath("/novels");
  return new Response();
}
