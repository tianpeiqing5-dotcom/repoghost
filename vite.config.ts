import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves the site at https://<user>.github.io/repoghost/
export default defineConfig({
  base: '/repoghost/',
  plugins: [react(), tailwindcss()],
})
