import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        display: ["ClashDisplay", "System"],
        sans: ["Inter", "System"],
      },
      colors: {
        /* Pulse Dark Mode (always-dark on mobile) */
        background: "#060B14",
        foreground: "#F0F4F8",
        primary: {
          DEFAULT: "#0077FF",
          foreground: "#FFFFFF",
          light: "rgba(0, 119, 255, 0.1)",
        },
        secondary: {
          DEFAULT: "#10B981",
          foreground: "#FFFFFF",
        },
        accent: {
          DEFAULT: "#1A2340",
          foreground: "#F0F4F8",
        },
        warning: {
          DEFAULT: "#F59E0B",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#243052",
          foreground: "#8899B4",
        },
        card: {
          DEFAULT: "#0F1629",
          foreground: "#F0F4F8",
        },
        popover: {
          DEFAULT: "#1A2340",
          foreground: "#F0F4F8",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        success: {
          DEFAULT: "#10B981",
          foreground: "#FFFFFF",
        },
        border: {
          DEFAULT: "#1E2B47",
          subtle: "#152035",
        },
        input: "#1E2B47",
        ring: "#0077FF",
        "text-secondary": "#8899B4",
        "text-tertiary": "#4E6180",
        "pr-gold": "#FFD700",
        "streak-orange": "#FF6B2C",
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "4px",
        pill: "24px",
      },
    },
  },
  plugins: [],
} satisfies Config;
