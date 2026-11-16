import { afterEach, beforeEach, expect, test } from "vitest";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { Server } from "node:http";

const { createLegacyApp } = createRequire(import.meta.url)("../server.js");
let root: string, origin: string, server: Server;
const fixture = {
  CONFIG: { VERTEX_COUNT: 1 },
  namelist: [{ name: "测试", points: [70] }],
  IMAGE_META: {},
};

beforeEach(async () => {
  root = await mkdtemp(path.join(tmpdir(), "radar-legacy-"));
  await writeFile(path.join(root, "data.json"), JSON.stringify(fixture));
  const app = createLegacyApp({
    servePages: false,
    dataFile: path.join(root, "data.json"),
    imageDir: path.join(root, "pic"),
  });
  server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});
afterEach(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await rm(root, { recursive: true, force: true });
});

test("shared API retains the original data format and rejects malformed saves", async () => {
  expect(await (await fetch(`${origin}/api/data`)).json()).toEqual(fixture);
  const updated = structuredClone(fixture);
  updated.namelist[0].points[0] = 72.5;
  const put = (body: unknown) =>
    fetch(`${origin}/api/data`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  expect(await (await put(updated)).json()).toEqual({ success: true });
  expect((await put({ namelist: null })).status).toBe(400);
  expect(
    JSON.parse(await readFile(path.join(root, "data.json"), "utf8")),
  ).toEqual(updated);
});

test("shared image API retains upload, rename, static access and deletion", async () => {
  const form = new FormData();
  const image =
    '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>';
  form.append(
    "image",
    new Blob([image], { type: "image/svg+xml" }),
    "sample.svg",
  );
  expect(
    (await fetch(`${origin}/api/upload`, { method: "POST", body: form }))
      .status,
  ).toBe(200);
  expect(await (await fetch(`${origin}/assets/images/sample.svg`)).text()).toBe(
    image,
  );
  expect(
    (
      await fetch(`${origin}/api/images/sample.svg`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: "renamed.svg" }),
      })
    ).status,
  ).toBe(200);
  expect((await (await fetch(`${origin}/api/images`)).json())[0].name).toBe(
    "renamed.svg",
  );
  expect(
    (await fetch(`${origin}/api/images/renamed.svg`, { method: "DELETE" }))
      .status,
  ).toBe(200);
  expect(await (await fetch(`${origin}/api/images`)).json()).toEqual([]);
});
