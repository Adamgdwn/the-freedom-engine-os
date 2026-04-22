package com.freedommobile

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File

class OfflineModelModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "OfflineModelModule"

  @ReactMethod
  fun ensureBundledModelReady(assetPath: String, fileName: String, promise: Promise) {
    try {
      val modelsDir = File(reactApplicationContext.filesDir, "offline-models")
      if (!modelsDir.exists() && !modelsDir.mkdirs()) {
        throw IllegalStateException("Could not create offline model directory.")
      }

      val destinationFile = File(modelsDir, fileName)
      if (destinationFile.exists() && destinationFile.length() > 0L) {
        promise.resolve(destinationFile.absolutePath)
        return
      }

      val tempFile = File(modelsDir, "$fileName.tmp")
      reactApplicationContext.assets.open(assetPath).use { input ->
        tempFile.outputStream().use { output ->
          input.copyTo(output)
          output.flush()
        }
      }

      if (tempFile.length() <= 0L) {
        tempFile.delete()
        throw IllegalStateException("Bundled offline model extraction produced an empty file.")
      }

      if (destinationFile.exists()) {
        destinationFile.delete()
      }
      if (!tempFile.renameTo(destinationFile)) {
        tempFile.delete()
        throw IllegalStateException("Could not move the bundled offline model into app storage.")
      }

      promise.resolve(destinationFile.absolutePath)
    } catch (error: Exception) {
      promise.reject("offline_model_extract_failed", error.message, error)
    }
  }
}
