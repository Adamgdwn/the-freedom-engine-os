#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
dotenv.config({ path: path.join(repoRoot, ".env"), override: true });
const bundledOfflineEnabled = process.env.MOBILE_BUNDLED_OFFLINE_ENABLED?.trim() === "true";

const defaultModelFile = "qwen2.5-1.5b-instruct-q4_k_m.gguf";
const defaultModelUrl =
  "https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/qwen2.5-1.5b-instruct-q4_k_m.gguf?download=true";
const modelFileName = process.env.MOBILE_OFFLINE_MODEL_FILE?.trim() || defaultModelFile;
const assetDirectory = path.join(repoRoot, "apps/mobile/android/app/src/main/assets/models");
const legacyAssetDirectory = path.join(repoRoot, "apps/mobile/assets/models");
const targetPath = path.join(assetDirectory, modelFileName);
const legacyTargetPath = path.join(legacyAssetDirectory, modelFileName);
const sourcePath = process.env.MOBILE_OFFLINE_MODEL_LOCAL_PATH?.trim() || "";
const modelUrl = process.env.MOBILE_OFFLINE_MODEL_URL?.trim() || defaultModelUrl;
const huggingFaceToken = process.env.HF_TOKEN?.trim() || process.env.HUGGINGFACE_TOKEN?.trim() || "";

if (!bundledOfflineEnabled) {
  await removeIfPresent(targetPath);
  await removeIfPresent(`${targetPath}.download`);
  process.stdout.write("Bundled offline model disabled for this Android build.\n");
  process.exit(0);
}

await fsp.mkdir(assetDirectory, { recursive: true });

if (await fileExists(targetPath)) {
  const stats = await fsp.stat(targetPath);
  process.stdout.write(`Offline model already staged: ${targetPath} (${formatBytes(stats.size)})\n`);
  process.exit(0);
}

if (await fileExists(legacyTargetPath)) {
  await fsp.rename(legacyTargetPath, targetPath);
  const stats = await fsp.stat(targetPath);
  process.stdout.write(`Moved offline model from legacy Metro assets -> ${targetPath} (${formatBytes(stats.size)})\n`);
  process.exit(0);
}

if (sourcePath) {
  await fsp.copyFile(sourcePath, targetPath);
  const stats = await fsp.stat(targetPath);
  process.stdout.write(`Copied offline model from ${sourcePath} -> ${targetPath} (${formatBytes(stats.size)})\n`);
  process.exit(0);
}

const tempPath = `${targetPath}.download`;
process.stdout.write(`Downloading offline model to ${targetPath}\n`);
await downloadFile(modelUrl, tempPath, huggingFaceToken);
await fsp.rename(tempPath, targetPath);
const stats = await fsp.stat(targetPath);
const sha256 = await sha256File(targetPath);
process.stdout.write(`Staged offline model ${modelFileName} (${formatBytes(stats.size)}) SHA-256 ${sha256}\n`);

async function downloadFile(url, destinationPath, token) {
  const response = await fetch(url, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    redirect: "follow"
  });
  if (!response.ok || !response.body) {
    throw new Error(`Could not download offline model from ${url}. HTTP ${response.status}`);
  }

  await new Promise((resolve, reject) => {
    const fileStream = fs.createWriteStream(destinationPath);
    response.body.pipeTo(
      new WritableStream({
        write(chunk) {
          fileStream.write(Buffer.from(chunk));
        },
        close() {
          fileStream.end();
          resolve(undefined);
        },
        abort(error) {
          fileStream.destroy(error);
          reject(error);
        }
      })
    ).catch((error) => {
      fileStream.destroy(error);
      reject(error);
    });
  });
}

async function sha256File(filePath) {
  return await new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

async function fileExists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function removeIfPresent(filePath) {
  try {
    await fsp.rm(filePath, { force: true });
  } catch {
    // Ignore cleanup failures for optional assets.
  }
}

function formatBytes(sizeBytes) {
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
