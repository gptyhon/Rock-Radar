import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { readFileSync } from "node:fs";

export default defineConfig({
  root: path.resolve("app"),
  publicDir: path.resolve("public"),
  plugins: [
    react(),
    {
      name: "original-page-styles",
      configureServer(server) {
        const sheets = ["radar", "admin"].map((page) =>
          path.resolve(`src/${page}/styles.css`),
        );
        server.watcher.add(sheets);
        server.watcher.on("change", (file) => {
          if (sheets.includes(file)) server.ws.send({ type: "full-reload" });
        });
      },
      // Inline before first paint, just like the baseline. Inserting styles after
      // mounting would animate the body's default margin via its transition: all.
      transformIndexHtml: {
        order: "post",
        handler(_html, context) {
          const page = context.filename.endsWith("radar.html")
            ? "radar"
            : "admin";
          const baseline = readFileSync(
            path.resolve(page === "radar" ? "index.html" : "admin.html"),
            "utf8",
          );
          const links = [
            ...baseline.matchAll(/<link rel="stylesheet" href="([^"]+)"/g),
          ].map((match) => ({
            tag: "link",
            attrs: { rel: "stylesheet", href: match[1] },
            injectTo: "head" as const,
          }));
          const scripts = [...baseline.matchAll(/<script src="([^"]+)"/g)].map(
            (match) => ({
              tag: "script",
              attrs: { src: match[1] },
              injectTo: "head" as const,
            }),
          );
          return [
            {
              tag: "style",
              children: readFileSync(
                path.resolve(`src/${page}/styles.css`),
                "utf8",
              ),
              injectTo: "head",
            },
            ...links,
            ...scripts,
          ];
        },
      },
    },
  ],
  build: {
    rolldownOptions: {
      input: {
        admin: path.resolve("app/index.html"),
        radar: path.resolve("app/radar.html"),
      },
    },
    target: "es2022",
    outDir: path.resolve("dist/app"),
    emptyOutDir: true,
  },
});
