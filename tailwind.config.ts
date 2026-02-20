import type { Config } from 'tailwindcss'

// Tailwind CSS v4: most configuration lives in CSS via @theme directive.
// This file is kept for compatibility and JS-level plugin needs.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
}

export default config
