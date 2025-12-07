// vite.config.ts
import { defineConfig } from "file:///Users/jess/Documents/Loading/Plugin/node_modules/vite/dist/node/index.js";
import react from "file:///Users/jess/Documents/Loading/Plugin/node_modules/@vitejs/plugin-react-swc/index.js";
import mkcert from "file:///Users/jess/Documents/Loading/Plugin/node_modules/vite-plugin-mkcert/dist/mkcert.mjs";
import framer from "file:///Users/jess/Documents/Loading/Plugin/node_modules/vite-plugin-framer/index.js";
var suppressFramerErrors = () => {
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
      };
    }
  };
};
var vite_config_default = defineConfig({
  plugins: [
    react(),
    mkcert(),
    // Generates trusted localhost certificates (automatically enables HTTPS)
    suppressFramerErrors(),
    // vite-plugin-framer is needed for Framer to connect to dev server
    framer()
  ],
  build: {
    target: "ES2022"
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvamVzcy9Eb2N1bWVudHMvTG9hZGluZy9QbHVnaW5cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9qZXNzL0RvY3VtZW50cy9Mb2FkaW5nL1BsdWdpbi92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvamVzcy9Eb2N1bWVudHMvTG9hZGluZy9QbHVnaW4vdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIFBsdWdpbiB9IGZyb20gXCJ2aXRlXCJcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCJcbmltcG9ydCBta2NlcnQgZnJvbSBcInZpdGUtcGx1Z2luLW1rY2VydFwiXG5pbXBvcnQgZnJhbWVyIGZyb20gXCJ2aXRlLXBsdWdpbi1mcmFtZXJcIlxuXG4vLyBQbHVnaW4gdG8gc3VwcHJlc3MgZnJhbWVyLXBsdWdpbiBpbml0aWFsaXphdGlvbiBlcnJvcnNcbmNvbnN0IHN1cHByZXNzRnJhbWVyRXJyb3JzID0gKCk6IFBsdWdpbiA9PiB7XG4gIHJldHVybiB7XG4gICAgbmFtZTogXCJzdXBwcmVzcy1mcmFtZXItZXJyb3JzXCIsXG4gICAgdHJhbnNmb3JtSW5kZXhIdG1sKGh0bWwpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGh0bWwsXG4gICAgICAgIHRhZ3M6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB0YWc6IFwic2NyaXB0XCIsXG4gICAgICAgICAgICBpbmplY3RUbzogXCJoZWFkXCIsXG4gICAgICAgICAgICBjaGlsZHJlbjogYFxuICAgICAgICAgICAgICAvLyBTdXBwcmVzcyBmcmFtZXItcGx1Z2luIGluaXRpYWxpemF0aW9uIGVycm9yc1xuICAgICAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImVycm9yXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICBpZiAoZS5tZXNzYWdlICYmIGUubWVzc2FnZS5pbmNsdWRlcyhcIkludmFsaWQgbW9kZTogbnVsbFwiKSkge1xuICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0sIHRydWUpO1xuICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgLy8gQWxzbyBjYXRjaCB1bmhhbmRsZWQgcmVqZWN0aW9uc1xuICAgICAgICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInVuaGFuZGxlZHJlamVjdGlvblwiLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGUucmVhc29uICYmIFN0cmluZyhlLnJlYXNvbikuaW5jbHVkZXMoXCJJbnZhbGlkIG1vZGU6IG51bGxcIikpIHtcbiAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgYFxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSwgXG4gICAgbWtjZXJ0KCksIC8vIEdlbmVyYXRlcyB0cnVzdGVkIGxvY2FsaG9zdCBjZXJ0aWZpY2F0ZXMgKGF1dG9tYXRpY2FsbHkgZW5hYmxlcyBIVFRQUylcbiAgICBzdXBwcmVzc0ZyYW1lckVycm9ycygpLFxuICAgIC8vIHZpdGUtcGx1Z2luLWZyYW1lciBpcyBuZWVkZWQgZm9yIEZyYW1lciB0byBjb25uZWN0IHRvIGRldiBzZXJ2ZXJcbiAgICBmcmFtZXIoKVxuICBdLFxuICBidWlsZDoge1xuICAgIHRhcmdldDogXCJFUzIwMjJcIixcbiAgfSxcbn0pXG5cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBOFIsU0FBUyxvQkFBNEI7QUFDblUsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sWUFBWTtBQUNuQixPQUFPLFlBQVk7QUFHbkIsSUFBTSx1QkFBdUIsTUFBYztBQUN6QyxTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixtQkFBbUIsTUFBTTtBQUN2QixhQUFPO0FBQUEsUUFDTDtBQUFBLFFBQ0EsTUFBTTtBQUFBLFVBQ0o7QUFBQSxZQUNFLEtBQUs7QUFBQSxZQUNMLFVBQVU7QUFBQSxZQUNWLFVBQVU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsVUFrQlo7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0Y7QUFFQSxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUE7QUFBQSxJQUNQLHFCQUFxQjtBQUFBO0FBQUEsSUFFckIsT0FBTztBQUFBLEVBQ1Q7QUFBQSxFQUNBLE9BQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxFQUNWO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
