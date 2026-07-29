/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
                display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
            },
            colors: {
                brand: {
                    blue: '#1877F2',
                    red: '#E31B23',
                    background: '#F4F7FE'
                }
            },
            animation: {
                blink: "blink 1s infinite",
            },
            keyframes: {
                blink: {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.4 },
                },
            },
        },
    },
    plugins: [],
}
