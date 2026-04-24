import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { AppShell } from "@/components/app-shell";

const repoRoot = path.resolve(process.cwd());

function resolveApkInfo(): { available: boolean; sizeBytes: number; builtAt: string | null } {
  const configured = process.env.GATEWAY_ANDROID_APK_PATH?.trim();
  const candidates = [
    ...(configured ? [path.resolve(repoRoot, configured)] : []),
    path.resolve(repoRoot, "apps/mobile/android/app/build/outputs/apk/release/app-release.apk"),
    path.resolve(repoRoot, "apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk")
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      const s = statSync(p);
      return { available: true, sizeBytes: s.size, builtAt: s.mtime.toISOString() };
    }
  }
  return { available: false, sizeBytes: 0, builtAt: null };
}

export default function DownloadsPage() {
  const apk = resolveApkInfo();
  const sizeMb = apk.available ? (apk.sizeBytes / 1_048_576).toFixed(1) : null;
  const builtAt = apk.builtAt ? new Date(apk.builtAt).toLocaleString() : null;

  return (
    <AppShell title="Downloads">
      <div className="mx-auto max-w-xl space-y-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[color:var(--ink)]">Downloads</h1>
          <p className="mt-1 text-sm text-[color:var(--ink-soft)]">Install Freedom on your Android phone to use Freedom Anywhere.</p>
        </div>

        <div className="rounded-xl border border-[color:var(--line)] bg-white/70 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-base font-semibold text-[color:var(--ink)]">Freedom Android APK</p>
              {apk.available ? (
                <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
                  {sizeMb} MB &nbsp;·&nbsp; Built {builtAt}
                </p>
              ) : (
                <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
                  No APK found. Run <code className="rounded bg-black/5 px-1 py-0.5 text-xs">npm run build:android-release</code> to build one.
                </p>
              )}
            </div>
            {apk.available && (
              <a
                href="/api/android/latest"
                download="freedom-android.apk"
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-[color:var(--ink)] px-4 py-2 text-sm font-medium text-white hover:opacity-80"
              >
                Download APK
              </a>
            )}
          </div>

          {apk.available && (
            <div className="mt-4 rounded-lg border border-[color:var(--line)] bg-[color:var(--surface)] p-4 text-sm text-[color:var(--ink-soft)]">
              <p className="font-medium text-[color:var(--ink)]">Install instructions</p>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>Download the APK to your Android phone.</li>
                <li>Open the file — Android will prompt you to allow installs from unknown sources.</li>
                <li>Tap Install, then open Freedom.</li>
                <li>Pair with your desktop by entering the gateway URL shown on your desktop install page.</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
