"use client";

import { Button, ButtonProps } from "@nextui-org/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type LinkButtonProps = ButtonProps & {
  href?: string;
};

export const LinkButton = ({ href, ...props }: LinkButtonProps) => {
  const router = useRouter();
  const onClick = href ? () => router.push(href) : undefined;

  return (
    <>
      {href && <Link className="hidden" href={href}></Link>}
      <Button {...props} onClick={onClick} />
    </>
  );
};
