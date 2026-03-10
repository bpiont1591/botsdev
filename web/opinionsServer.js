import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { readJsonSafe, writeJsonAtomic } from "../lib/jsonStore.js";

const PORT = Number(process.env.WEB_PORT || 3000);
const PUBLIC_DIR = path.resolve("./web/public");
const DB_PATH = path.resolve("./data/opinions.json");

if (!fs.existsSync(DB_PATH)) {
  writeJsonAtomic(DB_PATH, []);
}

function sendJson(res, code, payload) {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function serveStatic(req, res) {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  const file = pathname === "/" ? "/index.html" : pathname;
  const resolved = path.resolve(PUBLIC_DIR, `.${file}`);

  if (!resolved.startsWith(PUBLIC_DIR) || !fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("404 Not Found");
    return;
  }

  const ext = path.extname(resolved);
  const type = ext === ".css" ? "text/css" : ext === ".js" ? "application/javascript" : "text/html";
  res.writeHead(200, { "Content-Type": `${type}; charset=utf-8` });
  fs.createReadStream(resolved).pipe(res);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/opinions" && req.method === "GET") {
    const opinions = readJsonSafe(DB_PATH, []);
    return sendJson(res, 200, opinions);
  }

  if (url.pathname === "/api/opinions" && req.method === "POST") {
    try {
      const body = JSON.parse(await readBody(req));
      const author = String(body.author || "").trim();
      const content = String(body.content || "").trim();
      const rating = Number(body.rating || 0);

      if (!author || !content || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        return sendJson(res, 400, { error: "Niepoprawne dane opinii." });
      }

      const opinions = readJsonSafe(DB_PATH, []);
      const item = { id: randomUUID(), author, content, rating, createdAt: new Date().toISOString() };
      opinions.unshift(item);
      writeJsonAtomic(DB_PATH, opinions);
      return sendJson(res, 201, item);
    } catch {
      return sendJson(res, 400, { error: "Niepoprawny JSON." });
    }
  }

  if (req.method === "GET") return serveStatic(req, res);

  res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Method Not Allowed");
});

server.listen(PORT, () => {
  console.log(`✅ Strona opinii działa na http://localhost:${PORT}`);
});
