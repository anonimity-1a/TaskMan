import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";

const ROUNDS = 12;
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 14;

let dummyHashPromise = null;

const dummyHash = () => {
  dummyHashPromise ??= bcrypt.hash("not-a-real-password", ROUNDS);
  return dummyHashPromise;
};

const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

const decode = (value) => JSON.parse(Buffer.from(value, "base64url").toString("utf8"));

export const hashPassword = (password) => bcrypt.hash(password, ROUNDS);

export const checkPassword = async (password, hash) => {
  const stored = hash || (await dummyHash());
  const matches = await bcrypt.compare(password, stored);
  return Boolean(hash) && matches;
};

export const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  username: user.username,
});

export const createToken = (userId, secret, now = Date.now()) => {
  const jti = randomUUID();
  const exp = Math.floor(now / 1000) + TOKEN_TTL_SECONDS;
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({ sub: userId, jti, exp });
  const data = `${header}.${payload}`;
  const signature = createHmac("sha256", secret).update(data).digest("base64url");
  return {
    token: `${data}.${signature}`,
    jti,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
};

export const readToken = (token, secret) => {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headerPart, payloadPart, signature] = parts;
  let header;
  try {
    header = decode(headerPart);
  } catch {
    return null;
  }
  if (!header || header.alg !== "HS256") return null;
  const data = `${headerPart}.${payloadPart}`;
  const expected = createHmac("sha256", secret).update(data).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }
  let payload;
  try {
    payload = decode(payloadPart);
  } catch {
    return null;
  }
  if (!payload || typeof payload.sub !== "string" || typeof payload.jti !== "string") return null;
  if (typeof payload.exp !== "number" || payload.exp * 1000 <= Date.now()) return null;
  return payload;
};

export const bearerToken = (request) => {
  const header = request.headers.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ")) return "";
  return header.slice(7).trim();
};
