import { defineConfig, Plugin } from "vite"
import react from "@vitejs/plugin-react-swc"
import mkcert from "vite-plugin-mkcert"
import framer from "vite-plugin-framer"

// Plugin to suppress framer-plugin initialization errors
const suppressFramerErrors = (): Plugin => {
  return {
    name: "suppress-framer-errors",
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: "script",
            injectTo: "head",
            children: `
              // Suppress framer-plugin initialization errors
              window.addEventListener("error", function(e) {
                if (e.message && e.message.includes("Invalid mode: null")) {
                  e.preventDefault();
                  e.stopPropagation();
                  e.stopImmediatePropagation();
                  return true;
                }
              }, true);
              
              // Also catch unhandled rejections
              window.addEventListener("unhandledrejection", function(e) {
                if (e.reason && String(e.reason).includes("Invalid mode: null")) {
                  e.preventDefault();
                }
              });
            `
          }
        ]
      }
    }
  }
}

export default defineConfig({
  plugins: [
    react(), 
    mkcert(), // Generates trusted localhost certificates (automatically enables HTTPS)
    suppressFramerErrors(),
    // vite-plugin-framer is needed for Framer to connect to dev server
    framer()
  ],
  build: {
    target: "ES2022",
  },
})

