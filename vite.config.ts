import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
      // Build estático (SPA): o King Host serve apenas HTML/JS/CSS sem servidor Node.
      // O app lê os dados direto no Supabase via publishable key + RLS público.
      spa: {
        enabled: true,
        prerender: {
          outputPath: "index",
        },
      },
    }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
});