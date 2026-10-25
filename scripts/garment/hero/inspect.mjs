/** Capture huit vues fixes de la géométrie réelle du GLB pour inspection visuelle. */
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { tmpdir } from "node:os";
import { chromium } from "playwright-core";

const ROOT = process.cwd();
const OUT = process.env.FARON_INSPECT_OUT ?? join(tmpdir(), "faron-garment-inspection");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".glb": "model/gltf-binary" };
const routes = [
  ["/three/", join(ROOT, "node_modules/three/")],
  ["/models/", join(ROOT, "public/models/")],
  ["/", join(ROOT, "scripts/garment/hero/")],
];
const views = [
  { name: "front", yaw: 0, eye: [0, 0, 2.05] },
  { name: "back", yaw: Math.PI, eye: [0, 0, 2.05] },
  { name: "left", yaw: -Math.PI / 2, eye: [0, 0, 2.05] },
  { name: "right", yaw: Math.PI / 2, eye: [0, 0, 2.05] },
  { name: "front-three-quarter", yaw: -Math.PI / 4, eye: [0, 0, 2.05] },
  { name: "back-three-quarter", yaw: Math.PI * 1.25, eye: [0, 0, 2.05] },
  { name: "above", yaw: 0, eye: [0, 1.25, 1.12], targetY: -0.08 },
  { name: "underneath", yaw: 0, eye: [0, -1.2, 0.7], targetY: -0.04 },
];

const server = createServer((req, res) => {
  const url = decodeURIComponent((req.url ?? "/").split("?")[0]);
  const route = routes.find(([prefix]) => url.startsWith(prefix));
  const file = route && normalize(join(route[1], url.slice(route[0].length) || "hero.html"));
  if (!file || !file.startsWith(route[1]) || !existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "Content-Type": MIME[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--ignore-gpu-blocklist", "--use-angle=metal"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`http://127.0.0.1:${server.address().port}/hero.html`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  for (const view of views) {
    await page.evaluate((params) => window.inspectGarment(params), view);
    await page.screenshot({ path: join(OUT, `${view.name}.png`) });
    console.log(`${view.name}: ${join(OUT, `${view.name}.png`)}`);
  }
} finally {
  await browser.close();
  server.close();
}
