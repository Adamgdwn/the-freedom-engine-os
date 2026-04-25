import { Platform } from "react-native";
import { getBackendDevicesInfo, initLlama, type LlamaContext, type RNLlamaOAICompatibleMessage } from "llama.rn";
import { ensureBundledOfflineModelPath } from "./offlineModelNative";

export type OfflineModelState = "missing" | "extracting" | "ready" | "failed";

const OFFLINE_MODEL_FILE_NAME = "qwen2.5-1.5b-instruct-q4_k_m.gguf";
const OFFLINE_MODEL_ASSET_PATH = `models/${OFFLINE_MODEL_FILE_NAME}`;
const STOP_WORDS = [
  "</s>",
  "<|end|>",
  "<|eot_id|>",
  "<|end_of_text|>",
  "<|im_end|>",
  "<|EOT|>",
  "<|END_OF_TURN_TOKEN|>",
  "<|end_of_turn|>",
  "<|endoftext|>"
];

export const OFFLINE_ASSISTANT_SYSTEM_PROMPT = [
  "You are Freedom's offline mobile ideation companion.",
  "You can help with ideation, planning, decomposition, drafting, summaries, and high-level reasoning.",
  "You only know the cached conversation context shown here.",
  "You can inspect the offline-work cache summary that this phone provides in the prompt context. Treat that summary as authoritative for what is stored locally on this phone right now.",
  "You can also inspect the system state snapshot that this phone provides in the prompt context. Treat that snapshot as authoritative for the phone and desktop-linked parameters it lists right now.",
  "Do not claim to execute tools, inspect live desktop state, send email, route builds, scaffold code right now, search the live web, or confirm canonical sync.",
  "Freedom's full governed runtime can inspect approved code and repo control files when the desktop lane is active, so be honest that this offline lane cannot do that live while still acknowledging the broader capability.",
  "If asked about an offline folder, explain that Freedom Anywhere stores offline work in this app's local cache on the phone rather than a browsable phone folder unless the prompt context says otherwise.",
  "If asked to do live actions, explain that you are offline and can help draft the next step instead.",
  "Keep answers concise, practical, and honest about limitations."
].join(" ");

export class OfflineAssistantService {
  private context: LlamaContext | null = null;
  private state: OfflineModelState = "missing";
  private detail: string | null = null;
  private resolvedModelPath: string | null = null;
  private selectedDevices: string[] = [];

  getStatus(): { state: OfflineModelState; detail: string | null; modelPath: string } {
    return {
      state: this.state,
      detail: this.detail,
      modelPath: this.resolvedModelPath ?? OFFLINE_MODEL_ASSET_PATH
    };
  }

  async ensureReady(onStatus?: (state: OfflineModelState, detail: string | null) => void): Promise<{ state: OfflineModelState; detail: string | null }> {
    if (this.context) {
      this.state = "ready";
      this.detail = `Bundled model ready at ${OFFLINE_MODEL_FILE_NAME}.`;
      return { state: this.state, detail: this.detail };
    }

    this.state = "extracting";
    this.detail = "Preparing the bundled offline model on this phone.";
    onStatus?.(this.state, this.detail);

    try {
      if (Platform.OS !== "android") {
        throw new Error("Offline on-device ideation is packaged only for Android in this release.");
      }

      this.resolvedModelPath = await ensureBundledOfflineModelPath(OFFLINE_MODEL_ASSET_PATH, OFFLINE_MODEL_FILE_NAME);
      this.detail = "Selecting the safest on-device runtime for offline ideation.";
      onStatus?.(this.state, this.detail);

      this.selectedDevices = await selectOfflineDevices();
      this.context = await initLlama({
        model: this.resolvedModelPath,
        n_ctx: 2048,
        n_batch: 256,
        n_threads: 4,
        n_gpu_layers: 0,
        use_mlock: false,
        devices: this.selectedDevices
      });
      this.state = "ready";
      this.detail = `Bundled model ready from ${this.selectedDevices.join(", ")} at ${this.resolvedModelPath}.`;
      onStatus?.(this.state, this.detail);
      return { state: this.state, detail: this.detail };
    } catch (error) {
      this.context = null;
      this.state = "failed";
      this.detail = error instanceof Error ? error.message : "Offline model preparation failed.";
      onStatus?.(this.state, this.detail);
      throw error;
    }
  }

  async generateReply(input: {
    messages: RNLlamaOAICompatibleMessage[];
    onToken?(text: string): void;
    nPredict?: number;
    temperature?: number;
  }): Promise<string> {
    await this.ensureReady();
    if (!this.context) {
      throw new Error("Offline assistant model is not ready.");
    }

    const result = await this.context.completion(
      {
        messages: input.messages,
        n_predict: input.nPredict ?? 320,
        temperature: input.temperature ?? 0.55,
        stop: STOP_WORDS,
        force_pure_content: true
      },
      (data) => {
        const nextText = data.accumulated_text ?? data.content ?? data.token ?? "";
        if (nextText) {
          input.onToken?.(nextText);
        }
      }
    );

    return result.text.trim();
  }

  async stop(): Promise<void> {
    if (!this.context) {
      return;
    }
    await this.context.stopCompletion();
  }
}

async function selectOfflineDevices(): Promise<string[]> {
  const backendDevices = await getBackendDevicesInfo();
  const cpuDevice = backendDevices.find((device) => device.type === "cpu");
  if (cpuDevice?.deviceName) {
    return [cpuDevice.deviceName];
  }
  return ["CPU"];
}
