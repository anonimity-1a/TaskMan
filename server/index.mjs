import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { normalizeDocument } from "../src/normalize.js";
import { bearerToken, checkPassword, createToken, hashPassword, publicUser, readToken } from "./auth.mjs";
import { openDatabase } from "./db.mjs";

const secret = process.env.TASKMAN_JWT_SECRET ?? "";
const devSecret = "taskman-dev-jwt-secret-change-me";
const production = process.env.NODE_ENV === "production";
if (!secret || (production && (secret.length < 32 || secret === devSecret))) {
  console.error("Set TASKMAN_JWT_SECRET to a random string of at least 32 characters.");
  process.exit(1);
}

const dataFile = process.env.TASKMAN_DATA
  ? path.resolve(process.env.TASKMAN_DATA)
  : path.join(process.cwd(), "data", "taskman.json");
const legacyFile = process.env.TASKMAN_LEGACY
  ? path.resolve(process.env.TASKMAN_LEGACY)
  : path.join(path.dirname(dataFile), "document.json");
const port = Number(process.env.PORT) || 8787;
const distDir = path.resolve(process.cwd(), "dist");
const db = await openDatabase({ file: dataFile, legacyFile });
const listeners = new Map();

const attempts = new Map();

const tooManyAttempts = (request) => {
  const ip = request.socket.remoteAddress ?? "unknown";
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter((time) => now - time < 10 * 60 * 1000);
  if (recent.length >= 30) {
    attempts.set(ip, recent);
    return true;
  }
  recent.push(now);
  attempts.set(ip, recent);
  return false;
};

const corsHeaders = (request) => ({
  "Access-Control-Allow-Origin": request.headers.origin || "*",
  "Access-Control-Allow-Headers": "authorization, content-type, if-match",
  "Access-Control-Allow-Methods": "GET, PUT, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
});

const sendJson = (request, response, status, body) => {
  const data = body === undefined ? "" : JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(data),
    "Cache-Control": "no-store",
    ...corsHeaders(request),
  });
  response.end(data);
};

const readBody = async (request, limit) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) {
      const error = new Error("Document is too large");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) return {};
  return JSON.parse(text);
};

const emailOf = (value) => {
  if (typeof value !== "string") return "";
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "";
  return email;
};

const usernameOf = (value) => {
  if (typeof value !== "string") return "";
  const username = value.trim();
  if (!/^[A-Za-z0-9._-]{2,40}$/.test(username)) return "";
  return username;
};

const passwordOf = (value) => {
  if (typeof value !== "string" || value.length < 8 || value.length > 200) return "";
  return value;
};

const currentUser = (request) => {
  const claims = readToken(bearerToken(request), secret);
  if (!claims) return null;
  const session = db.getSession(claims.jti);
  if (!session || session.revoked_at || session.user_id !== claims.sub) return null;
  if (Date.parse(session.expires_at) <= Date.now()) return null;
  const user = db.getUserById(session.user_id);
  if (!user) return null;
  return user;
};

const issueSession = async (user) => {
  const issued = createToken(user.id, secret);
  await db.createSession({
    id: issued.jti,
    user_id: user.id,
    expires_at: issued.expiresAt,
    revoked_at: null,
  });
  return { token: issued.token, user: publicUser(user) };
};

