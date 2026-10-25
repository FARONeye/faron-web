/**
 * Boucle héro (6 s, 30 i/s) rendue depuis public/models/faron-veil.glb :
 *   npm run build:hero
 * → public/media/faron-veil-loop.webm (1280×720), -portrait.webm (720×1280), -back.webm (dos, logo), -poster.jpg
 *
 * Nécessite Google Chrome (rendu WebGL) et ffmpeg avec l'encodeur libvpx. Par défaut, le ffmpeg
 * fourni avec Playwright est utilisé ; sinon définir FFMPEG=/chemin/vers/ffmpeg.
 */
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright-core";

const ROOT = process.cwd();
const LOOP = 6;
const FPS = 30;

const MIME = { ".html": "text/html", ".js": "text/javascript", ".glb": "model/gltf-binary", ".json": "application/json" };
const routes = [
  ["/three/", join(ROOT, "node_modules/three/")],
  ["/models/", join(ROOT, "public/models/")],
  ["/", join(ROOT, "scripts/garment/hero/")],
];

function serve() {
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
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  for (const dir of existsSync(cache) ? readdirSync(cache) : []) {
    for (const bin of ["ffmpeg-mac", "ffmpeg-linux", "ffmpeg"]) {
      const p = join(cache, dir, bin);
      if (dir.startsWith("ffmpeg") && existsSync(p)) return p;
    }
  }
  return "ffmpeg";
}

async function renderLoop(browser, port, width, height, view = "front") {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(`http://127.0.0.1:${port}/hero.html?view=${view}`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
  const frames = [];
  for (let f = 0; f < LOOP * FPS; f++) {
    await page.evaluate((t) => window.renderAt(t), (f / (LOOP * FPS)) * LOOP);
    frames.push(await page.screenshot({ type: "jpeg", quality: 96 }));
  }
  await page.close();
  return frames;
}

function encode(ffmpeg, frames, out) {
  // Flux MJPEG concaténé : compatible avec le ffmpeg minimal de Playwright (pas d'entrée PNG ni de pipe).
  const tmp = join(tmpdir(), `faron-hero-${process.pid}.mjpeg`);
  writeFileSync(tmp, Buffer.concat(frames));
  execFileSync(ffmpeg, [
    ...["-hide_banner", "-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", `file:${tmp}`],
    ...["-c:v", "libvpx", "-b:v", "2400k", "-crf", "8", "-qmin", "2", "-qmax", "30", "-auto-alt-ref", "0", "-deadline", "good", "-cpu-used", "1", "-pix_fmt", "yuv420p", `file:${out}`],
  ]);
  rmSync(tmp);
}

const server = await serve();
const port = server.address().port;
const ffmpeg = findFfmpeg();
const media = join(ROOT, "public/media");
mkdirSync(media, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--ignore-gpu-blocklist", "--use-angle=metal"] });
try {
  for (const [name, w, h, view] of [
    ["faron-veil-loop", 1280, 720, "front"],
    ["faron-veil-loop-portrait", 720, 1280, "front"],
    ["faron-veil-loop-back", 1280, 720, "back"],
  ]) {
    const frames = await renderLoop(browser, port, w, h, view);
    encode(ffmpeg, frames, join(media, `${name}.webm`));
    if (name === "faron-veil-loop") writeFileSync(join(media, "faron-veil-loop-poster.jpg"), frames[0]);
    console.log(`${name}.webm : ${frames.length} images ${w}×${h}`);
  }
} finally {
  await browser.close();
  server.close();
}
