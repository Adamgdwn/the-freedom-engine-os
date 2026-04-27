import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceIcon = path.join(repoRoot, "apps", "desktop", "assets", "freedom-icon.png");
const targetDir = path.join(repoRoot, "apps", "desktop", "dist", "assets");

await mkdir(targetDir, { recursive: true });
await copyFile(sourceIcon, path.join(targetDir, "freedom-icon.png"));
