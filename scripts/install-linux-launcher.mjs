import { chmod, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const applicationsDir = path.join(os.homedir(), ".local", "share", "applications");
const desktopFilePath = path.join(applicationsDir, "freedom-desktop.desktop");
const iconPath = path.join(repoRoot, "apps/desktop/assets/freedom-icon.png");
const launcherScriptPath = path.join(repoRoot, "scripts/launch-freedom-desktop.sh");

const desktopFile = `[Desktop Entry]
Version=1.0
Type=Application
Name=Freedom Desktop
Comment=Launch the Freedom native desktop shell and local services
Exec=${launcherScriptPath}
Path=${repoRoot}
Icon=${iconPath}
Terminal=false
Categories=Development;Utility;
StartupNotify=true
`;

await mkdir(applicationsDir, { recursive: true });
for (const entry of await readdir(applicationsDir, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".desktop") || entry.name === path.basename(desktopFilePath)) {
    continue;
  }

  const candidatePath = path.join(applicationsDir, entry.name);
  try {
    const contents = await readFile(candidatePath, "utf8");
    if (contents.includes("Name=Freedom Desktop")) {
      await rm(candidatePath, { force: true });
    }
  } catch {
    // Ignore unreadable desktop entries and keep installing the current launcher.
  }
}
await writeFile(desktopFilePath, desktopFile, "utf8");
await chmod(desktopFilePath, 0o755);
await chmod(launcherScriptPath, 0o755);

process.stdout.write(`Installed launcher at ${desktopFilePath}\n`);
