import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@react-google-maps') || id.includes('google-maps')) return 'maps';
            if (id.includes('@supabase')) return 'supabase';
            if (id.includes('framer-motion')) return 'motion';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('react-router-dom')) return 'router';
            if (id.includes('@radix-ui')) return 'radix';
            if (id.includes('@tanstack/react-query')) return 'query';
            if (id.includes('react-hook-form') || id.includes('@hookform/resolvers')) return 'forms';
            if (id.includes('zod')) return 'validation';
            if (id.includes('date-fns')) return 'date';
            if (id.includes('react-markdown') || id.includes('remark-gfm')) return 'markdown';
            if (id.includes('recharts')) return 'charts';
            if (id.includes('cmdk')) return 'command';
            if (id.includes('sonner')) return 'toast';
            if (id.includes('i18next')) return 'i18n';
            if (id.includes('embla-carousel')) return 'carousel';
            if (id.includes('vaul')) return 'drawer';
            return 'vendor';
          }

          if (
            id.includes('/src/pages/Emergency.tsx') ||
            id.includes('/src/components/EmergencyAssistant.tsx') ||
            id.includes('/src/components/EmergencyPreparednessPanel.tsx') ||
            id.includes('/src/components/TrackingMapGoogle.tsx') ||
            id.includes('/src/components/CommunitySafetyFeed.tsx')
          ) {
            return 'emergency';
          }

          if (
            id.includes('/src/components/MapViewGoogle.tsx') ||
            id.includes('/src/components/TowTruckFlow.tsx')
          ) {
            return 'maps-ui';
          }

          return undefined;
        }
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo.png"],
      manifest: {
        name: "Mella Market Hub",
        short_name: "Mella",
        description: "Ethiopian marketplace & emergency response platform",
        theme_color: "#f97316",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/",
        icons: [
          { src: "/logo.png", sizes: "192x192", type: "image/png" },
          { src: "/logo.png", sizes: "512x512", type: "image/png" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"]
      }
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
}));
