/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf9",
          100: "#e6f6f2",
          200: "#b3e8dd",
          300: "#80dac8",
          500: "#14a38b",
          600: "#0f8e79",
          700: "#0e7c7b",
          800: "#0b5e5d",
          900: "#0b2e2d",
        },
        accent: "#16a34a",
        ink: "#0f2a2a",
        text: "#334155",
        muted: "#64748b",
        line: "#e2e8f0",
        surface: "#ffffff",
        canvas: "#f7fbfa",
        attention: "#dc2626",
        "attention-tint": "#fef2f2",
        "amber-tint": "#fffbeb",
        "amber-text": "#92400e",
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        tamil: ['"Noto Sans Tamil"', "Inter", "sans-serif"],
        devanagari: ['"Noto Sans Devanagari"', "Inter", "sans-serif"],
        telugu: ['"Noto Sans Telugu"', "Inter", "sans-serif"],
        kannada: ['"Noto Sans Kannada"', "Inter", "sans-serif"],
        malayalam: ['"Noto Sans Malayalam"', "Inter", "sans-serif"],
      },
      fontSize: {
        display: ["2.5rem", { lineHeight: "3rem", fontWeight: "700", letterSpacing: "-0.02em" }],
        "display-sm": ["2rem", { lineHeight: "2.5rem", fontWeight: "700", letterSpacing: "-0.02em" }],
        h1: ["1.75rem", { lineHeight: "2.25rem", fontWeight: "700" }],
        h2: ["1.25rem", { lineHeight: "1.75rem", fontWeight: "600" }],
        h3: ["1rem", { lineHeight: "1.5rem", fontWeight: "600" }],
        body: ["0.9375rem", { lineHeight: "1.5rem", fontWeight: "400" }],
        small: ["0.8125rem", { lineHeight: "1.25rem", fontWeight: "500" }],
        overline: ["0.75rem", { lineHeight: "1rem", fontWeight: "600", letterSpacing: "0.06em" }],
      },
      borderRadius: {
        card: "12px",
        input: "10px",
        badge: "9999px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04)",
        "card-hover": "0 4px 12px -2px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.04)",
        popover: "0 10px 25px -5px rgba(0,0,0,0.1), 0 4px 10px -6px rgba(0,0,0,0.05)",
      },
      maxWidth: {
        content: "1200px",
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulse: {
          "0%, 100%": { opacity: "0.45" },
          "50%": { opacity: "0.9" },
        },
        dot: {
          "0%, 100%": { opacity: "0.25" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 220ms ease-out",
        pulse: "pulse 1.4s ease-in-out infinite",
        dot: "dot 900ms ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
