import type { Config } from "tailwindcss";

const config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FAFAFB",
        surface: "#FFFFFF",
        surfaceMuted: "#F5F7FA",
        primary: "#5B5BD6",
        primaryHover: "#4F46E5",
        accent: "#7C3AED",
        success: "#10B981",
        textPrimary: "#111827",
        textSecondary: "#6B7280",
        border: "#E5E7EB",
      },
      boxShadow: {
        soft: "0 24px 80px rgba(17, 24, 39, 0.08)",
        glow: "0 20px 60px rgba(91, 91, 214, 0.12)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;

export default config;