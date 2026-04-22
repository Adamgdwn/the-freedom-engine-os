import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";

const repoRoot = path.resolve(new URL(".", import.meta.url).pathname, "..");
dotenv.config({ path: path.join(repoRoot, ".env"), override: true });

const defaultBaseUrl = process.env.MOBILE_DEFAULT_BASE_URL?.trim() || "";
const bundledOfflineEnabled = process.env.MOBILE_BUNDLED_OFFLINE_ENABLED?.trim() === "true";
const configuredDisconnectedAssistantBaseUrl = process.env.MOBILE_DISCONNECTED_ASSISTANT_BASE_URL?.trim() || "";
const disconnectedAssistantBaseUrl = configuredDisconnectedAssistantBaseUrl;
const disconnectedAssistantMode = bundledOfflineEnabled ? "bundled_model" : configuredDisconnectedAssistantBaseUrl ? "cloud" : "notes_only";
const requestedVoiceRuntimeMode = process.env.MOBILE_VOICE_RUNTIME_MODE?.trim();
const voiceRuntimeMode = requestedVoiceRuntimeMode === "device_fallback" ? "device_fallback" : "realtime_primary";
const voiceSessionEnabled = process.env.MOBILE_VOICE_SESSION_ENABLED?.trim() !== "false";
const voiceInterruptMinChars = Number.parseInt(process.env.MOBILE_VOICE_INTERRUPT_MIN_CHARS?.trim() ?? "8", 10);
const voiceBackchannelMaxWords = Number.parseInt(process.env.MOBILE_VOICE_BACKCHANNEL_MAX_WORDS?.trim() ?? "2", 10);
const voiceTtsMinChars = Number.parseInt(process.env.MOBILE_VOICE_TTS_MIN_CHARS?.trim() ?? "28", 10);
const googleServicesPath = path.join(repoRoot, "apps/mobile/android/app/google-services.json");
const androidBuildGradlePath = path.join(repoRoot, "apps/mobile/android/app/build.gradle");
const fcmEnabled = await fs
  .access(googleServicesPath)
  .then(() => true)
  .catch(() => false);
const androidBuildGradle = await fs.readFile(androidBuildGradlePath, "utf8");
const versionNameMatch = androidBuildGradle.match(/^\s*versionName\s+"([^"]+)"/m);
const versionCodeMatch = androidBuildGradle.match(/^\s*versionCode\s+(\d+)/m);
const mobileAppVersionName = versionNameMatch?.[1] ?? "unknown";
const mobileAppVersionCode = Number.parseInt(versionCodeMatch?.[1] ?? "0", 10);

const targetPath = path.join(repoRoot, "apps/mobile/src/generated/runtimeConfig.ts");
await fs.mkdir(path.dirname(targetPath), { recursive: true });
await fs.writeFile(
  targetPath,
  `export const DEFAULT_BASE_URL = ${JSON.stringify(defaultBaseUrl)};\n` +
    `export const DISCONNECTED_ASSISTANT_MODE = ${JSON.stringify(disconnectedAssistantMode)};\n` +
    `export const DISCONNECTED_ASSISTANT_BASE_URL = ${JSON.stringify(disconnectedAssistantBaseUrl)};\n` +
    `export const FCM_ENABLED = ${JSON.stringify(fcmEnabled)};\n` +
    `export const MOBILE_APP_VERSION_NAME = ${JSON.stringify(mobileAppVersionName)};\n` +
    `export const MOBILE_APP_VERSION_CODE = ${Number.isFinite(mobileAppVersionCode) ? mobileAppVersionCode : 0};\n` +
    `export const VOICE_RUNTIME_MODE = ${JSON.stringify(voiceRuntimeMode)};\n` +
    `export const VOICE_SESSION_ENABLED = ${JSON.stringify(voiceSessionEnabled)};\n` +
    `export const VOICE_INTERRUPT_MIN_CHARS = ${Number.isFinite(voiceInterruptMinChars) ? voiceInterruptMinChars : 8};\n` +
    `export const VOICE_BACKCHANNEL_MAX_WORDS = ${Number.isFinite(voiceBackchannelMaxWords) ? voiceBackchannelMaxWords : 2};\n` +
    `export const VOICE_TTS_MIN_CHARS = ${Number.isFinite(voiceTtsMinChars) ? voiceTtsMinChars : 28};\n`,
  "utf8"
);
