import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig(() => {
  return {
    optimizeDeps: {
      include: ["@emotion/react", "@emotion/styled", "@mui/icons-material", "lodash"],
    },
    build: {
      outDir: "../vms-backend/public/build",
      emptyOutDir: true,
    },
    server: {
      port: Number(process.env.VITE_PORT) || 3000,
      strictPort: true,
      open: "",
    },
    plugins: [
      react({
        jsxImportSource: "@emotion/react",
        babel: {
          plugins: ["@emotion/babel-plugin"],
        },
      }),
      svgr(),
      basicSsl(),
    ],
    resolve: {
      alias: [{ find: "src", replacement: "/src" }],
    },
  };
});
