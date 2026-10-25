package com.jeyamsuresh1.GaganTracker

import android.media.MediaMetadataRetriever
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileOutputStream

class AudioArtworkModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AudioArtwork"
    }

    @ReactMethod
    fun getArtwork(fileUri: String, promise: Promise) {
        val retriever = MediaMetadataRetriever()
        try {
            retriever.setDataSource(fileUri)
            val artworkBytes = retriever.embeddedPicture

            if (artworkBytes != null) {
                // Use a hash of the URI so we don't extract the same image twice
                val fileName = "artwork_${fileUri.hashCode()}.jpg"
                val file = File(reactContext.cacheDir, fileName)

                // Only write to disk if it hasn't been cached yet
                if (!file.exists()) {
                    val fos = FileOutputStream(file)
                    fos.write(artworkBytes)
                    fos.close()
                }

                promise.resolve("file://${file.absolutePath}")
            } else {
                promise.resolve(null) // No embedded artwork found
            }
        } catch (e: Exception) {
            promise.reject("ARTWORK_ERROR", e.message)
        } finally {
            retriever.release()
        }
    }
}
