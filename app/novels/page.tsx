import { EpubSearchbar } from "@/components/epub-searchbar";
import { EpubUploader } from "@/components/epub-uploader";
import { RemoveNovelButton } from "@/components/remove-novel-button";
import { loadInfosCached } from "@/lib/novel/epub.server";
import { Button, Image, Link } from "@nextui-org/react";
import { FaArrowDown } from "react-icons/fa6";
import { handleSwapOrder } from "./actions";

export default async function Page({ searchParams: { q } }: { searchParams: { q?: string } }) {
  const infos = await loadInfosCached(q);

  const fallbackCover = "https://via.placeholder.com/200x300";

  return (
    <section className="flex flex-col items-center justify-center gap-12 py-8 md:py-10">
      {/* Show cover, title and author for each book */}
      <div className="flex flex-col items-start w-full lg:w-[600px] xl:w-[720px]">
        <div className="flex justify-between w-full items-center pb-8">
          <EpubSearchbar />
        </div>
        <div className="flex justify-between w-full items-center pb-4">
          <span className="text-lg font-bold">共 {infos.length} 本</span>
          <EpubUploader />
        </div>
        {infos.map((info, i) => (
          <>
            <div
              key={info.bookName}
              className="flex items-center justify-center gap-6 py-4 border-b-1 border-gray-300 border-opacity-30 w-full"
            >
              <div className="shrink-0">
                <Image
                  src={info.cover || fallbackCover}
                  alt={info.metadata.title}
                  width={50}
                  height={75}
                  fallbackSrc={fallbackCover}
                  className="rounded-md"
                />
              </div>
              <div className="flex flex-col gap-2 grow shrink">
                <h3 className="text-xl font-bold px-2">{info.metadata.title}</h3>
                <p>
                  <span className="text-gray-700 px-2">{info.metadata.creator}</span>
                  <span className="hidden lg:inline-block text-gray-600 px-2 border-l-1 border-gray-300 border-opacity-30">
                    添加于 {info.timeCreated.toISOString().split("T")[0]}
                  </span>
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
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

            {i < infos.length - 1 && (
              <form
                action={handleSwapOrder.bind(null, info.bookName).bind(null, infos[i + 1].bookName)}
                className="hidden lg:flex w-full justify-center"
              >
                <Button
                  className="transition-opacity duration-300 ease-in-out opacity-0 hover:opacity-60 -my-6 z-[10]"
                  color="primary"
                  variant="bordered"
                  radius="full"
                  isIconOnly
                  type="submit"
                >
                  <FaArrowDown />
                </Button>
              </form>
            )}
          </>
        ))}
      </div>
    </section>
  );
}
