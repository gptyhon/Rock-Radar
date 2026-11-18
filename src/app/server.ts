import path from "node:path";
import { createRequire } from "node:module";
import express from "express";
import { registerVideoExport } from "./video-export/routes";

const require = createRequire(import.meta.url);
const { createLegacyApp } = require("../../server.js");

async function main() {
  const repo = process.cwd();
  const port = Number(process.env.PORT || 3003);
  const app = createLegacyApp({
    servePages: false,
    dataFile:
      process.env.RADAR_DATA_FILE && path.resolve(process.env.RADAR_DATA_FILE),
    imageDir:
      process.env.RADAR_IMAGE_DIR && path.resolve(process.env.RADAR_IMAGE_DIR),
  });
  const stopVideoExport = registerVideoExport(app, repo);
  // Serve untouched baseline files for side-by-side verification.
  app.get("/legacy/radar", (_req: express.Request, res: express.Response) =>
    res.sendFile(path.join(repo, "index.html")),
  );
  app.get("/legacy/admin", (_req: express.Request, res: express.Response) =>
    res.sendFile(path.join(repo, "admin.html")),
  );
  let vite:
    Awaited<ReturnType<(typeof import("vite"))["createServer"]>> | undefined;
  if (process.argv.includes("--dev")) {
    const { createServer } = await import("vite");
    vite = await createServer({
      configFile: path.join(repo, "vite.config.mts"),
      server: { middlewareMode: true, hmr: { port: port + 1 } },
    });
    app.use(
      (
        req: express.Request,
        _res: express.Response,
        next: express.NextFunction,
      ) => {
        if (req.path === "/radar")
          req.url = req.url.replace("/radar", "/radar.html");
        next();
      },
    );
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(repo, "dist/app")));
    app.get("/radar", (_req: express.Request, res: express.Response) =>
      res.sendFile(path.join(repo, "dist/app/radar.html")),
    );
    app.get("*", (_req: express.Request, res: express.Response) =>
      res.sendFile(path.join(repo, "dist/app/index.html")),
    );
  }
  const server = app.listen(port, "127.0.0.1", () => {
    console.log(`Rock Radar 管理面板：http://127.0.0.1:${port}`);
    console.log(`S2 雷达展示页：http://127.0.0.1:${port}/radar`);
    console.log(`原版画面对比：http://127.0.0.1:${port}/radar?theme=original`);
  });
  const shutdown = async () => {
    await stopVideoExport();
    await vite?.close();
    server.close();
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
