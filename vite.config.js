import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "tide-dpop-relay",
      configureServer(server) {
        server.middlewares.use((request, response, next) => {
          if (request.url?.startsWith("/tide_dpop/")) {
            request.url = "/tide_dpop_auth.html";
            response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'unsafe-inline'");
            response.setHeader("Allow-CSP-From", "*");
          }
          next();
        });
      },
    },
  ],
  server: {
    host: "localhost",
    port: 5137,
    strictPort: true,
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
