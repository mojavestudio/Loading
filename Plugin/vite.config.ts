import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import mkcert from "vite-plugin-mkcert"
import framer from "vite-plugin-framer"

export default defineConfig({
  plugins: [react(), mkcert(), framer()],
  server: {
    host: "localhost",
    https: true,
    port: 5173
  },
  build: {
    target: "es2022"
  }
})

