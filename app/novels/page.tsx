import { EpubUploader } from "@/components/epub-uploader";
import { RemoveNovelButton } from "@/components/remove-novel-button";
import { loadInfosCached } from "@/lib/novel/epub.server";
import { Button, Image, Link } from "@nextui-org/react";

export const dynamic = "force-dynamic";

export default async function Page() {
  const infos = await loadInfosCached();

  const fallbackCover = "https://via.placeholder.com/200x300";

  return (
    <section className="flex flex-col items-center justify-center gap-12 py-8 md:py-10">
      {/* Show cover, title and author for each book */}
      <div className="flex flex-col items-start">
        <div className="flex justify-between w-full items-center pb-4">
          <span className="text-lg font-bold">共 {infos.length} 本</span>
          <EpubUploader />
        </div>
        {infos.map(info => (
          <div
            key={info.bookName}
            className="flex items-center justify-center gap-8 py-4 border-b-1 border-gray-300 border-opacity-30 w-full"
          >
            <Image
              src={info.cover || fallbackCover}
              alt={info.metadata.title}
              width={50}
              height={75}
              fallbackSrc={fallbackCover}
              className="rounded-md"
            />
            <div className="flex flex-col gap-2 grow">
              <h3 className="text-xl font-bold">{info.metadata.title}</h3>
              <p className="text-gray-700">{info.metadata.creator}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Link href={`/novels/${info.bookName}/chapters/1`}>
                <Button size="sm" className="text-sm self-end" color="primary" radius="lg">
                  阅读
                </Button>
              </Link>
              <RemoveNovelButton
                bookName={info.bookName}
                title={info.metadata.title}
                size="sm"
                className="text-sm self-end opacity-0 hover:opacity-100 transition-opacity duration-300"
                color="danger"
                radius="lg"
              >
                删除
              </RemoveNovelButton>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
