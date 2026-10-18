import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.PORT ??= "8787";
process.env.TASKMAN_JWT_SECRET ??= "taskman-dev-jwt-secret-change-me";
process.env.TASKMAN_DATA ??= path.join(root, "data", "taskman.json");
process.env.TASKMAN_LEGACY ??= path.join(root, "data", "document.json");
await import("./index.mjs");
