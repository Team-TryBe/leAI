import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          // Primary brand colors
          primary: '#2728D2',         // Blue
          'primary-hover': '#1f20a8',  // Darker blue on hover
          'primary-light': '#4547e0',  // Lighter blue
          
          // Dark theme colors
          dark: '#000000',             // Black background
          'dark-card': '#0a0a0a',      // Slightly lighter black for cards
          'dark-border': '#1a1a1a',    // Subtle border
          'dark-hover': '#141414',     // Hover state for dark elements
          
          // Text colors
          text: '#FFFFFF',             // White primary text
          'text-muted': '#a3a3a3',     // Gray muted text
          'text-light': '#e5e5e5',     // Light gray text
          
          // Accent colors
          accent: '#2728D2',           // Blue accent (same as primary)
          'accent-hover': '#1f20a8',   // Darker blue accent on hover
          
          // Status colors
          success: '#10b981',
          error: '#ef4444',
          
          // Secondary palette (grays and blues)
          secondary: {
            50: '#f0f0ff',
            100: '#e0e0ff',
            300: '#4547e0',
            400: '#3738d8',
            500: '#2728D2',
            600: '#1f20a8',
            700: '#181984',
            800: '#111370',
            900: '#0a0a3d',
            950: '#050528',
          },
          gray: {
            50: '#fafafa',
            100: '#f5f5f5',
            200: '#e5e5e5',
            300: '#d4d4d4',
            400: '#a3a3a3',
            500: '#737373',
            600: '#525252',
            700: '#404040',
            800: '#2D2D2D',
            900: '#1a1a1a',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      spacing: {
        safe: 'max(1rem, env(safe-area-inset-left))',
      },
      animation: {
        'pulse-subtle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(48, 16, 178, 0.5)' },
          '50%': { boxShadow: '0 0 30px rgba(48, 16, 178, 0.8)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
export default config
