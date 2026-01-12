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
    minify: 'esbuild'
  }
})

