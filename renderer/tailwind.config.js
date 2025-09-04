const colors = require("tailwindcss/colors");

module.exports = {
  content: [
    "./renderer/pages/**/*.{js,ts,jsx,tsx}",
    "./renderer/components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    colors: {
      // use colors only specified
      white: colors.white,
      gray: colors.gray,
      blue: colors.blue,
      red: colors.red,
      green: colors.green,
      yellow: colors.yellow,
      black: colors.black,
      bg_1: "#F9FFFF",
      bg_2: "#F3F3F3",
      text_1: "#615858",
    },
    extend: {},
  },
  plugins: [require("daisyui")],
};
