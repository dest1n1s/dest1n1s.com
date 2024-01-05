"use client";

import {
  Input,
  Kbd,
  Link,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Navbar as NextUINavbar,
  link as linkStyles,
} from "@nextui-org/react";

import { siteConfig } from "@/config/site";
import clsx from "clsx";
import NextLink from "next/link";

import { LayoutContext } from "@/app/providers";
import { ThemeSwitch } from "@/components/ui/theme-switch";
import { useContext, useEffect } from "react";
import { FaBars, FaBarsStaggered, FaGithub, FaSearchengin } from "react-icons/fa6";
import { IconSwitch } from "../common/icon-switch";

export const Navbar = () => {
  const { showDrawer, setShowDrawer, showNavbar, hasDrawer } = useContext(LayoutContext);

  useEffect(() => {
    if (!hasDrawer) {
      setShowDrawer(false);
    }
  }, [hasDrawer, setShowDrawer]);

  const searchInput = (
    <Input
      aria-label="Search"
      classNames={{
        inputWrapper: "bg-default-100",
        input: "text-sm",
      }}
      endContent={
        <Kbd className="hidden lg:inline-block" keys={["command"]}>
          K
        </Kbd>
      }
      labelPlacement="outside"
      placeholder="これ、いらないから"
      startContent={
        <FaSearchengin className="pointer-events-none flex-shrink-0 text-base text-default-400" />
      }
      type="search"
    />
  );

  return (
    <NextUINavbar
      className={clsx(
        "fixed transition-all duration-300 ease-in-out w-auto max-w-[100vw]",
        showDrawer && "right-64 lg:right-80",
        !showNavbar && "-top-16",
      )}
      classNames={{
        wrapper: "pl-0 pr-0 gap-0",
      }}
    >
      <div className="w-6 min-w-0" />

      <NavbarContent className="basis-1/5 sm:basis-full overflow-hidden min-w-0" justify="start">
        <NavbarBrand as="li" className="max-w-fit gap-3">
          <NextLink className="flex items-center justify-start gap-1" href="/">
            <p className="font-bold text-inherit">Dest1n1</p>
          </NextLink>
        </NavbarBrand>
        <ul className="ml-2 hidden justify-start gap-4 lg:flex">
          {siteConfig.navItems.map(item => (
            <NavbarItem key={item.href}>
              <NextLink
                className={clsx(
                  linkStyles({ color: "foreground" }),
                  "data-[active=true]:font-medium data-[active=true]:text-primary",
                )}
                color="foreground"
                href={item.href}
              >
                {item.label}
              </NextLink>
            </NavbarItem>
          ))}
        </ul>
      </NavbarContent>

      <div className="w-4 shrink-0" />

      <NavbarContent className="basis-1 sm:basis-full" justify="end">
        <Link isExternal href={siteConfig.links.github} aria-label="Github">
          <FaGithub className="text-default-500" size={22} />
        </Link>
        <ThemeSwitch />
        <NavbarItem className="hidden lg:flex">{searchInput}</NavbarItem>
        <IconSwitch
          active={showDrawer}
          onActiveChange={setShowDrawer}
          isDisabled={!hasDrawer}
          ariaLabel="Show drawer"
          activeIcon={<FaBars size={22} />}
          inactiveIcon={<FaBarsStaggered size={22} />}
        />
      </NavbarContent>

      <div className="w-6 shrink-0" />
    </NextUINavbar>
  );
};
