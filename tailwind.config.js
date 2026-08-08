/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--color-paper) / <alpha-value>)",
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        brand: "rgb(var(--color-brand) / <alpha-value>)",
        taupe: "rgb(var(--color-taupe) / <alpha-value>)",
        parchment: "rgb(var(--color-parchment) / <alpha-value>)",
        // Compatibility aliases. New components should use the semantic names above.
        navy: "rgb(var(--color-ink) / <alpha-value>)",
        "navy-light": "rgb(var(--color-brand) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",
        "accent-dark": "rgb(var(--color-accent-strong) / <alpha-value>)",
        charcoal: "rgb(var(--color-muted) / <alpha-value>)",
        mist: "rgb(var(--color-surface-muted) / <alpha-value>)",
        canvas: "rgb(var(--color-paper) / <alpha-value>)",
        "border-base": "rgb(var(--color-line) / <alpha-value>)",
        "hover-bg": "rgb(var(--color-surface-muted) / <alpha-value>)",
        success: "rgb(var(--color-success) / <alpha-value>)",
        warning: "rgb(var(--color-warning) / <alpha-value>)",
        danger: "rgb(var(--color-danger) / <alpha-value>)",
        info: "rgb(var(--color-info) / <alpha-value>)",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        "soft-md": "var(--shadow-raised)",
        button: "none",
        "button-hover": "none",
        card: "var(--shadow-soft)",
        "card-hover": "var(--shadow-raised)",
        glow: "none",
        glass: "var(--shadow-soft)",
        float: "var(--shadow-raised)",
      },
      borderRadius: {
        soft: "var(--radius-control)",
        card: "var(--radius-panel)",
        modal: "var(--radius-dialog)",
        input: "var(--radius-control)",
        score: "var(--radius-panel)",
      },
      fontFamily: {
        sans: ["Outfit", "ui-sans-serif", "system-ui", "sans-serif"],
        heading: ["Fraunces", "ui-serif", "Georgia", "serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        hero: ["3.5rem", { lineHeight: "1.15", fontWeight: "800" }],
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "float-smooth": "floatSmooth 5s cubic-bezier(0.45,0.05,0.55,0.95) infinite",
        "fade-in-up": "fadeInUp 0.6s cubic-bezier(0.4,0,0.2,1) forwards",
        shimmer: "shimmer 2s infinite",
        "pulse-once": "pulseOnce 1.5s ease-in-out 1",
        "fade-in": "fadeIn 0.2s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "rotate(3deg) translateY(0px)" },
          "50%": { transform: "rotate(3deg) translateY(-12px)" },
        },
        floatSmooth: {
          "0%":   { transform: "translateY(0px) scale(1)" },
          "30%":  { transform: "translateY(-10px) scale(1.008)" },
          "60%":  { transform: "translateY(-16px) scale(1.012)" },
          "80%":  { transform: "translateY(-8px) scale(1.005)" },
          "100%": { transform: "translateY(0px) scale(1)" },
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

      },
    },
  },
  plugins: [],
};
