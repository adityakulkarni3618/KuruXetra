import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0F19",
        surface: "#111625",
        card: "#172033",
        border: "#222D47",
        gold: "#D4AF37",
        blue: {
          DEFAULT: "#4682B4", // Steel Blue
          light: "#639ecb",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
    },
  },
  plugins: [],
};
export default config;
