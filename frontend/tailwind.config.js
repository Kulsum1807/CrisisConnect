/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1F4E79',
          50: '#E8F1F8',
          100: '#C7DCED',
          500: '#1F4E79',
          600: '#173E62',
          700: '#12314E',
        },
        emergency: {
          DEFAULT: '#C62828',
          light: '#FFEBEE',
          dark: '#B71C1C',
        },
        severity: {
          low: '#2E7D32',
          medium: '#F9A825',
          high: '#EF6C00',
          critical: '#C62828',
        },
        status: {
          pending: '#6B7280',
          assigned: '#2563EB',
          accepted: '#0D9488',
          in_progress: '#7C3AED',
          resolved: '#16A34A',
          cancelled: '#4B5563',
          rejected: '#4B5563',
        },
        surface: '#FFFFFF',
        background: '#F5F7FA',
        appText: {
          primary: '#1A1A1A',
          secondary: '#5F6B7A',
        },
      },
      borderRadius: {
        DEFAULT: '8px',
        lg: '8px',
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
        sos: '120px',
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
