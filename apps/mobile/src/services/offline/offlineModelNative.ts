import { NativeModules, Platform } from "react-native";

type OfflineModelModuleShape = {
  ensureBundledModelReady(assetPath: string, fileName: string): Promise<string>;
};

const offlineModelModule = NativeModules.OfflineModelModule as OfflineModelModuleShape | undefined;

export async function ensureBundledOfflineModelPath(assetPath: string, fileName: string): Promise<string> {
  if (Platform.OS !== "android") {
    throw new Error("Offline bundled model extraction is only available on Android in this release.");
  }

  if (!offlineModelModule?.ensureBundledModelReady) {
    throw new Error("Offline bundled model module is unavailable in this build.");
  }

  const modelPath = await offlineModelModule.ensureBundledModelReady(assetPath, fileName);
  if (!modelPath || typeof modelPath !== "string") {
    throw new Error("Offline bundled model extraction returned an invalid file path.");
  }
  return modelPath;
}
