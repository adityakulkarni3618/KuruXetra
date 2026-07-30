import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B0D12",
        surface: "#12151C",
        card: "#171B24",
        border: "#242938",
        gold: "#D4AF37",
        blue: {
          DEFAULT: "#2F6FED",
          light: "#5B8DFF",
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
