import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    modules: {
      // Short scoped names keep feature isolation without shipping long selectors.
      generateScopedName: 'fb_[hash:base64:8]',
    },
  },
})
