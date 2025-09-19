import { defineConfig } from 'vite'
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173, // keep default or change if you like
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // 👈 your backend server
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
