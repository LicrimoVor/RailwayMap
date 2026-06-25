/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        panel: "0 18px 45px rgba(30, 33, 38, 0.14)"
      }
    }
  },
  plugins: []
};
