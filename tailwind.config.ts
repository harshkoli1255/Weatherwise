
import type {Config} from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['var(--font-inter)', 'sans-serif'],
        headline: ['var(--font-poppins)', 'sans-serif'],
        code: ['monospace'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        'sun-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.08)', opacity: '1' },
        },
        'cloud-drift-1': {
          '0%': { transform: 'translateX(-150px)' },
          '100%': { transform: 'translateX(150px)' },
        },
        'cloud-drift-2': {
          '0%': { transform: 'translateX(-150px)' },
          '100%': { transform: 'translateX(150px)' },
        },
        'sun-rotate': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'cloud-drift': {
          '0%': { transform: 'translateX(-5%)' },
          '100%': { transform: 'translateX(5%)' },
        },
        'rain-drop': {
          '0%': { transform: 'translateY(-20%)', opacity: '0' },
          '20%': { opacity: '1' },
          '80%': { transform: 'translateY(20%)', opacity: '1' },
          '100%': { opacity: '0' },
        },
        'snow-flake': {
          '0%': { transform: 'translateY(-20%)', opacity: '0' },
          '20%': { opacity: '1' },
          '80%': { transform: 'translate(5%, 20%)', opacity: '1' },
          '100%': { transform: 'translate(-5%, 20%)', opacity: '0' },
        },
        'lightning-flash': {
            '0%, 50%, 100%': { opacity: '0' },
            '51%, 53%': { opacity: '1' },
        },
        'haze-drift-1': {
            '0%': { transform: 'translateX(-10%)' },
            '100%': { transform: 'translateX(10%)' },
        },
        'haze-drift-2': {
            '0%': { transform: 'translateX(10%)' },
            '100%': { transform: 'translateX(-10%)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'spin': 'spin 1s linear infinite',
        'ping': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        'sun-pulse': 'sun-pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'cloud-drift-1': 'cloud-drift-1 12s linear infinite',
        'cloud-drift-2': 'cloud-drift-2 9s linear infinite 1s',
        'sun-rotate': 'sun-rotate 12s linear infinite',
        'cloud-drift': 'cloud-drift 8s linear infinite alternate',
        'rain-drop-1': 'rain-drop 1.5s linear infinite',
        'rain-drop-2': 'rain-drop 1.5s linear infinite 0.3s',
        'rain-drop-3': 'rain-drop 1.5s linear infinite 0.6s',
        'snow-flake-1': 'snow-flake 2.5s ease-in-out infinite',
        'snow-flake-2': 'snow-flake 2.5s ease-in-out infinite 0.5s',
        'snow-flake-3': 'snow-flake 2.5s ease-in-out infinite 1s',
        'lightning-flash': 'lightning-flash 2.5s linear infinite',
        'haze-drift-1': 'haze-drift-1 5s linear infinite alternate',
        'haze-drift-2': 'haze-drift-2 5s linear infinite alternate 0.5s',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
