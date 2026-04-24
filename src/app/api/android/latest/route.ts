import { createReadStream, existsSync, statSync } from "node:fs";
import path from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";

const repoRoot = path.resolve(process.cwd());

function resolveApkPath(): string | null {
  const configured = process.env.GATEWAY_ANDROID_APK_PATH?.trim();
  const candidates = [
    ...(configured ? [path.resolve(repoRoot, configured)] : []),
    path.resolve(repoRoot, "apps/mobile/android/app/build/outputs/apk/release/app-release.apk"),
    path.resolve(repoRoot, "apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk")
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const apkPath = resolveApkPath();
  if (!apkPath) {
    return NextResponse.json({ error: "No APK build found." }, { status: 404 });
  }

  const stats = statSync(apkPath);
  const nodeStream = createReadStream(apkPath);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "content-type": "application/vnd.android.package-archive",
      "content-length": String(stats.size),
      "content-disposition": `attachment; filename="freedom-android.apk"`,
      "cache-control": "no-store"
    }
  });
}
