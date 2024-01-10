import { siteConfig } from "@/config/site";
import Link from "next/link";

export const NavigationDrawer = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-4 px-4 lg:px-8 w-full">
      <div className="w-full flex flex-col gap-1">
        <h3 className="text-xl text-center font-bold">Dest1n1</h3>
      </div>
      <div className="w-full text-default-800 flex flex-col gap-1">
        {siteConfig.navItems.map(item => (
          <div key={item.href} className={"border-b border-divider py-2 border-opacity-30 w-full"}>
            <Link href={item.href}>{item.label}</Link>
          </div>
        ))}
      </div>
    </div>
  );
};
