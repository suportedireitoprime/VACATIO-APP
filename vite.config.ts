import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import viteCompression from "vite-plugin-compression";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Base relativa apenas quando empacotando para Electron (file://).
  // Deploy web da Lovable continua servindo em "/".
  base: process.env.ELECTRON_BUILD === "1" ? "./" : "/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    // @vitejs/plugin-legacy removido: alvos suportados (Capacitor Android
    // WebView atual + Chrome/Safari/Firefox modernos) já entendem ES2020.
    // O plugin gerava um segundo build + polyfills (~40–60 KB no bundle
    // inicial) que ninguém usava. Se algum dia precisar suportar navegador
    // antigo, reintroduza aqui.
    mode === "development" && componentTagger(),
    // Emit precompressed .gz and .br artifacts alongside each JS/CSS/HTML/SVG.
    // Static hosts (Netlify, Cloudflare Pages, Nginx) will serve these
    // directly when the client sends Accept-Encoding: br/gzip, cutting
    // transfer size ~70–85%. Skip in dev so HMR stays fast.
    // Skip precompression for native (Capacitor) builds: the WebView reads files
    // straight from the APK's assets folder with no Accept-Encoding negotiation,
    // so shipping both `foo.js` and `foo.js.gz` only wastes space AND makes
    // Android's Asset Merger fail with "Duplicate resources" (it strips .gz).
    mode !== "development" && !process.env.SKIP_PRECOMPRESS && viteCompression({
      algorithm: "gzip",
      ext: ".gz",
      threshold: 1024,
      deleteOriginFile: false,
    }),
    mode !== "development" && !process.env.SKIP_PRECOMPRESS && viteCompression({
      algorithm: "brotliCompress",
      ext: ".br",
      threshold: 1024,
      deleteOriginFile: false,
      compressionOptions: { params: { [/* zlib.constants.BROTLI_PARAM_QUALITY */ 1]: 11 } },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    // Split heavy vendors so initial route doesn't ship them.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("framer-motion")) return "motion";
          if (id.includes("reactflow") || id.includes("@xyflow")) return "flow";
          if (id.includes("jspdf") || id.includes("react-pdf") || id.includes("pdfjs-dist")) return "pdf";
          if (id.includes("tesseract.js")) return "ocr";
          if (id.includes("@tanstack/react-virtual")) return "virtual";
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("dexie")) return "dexie";
          if (id.includes("fuse.js")) return "search";
          if (id.includes("lucide-react")) return "icons";
        },
      },
    },
  },
}));