const notify = (userId, revision) => {
  const payload = `data: ${JSON.stringify({ revision })}\n\n`;
  for (const listener of listeners.get(userId) ?? []) listener.write(payload);
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

const handleAuth = async (request, response, url) => {
  if (request.method === "POST" && url.pathname === "/api/auth/register") {
    if (tooManyAttempts(request)) {
      sendJson(request, response, 429, { error: "Too many attempts. Try again later." });
      return;
    }
    let body;
    try {
      body = await readBody(request, 100_000);
    } catch {
      sendJson(request, response, 400, { error: "Account details could not be read." });
      return;
    }
    const email = emailOf(body.email);
    const username = usernameOf(body.username);
    const password = passwordOf(body.password);
    if (!email || !username || !password) {
      sendJson(request, response, 400, {
        error: "Use an email, a username, and a password of at least 8 characters.",
      });
      return;
    }
    const passwordHash = await hashPassword(password);
    const created = await db.createUser({ email, username, passwordHash });
    if (created.error === "email") {
      sendJson(request, response, 409, { error: "That email is already registered." });
      return;
    }
    if (created.error === "username") {
      sendJson(request, response, 409, { error: "That username is already taken." });
      return;
    }
    sendJson(request, response, 201, await issueSession(created.user));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    if (tooManyAttempts(request)) {
      sendJson(request, response, 429, { error: "Too many attempts. Try again later." });
      return;
    }
    let body;
    try {
      body = await readBody(request, 100_000);
    } catch {
      sendJson(request, response, 400, { error: "Sign-in details could not be read." });
      return;
    }
    const identity = typeof body.identity === "string" ? body.identity.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const user = identity.includes("@") ? db.getUserByEmail(identity) : db.getUserByUsername(identity);
    const accepted = await checkPassword(password, user?.password_hash);
    if (!accepted || !user) {
      sendJson(request, response, 401, { error: "Those sign-in details were not accepted." });
      return;
    }
    sendJson(request, response, 200, await issueSession(user));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    const claims = readToken(bearerToken(request), secret);
    if (claims) await db.revokeSession(claims.jti);
    sendJson(request, response, 204, undefined);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/auth/me") {
    const user = currentUser(request);
    if (!user) {
      sendJson(request, response, 401, { error: "Sign in again." });
      return;
    }
    sendJson(request, response, 200, publicUser(user));
    return;
  }

  if (request.method === "PATCH" && url.pathname === "/api/auth/me") {
    const user = currentUser(request);
    if (!user) {
      sendJson(request, response, 401, { error: "Sign in again." });
      return;
    }
    if (tooManyAttempts(request)) {
      sendJson(request, response, 429, { error: "Too many attempts. Try again later." });
      return;
    }
    let body;
    try {
      body = await readBody(request, 100_000);
    } catch {
      sendJson(request, response, 400, { error: "Account details could not be read." });
      return;
    }
    const email = body.email === undefined ? user.email : emailOf(body.email);
    const username = body.username === undefined ? user.username : usernameOf(body.username);
    const nextPassword = body.newPassword === undefined || body.newPassword === "" ? "" : passwordOf(body.newPassword);
    if (!email || !username || (body.newPassword && !nextPassword)) {
      sendJson(request, response, 400, {
        error: "Use an email, a username, and a password of at least 8 characters.",
      });
      return;
    }
    const changingSecret = email !== user.email || Boolean(nextPassword);
    if (changingSecret) {
      const current = typeof body.currentPassword === "string" ? body.currentPassword : "";
      const accepted = await checkPassword(current, user.password_hash);
      if (!accepted) {
        sendJson(request, response, 401, { error: "Current password was not accepted." });
        return;
      }
    }
    const updated = await db.updateUser(user.id, {
      email,
      username,
      passwordHash: nextPassword ? await hashPassword(nextPassword) : undefined,
    });
    if (updated.missing) {
      sendJson(request, response, 401, { error: "Sign in again." });
      return;
    }
    if (updated.error === "email") {
      sendJson(request, response, 409, { error: "That email is already registered." });
      return;
    }
    if (updated.error === "username") {
      sendJson(request, response, 409, { error: "That username is already taken." });
      return;
    }
    sendJson(request, response, 200, publicUser(updated.user));
    return;
  }

  if (request.method === "DELETE" && url.pathname === "/api/auth/me") {
    const user = currentUser(request);
    if (!user) {
      sendJson(request, response, 401, { error: "Sign in again." });
      return;
    }
    if (tooManyAttempts(request)) {
      sendJson(request, response, 429, { error: "Too many attempts. Try again later." });
      return;
    }
    let body;
    try {
      body = await readBody(request, 100_000);
    } catch {
      sendJson(request, response, 400, { error: "Account details could not be read." });
      return;
    }
    const current = typeof body.password === "string" ? body.password : "";
    const accepted = await checkPassword(current, user.password_hash);
    if (!accepted) {
      sendJson(request, response, 401, { error: "Current password was not accepted." });
      return;
    }
    await db.deleteUser(user.id);
    const group = listeners.get(user.id);
    if (group) {
      for (const listener of group) listener.end();
      listeners.delete(user.id);
    }
    sendJson(request, response, 204, undefined);
    return;
  }

  return false;
};

const handleTasks = async (request, response, url) => {
  const user = currentUser(request);
  if (!user) {
    sendJson(request, response, 401, { error: "Sign in again." });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/tasks") {
    const snapshot = db.getTasks(user.id);
    if (!snapshot) {
      sendJson(request, response, 404, { error: "Could not load tasks." });
      return;
    }
    sendJson(request, response, 200, snapshot);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/events") {
    response.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...corsHeaders(request),
    });
    const snapshot = db.getTasks(user.id);
    response.write(`data: ${JSON.stringify({ revision: snapshot?.revision ?? 0 })}\n\n`);
    const group = listeners.get(user.id) ?? new Set();
    group.add(response);
    listeners.set(user.id, group);
    request.on("close", () => {
      group.delete(response);
      if (group.size === 0) listeners.delete(user.id);
    });
    return;
  }

  if (request.method === "PUT" && url.pathname === "/api/tasks") {
    const expected = Number(request.headers["if-match"]);
    if (!Number.isInteger(expected) || String(expected) !== String(request.headers["if-match"]).trim()) {
      sendJson(request, response, 400, { error: "If-Match revision is required" });
      return;
    }
    let parsed;
    try {
      parsed = await readBody(request, 5_000_000);
    } catch (error) {
      sendJson(request, response, error.status ?? 400, { error: "Tasks could not be read" });
      return;
    }
    const saved = await db.saveTasks(user.id, expected, normalizeDocument(parsed));
    if (saved.missing) {
      sendJson(request, response, 404, { error: "Could not save tasks." });
      return;
    }
    if (saved.conflict) {
      sendJson(request, response, 409, {
        error: "conflict",
        revision: saved.snapshot.revision,
        document: saved.snapshot.document,
      });
      return;
    }
    notify(user.id, saved.snapshot.revision);
    sendJson(request, response, 200, saved.snapshot);
    return;
  }

  sendJson(request, response, 404, { error: "Not found" });
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
  if (url.pathname.startsWith("/api/auth/")) {
    const handled = await handleAuth(request, response, url);
    if (handled === false) sendJson(request, response, 404, { error: "Not found" });
    return;
  }
  if (url.pathname === "/api/tasks" || url.pathname === "/api/events") {
    await handleTasks(request, response, url);
    return;
  }
  sendJson(request, response, 404, { error: "Not found" });
};

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
