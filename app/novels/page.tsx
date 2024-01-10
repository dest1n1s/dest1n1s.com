import { LinkButton } from "@/components/common/link-button";
import { EpubSearchbar } from "@/components/ui/epub-searchbar";
import { EpubUploader } from "@/components/ui/epub-uploader";
import { RemoveNovelButton } from "@/components/ui/remove-novel-button";
import { computeEpubResourceUrl } from "@/lib/novel/epub";
import { loadEpubsCached } from "@/lib/novel/epub.server";
import { Button, Image } from "@nextui-org/react";
import { FaArrowDown } from "react-icons/fa6";
import { handleSwapOrder } from "./actions";

export default async function Page({ searchParams: { q } }: { searchParams: { q?: string } }) {
  const epubs = await loadEpubsCached(q);

  const fallbackCover = "https://via.placeholder.com/200x300";

  return (
    <section className="flex flex-col items-center justify-center gap-12 py-8 md:py-10">
      {/* Show cover, title and author for each book */}
      <div className="flex flex-col items-start w-full lg:w-[600px] xl:w-[720px]">
        <div className="flex justify-between w-full items-center pb-8">
          <EpubSearchbar />
        </div>
        <div className="flex justify-between w-full items-center pb-4">
          <span className="text-lg font-bold">共 {epubs.length} 本</span>
          <EpubUploader />
        </div>
        {epubs.map((epub, i) => (
          <>
            <div
              key={epub.bookName}
              className="flex items-center justify-center gap-6 py-4 border-b-1 border-divider border-opacity-30 w-full"
            >
              <div className="shrink-0">
                <Image
                  src={
                    epub.cover
                      ? computeEpubResourceUrl(epub.bookName, epub.cover.resourceName)
                      : fallbackCover
                  }
                  alt={epub.metadata.title}
                  width={50}
                  height={75}
                  fallbackSrc={fallbackCover}
                  className="rounded-md"
                />
              </div>
              <div className="flex flex-col gap-2 grow shrink">
                <h3 className="text-xl font-bold px-2">{epub.metadata.title}</h3>
                <p>
                  <span className="text-default-700 px-2">{epub.metadata.creator}</span>
                  <span className="hidden lg:inline-block text-default-600 px-2 border-l-1 border-divider border-opacity-30">
                    {epub.timeCreated.toISOString() === epub.timeUpdated.toISOString()
                      ? "创建于"
                      : "修改于"}{" "}
                    {epub.timeUpdated.toISOString().split("T")[0]}
                  </span>
                </p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <LinkButton
                  size="sm"
                  className="text-sm self-end"
                  color="primary"
                  radius="lg"
                  href={`/novels/${epub.bookName}/chapters/1`}
                >
                  阅读
                </LinkButton>
                <RemoveNovelButton
                  bookName={epub.bookName}
                  title={epub.metadata.title}
                  size="sm"
                  className="text-sm self-end opacity-0 hover:opacity-100 transition-opacity duration-300"
                  color="danger"
                  radius="lg"
                >
                  删除
                </RemoveNovelButton>
              </div>
            </div>

            {i < epubs.length - 1 && (
              <form
                action={handleSwapOrder.bind(null, epub.bookName).bind(null, epubs[i + 1].bookName)}
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
