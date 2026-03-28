/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#0F172A",
        "navy-light": "#1E293B",
        accent: "#FBBF24",
        "accent-dark": "#F59E0B",
        charcoal: "#334155",
        mist: "#F1F5F9",
        canvas: "#FAFAFA",
        "border-base": "#E2E8F0",
        "hover-bg": "#F8FAFC",
        success: "#10B981",
        warning: "#F59E0B",
        danger: "#EF4444",
        info: "#3B82F6",
      },
      boxShadow: {
        soft: "0 0 0 1px rgba(0,0,0,0.02), 0 2px 4px rgba(0,0,0,0.03), 0 8px 16px rgba(0,0,0,0.05)",
        "soft-md": "0 0 0 1px rgba(0,0,0,0.02), 0 8px 16px rgba(0,0,0,0.06), 0 16px 32px rgba(0,0,0,0.08)",
        button: "0 1px 2px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.06)",
        "button-hover": "0 4px 12px rgba(0,0,0,0.08), 0 12px 24px rgba(0,0,0,0.12)",
        card: "0 0 0 1px rgba(0,0,0,0.02), 0 2px 4px rgba(0,0,0,0.03), 0 8px 16px rgba(0,0,0,0.05)",
        "card-hover": "0 12px 24px rgba(0,0,0,0.08), 0 24px 48px rgba(0,0,0,0.06)",
        glow: "0 0 20px rgba(251,191,36,0.3), 0 0 40px rgba(251,191,36,0.15)",
        glass: "0 4px 16px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)",
        float: "0 20px 40px rgba(0,0,0,0.08), 0 40px 80px rgba(0,0,0,0.06)",
      },
      borderRadius: {
        soft: "0.75rem",
        card: "1.25rem",
        modal: "1.5rem",
        input: "0.875rem",
        score: "2rem",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["Outfit", "Inter", "ui-sans-serif", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        hero: ["3.5rem", { lineHeight: "1.15", fontWeight: "800" }],
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "fade-in-up": "fadeInUp 0.6s cubic-bezier(0.4,0,0.2,1) forwards",
        shimmer: "shimmer 2s infinite",
        "pulse-once": "pulseOnce 1.5s ease-in-out 1",
        shine: "shine 0.5s forwards",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "rotate(3deg) translateY(0px)" },
          "50%": { transform: "rotate(3deg) translateY(-12px)" },
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        pulseOnce: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.65" },
        },
        shine: {
          from: { left: "-100%" },
          to: { left: "100%" },
        },
      },
    },
  },
  plugins: [],
};
