/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"]
      },
      colors: {
        brand: {
          50: "#f3f1ff",
          100: "#e5deff",
          500: "#4c2ca7",
          700: "#2f1b74",
          900: "#221154"
        }
      },
      boxShadow: {
        soft: "0 6px 20px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};
