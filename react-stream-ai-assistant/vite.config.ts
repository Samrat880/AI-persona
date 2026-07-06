import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ["stream-chat", "stream-chat-react"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      react: path.resolve(__dirname, "../node_modules/react"),
      "react-dom": path.resolve(__dirname, "../node_modules/react-dom"),
      "stream-chat": path.resolve(__dirname, "../node_modules/stream-chat"),
      "stream-chat-react": path.resolve(
        __dirname,
        "../node_modules/stream-chat-react"
      ),
      "stream-chat-react/dist/css/v2/index.css": path.resolve(
        __dirname,
        "../node_modules/stream-chat-react/dist/css/v2/index.css"
      ),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "stream-chat",
    ],
  },
});
