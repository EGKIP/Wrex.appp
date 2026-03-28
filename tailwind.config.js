/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#1a1f3a",
        accent: "#FFD93D",
        "accent-dark": "#F6C90E",
        charcoal: "#2D3748",
        mist: "#F8F9FA",
        "border-base": "#E2E8F0",
        "hover-bg": "#F1F5F9",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6",
      },
      boxShadow: {
        soft: "0 1px 3px rgba(0,0,0,0.06)",
        "soft-md": "0 4px 12px rgba(0,0,0,0.10)",
        "soft-lg": "0 8px 32px rgba(0,0,0,0.12)",
        card: "0 2px 8px rgba(0,0,0,0.08)",
      },
      borderRadius: {
        soft: "0.75rem",
        card: "0.75rem",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        hero: ["3rem", { lineHeight: "1.2", fontWeight: "700" }],
      },
    },
  },
  plugins: [],
};
