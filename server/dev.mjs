import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.PORT ??= "8787";
process.env.TASKMAN_TOKEN ??= "taskman-dev";
process.env.TASKMAN_DATA ??= path.join(root, "data", "document.json");
await import("./index.mjs");
