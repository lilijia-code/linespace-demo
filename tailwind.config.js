/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Fraunces", "Georgia", "serif"],
      },
      colors: {
        paper: "#fbfaf8",
        ink: "#17181d",
        muted: "#717680",
        line: "#ebe6df",
        blush: "#ff385c",
        mist: "#f4f0ec",
        cobalt: "#3157d5",
        tide: "#0f8c83",
        saffron: "#95660c",
      },
      boxShadow: {
        soft: "0 16px 38px rgba(24, 18, 14, 0.08)",
        lift: "0 22px 55px rgba(24, 18, 14, 0.12)",
      },
    },
  },
  plugins: [],
};
