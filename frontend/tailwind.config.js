// ── tailwind.config.js ────────────────────────────────────────────────────────
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,jsx,ts,tsx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                brand: {
                    50: '#eef2ff',
                    100: '#e0e7ff',
                    200: '#c7d2fe',
                    300: '#a5b4fc',
                    400: '#818cf8',
                    500: '#6366f1',
                    600: '#4f46e5',
                    700: '#4338ca',
                    800: '#3730a3',
                    900: '#1e1b4b',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                mono: ['"JetBrains Mono"', '"Fira Code"', 'Menlo', 'monospace'],
            },
            animation: {
                'fade-in': 'fadeIn  0.2s  ease-out both',
                'slide-up': 'slideUp 0.25s ease-out both',
                'pulse-slow': 'pulse   3s    cubic-bezier(0.4,0,0.6,1) infinite',
            },
            keyframes: {
                fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
                slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
            },
            spacing: {
                '4.5': '1.125rem',   // translate-x-4.5 for toggle knob
            },
            boxShadow: {
                'brand': '0 4px 14px 0 rgba(79, 70, 229, 0.25)',
            },
        },
    },
    plugins: [],
}