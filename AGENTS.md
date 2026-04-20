# Agent Instructions

Before making substantial code or configuration changes in this repository:

1. run the governance preflight check
2. review `project-control.yaml`
3. note any open exceptions relevant to the work
4. proceed only after the project passes preflight or any gaps are explicitly accepted

## Preflight

```bash
bash scripts/governance-preflight.sh
```

## Working Rules

- Follow the repository standards by default.
- Do not silently skip required documentation or controls.
- Record justified deviations as exceptions.
- Reassess governance when risk, autonomy, data sensitivity, or money movement changes.
- When a task changes the Android mobile companion in a user-visible way, do not stop at
  source edits or a local APK build. Treat the task as incomplete until the new APK is:
  1. built with a new `versionCode` / `versionName`
  2. published to the live install surface with `npm run release:android-live` or, if it
     is already built, `npm run publish:android-release`
  3. verified at the local artifact path
     `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`
     and on the live install surface:
     `http://pop-os.taildcb5c5.ts.net:43111/install`
     plus the build-specific APK URL shown there
  4. reported back to the user with:
     - the local artifact path
     - the live install page URL
     - the build-specific live APK URL
  5. do not rely only on `latest.apk` when handing off a release; confirm the install page
     shows the intended build identifier and prefer the build-specific APK link
