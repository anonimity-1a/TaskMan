import { createReadStream } from "node:fs";
import { access, mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { emptyDocument, normalizeDocument } from "../src/normalize.js";

const token = process.env.TASKMAN_TOKEN ?? "";
if (!token) {
  console.error("Set TASKMAN_TOKEN before starting TaskMan.");
  process.exit(1);
}

const dataFile = process.env.TASKMAN_DATA
  ? path.resolve(process.env.TASKMAN_DATA)
  : path.join(process.cwd(), "data", "document.json");
const port = Number(process.env.PORT) || 8787;
const distDir = path.resolve(process.cwd(), "dist");
const listeners = new Set();

let state = { revision: 0, document: emptyDocument() };
let writeLock = Promise.resolve();

const enqueue = (job) => {
  const run = writeLock.then(job, job);
  writeLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
};

const loadState = async () => {
  try {
    const raw = JSON.parse(await readFile(dataFile, "utf8"));
    const document = normalizeDocument(raw?.document ?? raw);
    const revision =
      raw && Number.isInteger(raw.revision) && raw.document ? raw.revision : 0;
    state = { revision, document };
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    state = { revision: 0, document: emptyDocument() };
  }
};

const persist = async (next) => {
  await mkdir(path.dirname(dataFile), { recursive: true });
  const temporary = `${dataFile}.tmp`;
  await writeFile(temporary, JSON.stringify(next), "utf8");
  try {
    await rename(temporary, dataFile);
  } catch (error) {
    if (error?.code !== "EPERM" && error?.code !== "EEXIST") throw error;
    await unlink(dataFile);
    await rename(temporary, dataFile);
  }
  state = next;
  const payload = `data: ${JSON.stringify({ revision: next.revision })}\n\n`;
  for (const listener of listeners) listener.write(payload);
};

const corsHeaders = (request) => ({
  "Access-Control-Allow-Origin": request.headers.origin || "*",
  "Access-Control-Allow-Headers": "authorization, content-type, if-match",
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

const sendJson = (request, response, status, body) => {
  const data = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(data),
    "Cache-Control": "no-store",
    ...corsHeaders(request),
  });
  response.end(data);
};

const authorized = (request) => request.headers.authorization === `Bearer ${token}`;

const readBody = async (request) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 5_000_000) {
      const error = new Error("Document is too large");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
};

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const serveStatic = async (request, response, pathname) => {
  const target = path.resolve(distDir, `.${pathname}`);
  const relative = path.relative(distDir, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    sendJson(request, response, 403, { error: "Forbidden" });
    return;
  }
  let filePath = target;
  try {
    await access(filePath);
  } catch {
    filePath = path.join(distDir, "index.html");
  }
  try {
    await access(filePath);
  } catch {
    sendJson(request, response, 404, { error: "TaskMan has not been built" });
    return;
  }
  const type = contentTypes[path.extname(filePath)] ?? "application/octet-stream";
  response.writeHead(200, { "Content-Type": type, ...corsHeaders(request) });
  createReadStream(filePath).pipe(response);
};

const handleApi = async (request, response, url) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders(request));
    response.end();
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(request, response, 200, { ok: true });
    return;
  }
  if (!authorized(request)) {
    sendJson(request, response, 401, { error: "Passphrase was not accepted" });
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/document") {
    sendJson(request, response, 200, state);
    return;
  }
  if (request.method === "GET" && url.pathname === "/api/events") {
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...corsHeaders(request),
    });
    response.write(`data: ${JSON.stringify({ revision: state.revision })}\n\n`);
    listeners.add(response);
    request.on("close", () => listeners.delete(response));
    return;
  }
  if (request.method === "PUT" && url.pathname === "/api/document") {
    await enqueue(async () => {
      const expected = Number(request.headers["if-match"]);
      if (!Number.isInteger(expected) || String(expected) !== String(request.headers["if-match"]).trim()) {
        sendJson(request, response, 400, { error: "If-Match revision is required" });
        return;
      }
      if (expected !== state.revision) {
        sendJson(request, response, 409, {
          error: "conflict",
          revision: state.revision,
          document: state.document,
        });
        return;
      }
      let parsed;
      try {
        parsed = JSON.parse(await readBody(request));
      } catch (error) {
        sendJson(request, response, error.status ?? 400, { error: "Document could not be read" });
        return;
      }
      const next = { revision: state.revision + 1, document: normalizeDocument(parsed) };
      await persist(next);
      sendJson(request, response, 200, next);
    });
    return;
  }
  sendJson(request, response, 404, { error: "Not found" });
};

await loadState();

const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  if (url.pathname.startsWith("/api/")) {
    handleApi(request, response, url).catch((error) => {
      if (!response.headersSent) {
        sendJson(request, response, 500, { error: "TaskMan could not save" });
      }
      console.error(error);
    });
    return;
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendJson(request, response, 405, { error: "Method not allowed" });
    return;
  }
  const pathname = decodeURIComponent(url.pathname);
  serveStatic(request, response, pathname === "/" ? "/index.html" : pathname).catch((error) => {
    console.error(error);
    if (!response.headersSent) sendJson(request, response, 500, { error: "TaskMan could not load" });
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`TaskMan listening on ${port}`);
});
