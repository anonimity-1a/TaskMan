import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeDocument } from "../src/normalize.js";

const filePath = (userData) => path.join(userData, "data.json");

export const loadDocument = async (userData) => {
  await mkdir(userData, { recursive: true });
  try {
    const raw = await readFile(filePath(userData), "utf8");
    return normalizeDocument(JSON.parse(raw));
  } catch (error) {
    if (error && error.code === "ENOENT") return normalizeDocument(null);
    if (error instanceof SyntaxError) return normalizeDocument(null);
    throw error;
  }
};

export const saveDocument = async (userData, input) => {
  const document = normalizeDocument(input);
  await mkdir(userData, { recursive: true });
  const target = filePath(userData);
  const temporary = `${target}.tmp`;
  await writeFile(temporary, JSON.stringify(document, null, 2), "utf8");
  await rename(temporary, target);
  return document;
};
