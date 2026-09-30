import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#d9edff",
          200: "#bce0ff",
          300: "#8ecdff",
          400: "#59b0ff",
          500: "#328fff",
          600: "#1b6ff5",
          700: "#1458e1",
          800: "#1747b6",
          900: "#193f8f",
          950: "#142857",
        },
        accent: {
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(50,143,255,0.4)" },
          "70%": { boxShadow: "0 0 0 10px rgba(50,143,255,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(50,143,255,0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "pulse-ring": "pulse-ring 1.6s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
