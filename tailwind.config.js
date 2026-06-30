/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f7f8f8",
          100: "#eef0f1",
          700: "#344054",
          800: "#1f2937",
          900: "#111827",
        },
        mint: {
          600: "#0f766e",
          700: "#0f5f59",
        },
        amberline: "#d99a2b",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
