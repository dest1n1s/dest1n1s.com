import { Drawer } from "@/components/layout/drawer";
import { Main } from "@/components/layout/main";
import { Navbar } from "@/components/layout/navbar";
import { fontSans } from "@/config/fonts";
import { siteConfig } from "@/config/site";
import { auth } from "@/lib/auth";
import "@/styles/globals.css";
import clsx from "clsx";
import { Metadata, Viewport } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewports: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default async function Layout({
  children,
  drawer,
}: {
  children: React.ReactNode;
  drawer?: React.ReactNode;
}) {
  const session = await auth();
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={clsx("min-h-screen bg-background font-sans antialiased", fontSans.variable)}>
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }} session={session}>
          <div className="relative flex h-screen w-screen">
            <Navbar />
            <Main>
              <main className="container mx-auto max-w-7xl flex-grow px-6 pt-6">{children}</main>
              <footer className="flex w-full items-center justify-center py-3"></footer>
            </Main>
            <Drawer>{drawer}</Drawer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
