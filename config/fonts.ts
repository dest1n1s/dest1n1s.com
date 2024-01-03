import { Fira_Code, Noto_Sans_SC } from "next/font/google";

export const fontSans = Noto_Sans_SC({
  subsets: ["cyrillic", "latin", "vietnamese", "latin-ext"],
  variable: "--font-sans",
});

export const fontMono = Fira_Code({
  subsets: ["latin"],
  variable: "--font-mono",
});
