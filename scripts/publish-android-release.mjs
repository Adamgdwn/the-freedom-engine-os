#!/usr/bin/env node
import { createHash } from "node:crypto";
import { access, copyFile, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.resolve(repoRoot, "apps/mobile/android/app/build/outputs/apk/release");
const sourceApkPath = path.join(sourceDir, "app-release.apk");
const sourceMetadataPath = path.join(sourceDir, "output-metadata.json");
const defaultPublishTargetDir = "/home/adamgoodwin/code/agents/codex_adam_connect/apps/mobile/android/app/build/outputs/apk/release";
const publishTargetDir = path.resolve(process.env.ANDROID_PUBLISH_TARGET_DIR?.trim() || defaultPublishTargetDir);
const verifyUrl = process.env.ANDROID_PUBLISH_VERIFY_URL?.trim() || "http://127.0.0.1:43111/downloads/android/latest.apk";

async function main() {
  await access(sourceApkPath);
  await access(sourceMetadataPath);
  await mkdir(publishTargetDir, { recursive: true });

  const metadata = JSON.parse(await readFile(sourceMetadataPath, "utf8"));
  const release = metadata?.elements?.[0] ?? {};
  const versionCode = release.versionCode ?? "unknown";
  const versionName = release.versionName ?? "unknown";
  const stamp = formatLocalStamp(new Date());

  const targetApkPath = path.join(publishTargetDir, "app-release.apk");
  const targetMetadataPath = path.join(publishTargetDir, "output-metadata.json");

  await backupIfExists(targetApkPath, `${targetApkPath}.bak-${stamp}`);
  await backupIfExists(targetMetadataPath, `${targetMetadataPath}.bak-${stamp}`);

  await copyFile(sourceApkPath, targetApkPath);
  await copyFile(sourceMetadataPath, targetMetadataPath);

  const sourceHash = await sha256File(sourceApkPath);
  const targetHash = await sha256File(targetApkPath);
  if (sourceHash !== targetHash) {
    throw new Error(`Published APK hash mismatch: ${sourceHash} != ${targetHash}`);
  }

  const sourceStats = await stat(sourceApkPath);
  const verification = await verifyLiveDownload(sourceHash, sourceStats.size);

  process.stdout.write(`Published Android ${versionName} (${versionCode}) to ${publishTargetDir}\n`);
  process.stdout.write(`APK SHA-256 ${sourceHash}\n`);
  process.stdout.write(`Backups stamped ${stamp}\n`);
  if (verification.ok) {
    process.stdout.write(`Verified live download ${verifyUrl} -> ${verification.httpStatus}, ${verification.sizeBytes} bytes\n`);
  } else {
    process.stdout.write(`Warning: could not verify live download at ${verifyUrl}: ${verification.reason}\n`);
  }
}

async function backupIfExists(sourcePath, backupPath) {
  try {
    await access(sourcePath);
    await copyFile(sourcePath, backupPath);
  } catch {
    // No prior file to back up.
  }
}

async function sha256File(filePath) {
  const buffer = await readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}

async function verifyLiveDownload(expectedHash, expectedSize) {
  try {
    const response = await fetch(verifyUrl, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(20_000)
    });
    if (!response.ok) {
      return { ok: false, reason: `HTTP ${response.status}` };
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    const liveHash = createHash("sha256").update(bytes).digest("hex");
    if (bytes.length !== expectedSize) {
      return { ok: false, reason: `size mismatch ${bytes.length} != ${expectedSize}` };
    }
    if (liveHash !== expectedHash) {
      return { ok: false, reason: `hash mismatch ${liveHash} != ${expectedHash}` };
    }

    return { ok: true, httpStatus: response.status, sizeBytes: bytes.length };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

function formatLocalStamp(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  const seconds = String(value.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
