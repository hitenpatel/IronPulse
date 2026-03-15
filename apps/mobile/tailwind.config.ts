import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "hsl(224 71% 4%)",
        foreground: "hsl(213 31% 91%)",
        primary: {
          DEFAULT: "hsl(210 40% 98%)",
          foreground: "hsl(222.2 47.4% 11.2%)",
        },
        muted: {
          DEFAULT: "hsl(223 47% 11%)",
          foreground: "hsl(215 20% 65%)",
        },
        accent: {
          DEFAULT: "hsl(216 34% 17%)",
          foreground: "hsl(210 40% 98%)",
        },
        card: {
          DEFAULT: "hsl(224 71% 4%)",
          foreground: "hsl(213 31% 91%)",
        },
        border: "hsl(216 34% 17%)",
        destructive: {
          DEFAULT: "hsl(0 63% 31%)",
          foreground: "hsl(210 40% 98%)",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
