import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "beri-navy": "#0B1A3B",
        "beri-navy-light": "#122552",
        "beri-navy-mid": "#1A3068",
        "beri-blue": "#2B4A8E",
        "beri-blue-light": "#4A6DB5",
        "beri-gold": "#D4A843",
        "beri-gold-light": "#E8C96A",
        "beri-white": "#F0F2F7",
        "beri-white-soft": "#B8BDD0",
        "beri-surface": "#0E1F45",
        "beri-user-bubble": "#1C3A6E",
        "beri-error": "#E85454",
        "beri-success": "#4ADE80",
      },
      fontFamily: {
        sans: ["DM Sans", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "blink": "blink 1s step-end infinite",
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { transform: "translateY(8px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
