/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Pharmacy palette. Named tokens only — feature screens should never
        // reach for a raw Tailwind colour like `blue-600`.
        ink: {
          DEFAULT: "#0B1F3A",
          soft: "#16304F",
          muted: "#5A6B80",
        },
        paper: {
          DEFAULT: "#F7F9F7",
          raised: "#FFFFFF",
          sunken: "#EEF2EF",
        },
        "rx-amber": {
          DEFAULT: "#B5651D",
          soft: "#F3E4D4",
          deep: "#8E4E14",
        },
        mint: {
          DEFAULT: "#2F9E82",
          soft: "#DEF0EA",
        },
        alert: {
          DEFAULT: "#C1443C",
          soft: "#F8E2E0",
        },
        mist: {
          DEFAULT: "#DCE4E2",
          deep: "#C3CFCC",
        },
      },
      fontFamily: {
        // Restrained display face — page titles and section headers only.
        display: ['"Fraunces"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        // Prices, SKUs, batch numbers, dosages, quantities, timestamps.
        mono: ['"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        micro: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.08em" }],
      },
      boxShadow: {
        card: "0 1px 2px rgba(11, 31, 58, 0.04), 0 4px 12px rgba(11, 31, 58, 0.06)",
        raised: "0 8px 30px rgba(11, 31, 58, 0.12)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.6)",
      },
      borderRadius: {
        label: "0.25rem",
      },
      backgroundImage: {
        // The perforated top edge of a prescription label. Half-circles punched
        // out of the card's own background colour.
        perforation:
          "radial-gradient(circle at 5px -1px, transparent 4px, currentColor 4px)",
      },
      backgroundSize: {
        perforation: "10px 6px",
      },
      keyframes: {
        "receipt-print": {
          "0%": { transform: "translateY(-14px) scaleY(0.96)", opacity: "0" },
          "60%": { transform: "translateY(2px) scaleY(1)", opacity: "1" },
          "100%": { transform: "translateY(0) scaleY(1)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
      animation: {
        // The one place the motion budget is spent: confirming a sale.
        "receipt-print": "receipt-print 420ms cubic-bezier(0.2, 0.9, 0.3, 1) both",
        "fade-in": "fade-in 160ms ease-out both",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
}
