import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        memory: {
          joy: "#ffd700",
          sadness: "#4169e1",
          wonder: "#9370db",
          calm: "#3cb371",
          fear: "#ff6347",
          love: "#ff69b4",
          grief: "#696969",
          anger: "#dc143c",
        },
      },
    },
  },
  plugins: [],
};

export default config;
