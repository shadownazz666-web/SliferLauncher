import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4173);
// Prefer LAN store-api (8787 is not public; apex uses nginx /api).
const API_ORIGIN = (
  process.env.SLIFER_API_ORIGIN || "http://192.168.0.117:8787"
).replace(/\/$/, "");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function serveStatic(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/profile") pathname = "/profile.html";
  if (pathname.endsWith("/")) pathname += "index.html";

  const filePath = path.normalize(path.join(__dirname, pathname));
  if (!filePath.startsWith(__dirname)) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, "Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
  });
}

function proxyApi(req, res) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const targetPath = url.pathname.replace(/^\/api/, "") || "/";
  const target = new URL(targetPath + url.search, API_ORIGIN);

  const headers = { ...req.headers, host: target.host };
  delete headers["accept-encoding"];

  const upstream = http.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || 80,
      path: target.pathname + target.search,
      method: req.method,
      headers,
    },
    (upRes) => {
      res.writeHead(upRes.statusCode || 502, upRes.headers);
      upRes.pipe(res);
    },
  );

  upstream.on("error", (err) => {
    send(res, 502, `API proxy error: ${err.message}`);
  });

  req.pipe(upstream);
}

const server = http.createServer((req, res) => {
  if ((req.url || "").startsWith("/api/") || (req.url || "") === "/api") {
    proxyApi(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[website-dev] http://127.0.0.1:${PORT}`);
  console.log(`[website-dev] /api → ${API_ORIGIN}`);
});
