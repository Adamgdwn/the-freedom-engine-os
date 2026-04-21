import fs from "node:fs";
import path from "node:path";

const voiceModulePath = path.resolve(
  process.cwd(),
  "node_modules/@react-native-voice/voice/android/src/main/java/com/wenkesj/voice/VoiceModule.java"
);

const source = fs.readFileSync(voiceModulePath, "utf8");

const unsafeBlock = `    ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
    for (String result : matches) {
      arr.pushString(result);
    }`;
const safeBlock = `    ArrayList<String> matches = results != null ? results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) : null;
    if (matches != null) {
      for (String result : matches) {
        arr.pushString(result);
      }
    }`;

let updated = source;
updated = updated.split(unsafeBlock).join(safeBlock);

if (updated === source) {
  if (
    source.includes("results != null ? results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) : null")
  ) {
    process.stdout.write("react-native-voice null guards already present\n");
    process.exit(0);
  }

  throw new Error("Could not apply react-native-voice null-guard patch; source layout changed.");
}

fs.writeFileSync(voiceModulePath, updated);
process.stdout.write("Applied react-native-voice null guards\n");
