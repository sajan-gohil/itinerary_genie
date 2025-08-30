module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#c6d7b9',
        panel: '#ee6f68',
        sage: '#5e8d5a',
        teal: '#558b7c',
        rust: '#f68f3c',
        'text-deep': '#4A403A',
        muted: '#B0A89F',
      },
      borderRadius: {
        panel: '6px',
      },
      boxShadow: {
        subtle: '0 4px 8px rgba(50,40,30,0.08)',
      },
    },
    // screens: {
    //   md: '768px',
    // },
  },
  plugins: [],
};
