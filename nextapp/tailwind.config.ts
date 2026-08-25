import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#050505",
        panel: "#0b0b0d",
        line: "rgba(255,255,255,0.08)",
        silver: "#9ba1ab",
        mist: "#c7ccd4",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-manrope)", "Inter", "sans-serif"],
      },
      letterSpacing: { widest2: "0.28em" },
    },
  },
  plugins: [],
};
export default config;
