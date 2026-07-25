import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
  paper: "var(--color-paper)",
  ink: "var(--color-ink)",
  rule: "var(--color-rule)",
  margin: "var(--color-margin)",
  card: "var(--color-card)",
  muted: "var(--color-muted)",
  border: "var(--color-border)",
},
      fontFamily: {
        display: ["var(--font-space-mono)", "monospace"],
        body: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;