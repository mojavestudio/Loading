import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import mkcert from "vite-plugin-mkcert"
import framer from "vite-plugin-framer"

export default defineConfig({
  plugins: [react(), mkcert(), framer()],
  server: {
    port: 5173,
    host: 'localhost',
    strictPort: true
  },
  build: {
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress known harmless warnings from dependencies
        if (
          warning.message?.includes('Unrecognized feature:') ||
          warning.message?.includes('ambient-light-sensor') ||
          warning.message?.includes('speaker') ||
          warning.message?.includes('vibrate') ||
          warning.message?.includes('vr') ||
          warning.message?.includes('AhrefsAnalytics') ||
          warning.message?.includes('allowfullscreen') ||
          warning.message?.includes('Multiple instances of Three.js')
        ) {
          return
        }
        warn(warning)
      }
    }
  }
})

