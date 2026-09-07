import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import path from "node:path"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const apiTarget = env.VITE_API_URL || "http://localhost:5000"

  return {
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    server: {
      port: 5173,
      // Same-origin in dev so the JWT cookie (SameSite=None; Secure) is not dropped.
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true, secure: false },
      },
    },
    plugins: [
      react(),
      VitePWA({
        // injectManifest: the service worker owns the offline mutation replay, which
        // is beyond what generateSW can express.
        strategies: "injectManifest",
        srcDir: "src/service-worker",
        filename: "sw.ts",
        registerType: "prompt",
        injectRegister: null,
        manifest: {
          name: "Hamza Masjid Pharmacy",
          short_name: "Pharmacy",
          description: "Pharmacy inventory, dispensary and point-of-sale management.",
          start_url: "/",
          scope: "/",
          display: "standalone",
          orientation: "any",
          theme_color: "#0B1F3A",
          background_color: "#F7F9F7",
          categories: ["medical", "business", "productivity"],
          icons: [
            { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
            { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
          shortcuts: [
            { name: "New sale", short_name: "Sell", url: "/pos" },
            { name: "Inventory", short_name: "Stock", url: "/inventory" },
          ],
        },
        injectManifest: {
          globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        devOptions: {
          enabled: true,
          type: "module",
          navigateFallback: "index.html",
        },
      }),
    ],
    build: {
      target: "es2022",
      sourcemap: true,
      rollupOptions: {
        output: {
          // Charts are only reached from the dashboard and reports, and the
          // vendor core is stable across deploys — splitting both keeps the
          // precache delta small when the app code changes.
          manualChunks(id: string) {
            if (!id.includes("node_modules")) return
            if (id.includes("recharts") || id.includes("d3-")) return "charts"
            if (id.includes("react-router") || id.includes("/react-dom/") || id.includes("/react/")) {
              return "react"
            }
            if (id.includes("@reduxjs") || id.includes("react-redux") || id.includes("redux-persist")) {
              return "redux"
            }
          },
        },
      },
    },
  }
})
