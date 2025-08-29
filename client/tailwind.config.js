module.exports = {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#F6F3EA',
        panel: '#FFFFFF',
        sage: '#A7C7A9',
        teal: '#558B7C',
        rust: '#D88A4A',
        'text-deep': '#3E3328',
        muted: '#9A8F85',
      },
      fontFamily: {
        inter: ["Inter", "system-ui", "sans-serif"],
        lora: ["Lora", "serif"],
      },
      fontSize: {
        // Convert px to rem based on 16px root font size
        body: ['1rem', '1.45'],       // 16px
        small: ['0.875rem', '1.4'],    // 14px
        h1: ['1.75rem', '1.25'],       // 28px
        h2: ['1.375rem', '1.3'],       // 22px
      },
      borderRadius: {
        panel: '10px',
      },
      boxShadow: {
        subtle: '0 6px 12px rgba(50,40,30,0.06)',
      },
    },
    screens: {
      'md': '768px',
    },
  },
  plugins: [],
};
