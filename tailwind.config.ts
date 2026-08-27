import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        dps: {
          green: "#0B5345",
          "green-dark": "#073B31",
          "green-light": "#117A65",
          gold: "#D4AC0D",
          "gold-light": "#F7DC6F",
          navy: "#1A252F",
          cream: "#FBF9F4",
        },
      },
    },
  },
  plugins: [],
};
export default config;
