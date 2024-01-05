"use client";

import { Input } from "@nextui-org/react";
import { useRouter } from "next/navigation";
import { FaSearchengin } from "react-icons/fa6";

const placeholderList = [
  "CRYCHICを やめさせていただきます",
  "私は バンド 楽しいっておもったこと 一度もない",
  "じゃ……一生 バンドしてくれる？",
  "そよさん Love",
  "ボーカル必死過ぎ。",
  "あの…私は？",
  "何で「春日影」やったの！",
  "つまんねー女の子",
  "あなた ご自分のことばかりですのね",
  "伝書鳩にはならない",
  "もう関係ないから",
  "誓いって あんなの嘘だよ",
  "私 いらないんでしょ",
  "もうヤダ バンドなんて やりたくなかった",
  "だったら 私が終わらせてあげる",
  "「春日影」はやらないから",
  "「そよりん」はちょっと嫌かな",
  "嫌だって言ってるよね",
  "いつの間に…",
  "りっきーだよりっきー",
  "私の衣装 切れてる！？",
  "残りの人生 私にくださいませんか",
  "お幸せに",
  "弱い私は もう死にました",
];

export const EpubSearchbar = () => {
  const router = useRouter();
  return (
    <Input
      aria-label="Search"
      classNames={{
        inputWrapper: "bg-default-100",
      }}
      size="lg"
      labelPlacement="outside"
      placeholder={`猜你想搜：${
        placeholderList[Math.floor(Math.random() * placeholderList.length)]
      }`}
      startContent={
        <FaSearchengin className="pointer-events-none flex-shrink-0 text-base text-default-400" />
      }
      type="search"
      onChange={e => {
        const q = e.target.value;
        if (q) {
          router.push(`/novels?q=${q}`);
        } else {
          router.push(`/novels`);
        }
      }}
    />
  );
};
