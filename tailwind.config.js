import { nextui } from "@nextui-org/react";
import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      typography: theme => ({
        DEFAULT: {
          css: {
            h1: {
              textAlign: "center",
            },
            h2: {
              textAlign: "center",
            },
            div: {
              width: "100%",
            },
            img: {
              margin: "auto",
              width: "80%",
            },
          },
        },
        sm: {
          css: {
            p: {
              fontSize: theme("fontSize.base"),
            },
          },
        },
      }),
    },
  },
  darkMode: "class",
  plugins: [nextui(), typography],
};
