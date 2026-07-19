module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: "#F4F7FB",
        surface: "#FFFFFF",
        "surface-alt": "#EEF3FA",
        ink: "#0B1E3D",
        "ink-muted": "#5B6E8C",
        azure: "#0F62D6",
        "azure-deep": "#0B3D8C",
        "azure-soft": "#E4EEFC",
        line: "#DCE3EE",
        win: "#0F9D63",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "sans-serif"],
        sans: ['"Inter"', "sans-serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
