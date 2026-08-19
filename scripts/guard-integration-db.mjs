import { readFile, writeFile } from "node:fs/promises";

const path = new URL("../server/db.ts", import.meta.url);
const source = await readFile(path, "utf8");
const start = source.indexOf("export async function createMicrosoftOAuthState");
const end = source.indexOf("export async function exportAccountWorkroomData");
if (start < 0 || end <= start) throw new Error("Integration helper block not found");
const before = source.slice(0, start);
const block = source.slice(start, end);
const after = source.slice(end);
const matches = block.match(/const db = await getDb\(\);/g) ?? [];
if (matches.length !== 10) throw new Error(`Expected 10 guarded calls, found ${matches.length}`);
await writeFile(path, `${before}${block.replaceAll("const db = await getDb();", "const db = await getIntegrationDb();")}${after}`);
