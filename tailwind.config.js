/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#1A1F3A",
        accent: "#FFD93D",
        charcoal: "#2D3748",
        mist: "#F7FAFC",
      },
      boxShadow: {
        soft: "0 18px 50px -28px rgba(26, 31, 58, 0.22)",
      },
      borderRadius: {
        soft: "1.25rem",
      },
      fontFamily: {
        sans: ["Satoshi", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
