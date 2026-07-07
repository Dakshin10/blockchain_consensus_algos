/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#070b19",
          slate: "#0b1329",
          panel: "rgba(15, 23, 42, 0.55)",
          border: "rgba(255, 255, 255, 0.08)",
          "border-hover": "rgba(255, 255, 255, 0.15)",
        },
        consensus: {
          nakamoto: {
            DEFAULT: "#f59e0b",
            glow: "rgba(245, 158, 11, 0.15)",
          },
          stake: {
            DEFAULT: "#8b5cf6",
            glow: "rgba(139, 92, 246, 0.15)",
          },
          byzantine: {
            DEFAULT: "#06b6d4",
            glow: "rgba(6, 182, 212, 0.15)",
          },
          authority: {
            DEFAULT: "#10b981",
            glow: "rgba(16, 185, 129, 0.15)",
          },
          tee: {
            DEFAULT: "#34d399",
            glow: "rgba(52, 211, 153, 0.15)",
          },
          avalanche: {
            DEFAULT: "#f43f5e",
            glow: "rgba(244, 63, 94, 0.15)",
          },
        },
      },
      fontFamily: {
        sans: ["Outfit", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "panel-glow": "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
      },
      gridTemplateColumns: {
        "16": "repeat(16, minmax(0, 1fr))",
      },
    },
  },
  plugins: [],
}
