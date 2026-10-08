/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    // Flat design: no shadows, small radii, one palette.
    boxShadow: { none: "none" },
    borderRadius: { none: "0", sm: "2px", DEFAULT: "3px", md: "4px", lg: "4px", full: "9999px" },
    colors: {
      transparent: "transparent",
      current: "currentColor",
      primary: "var(--primary)",
      secondary: "var(--secondary)",
      bg: "var(--bg)",
      surface: "var(--surface)",
      ink: "var(--ink)",
      muted: "var(--muted)",
      line: "var(--line)",
      attention: "var(--attention)",
      "attention-tint": "var(--attention-tint)",
    },
    fontFamily: {
      heading: ["Fraunces", "Georgia", "serif"],
      body: ['"Source Sans 3"', "system-ui", "sans-serif"],
    },
    extend: {},
  },
  plugins: [],
};
