package com.jeyamsuresh1.GaganTracker

import android.provider.MediaStore
import com.facebook.react.bridge.*
import org.json.JSONArray
import org.json.JSONObject

class AudioFetcherModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String {
        return "AudioFetcher"
    }

    @ReactMethod
    fun getLocalAudio(promise: Promise) {
        try {
            val jsonArray = JSONArray()
            val projection = arrayOf(
                MediaStore.Audio.Media._ID,
                MediaStore.Audio.Media.TITLE,
                MediaStore.Audio.Media.DATA,
                MediaStore.Audio.Media.DURATION,
                MediaStore.Audio.Media.SIZE,
                MediaStore.Audio.Media.ARTIST,
                MediaStore.Audio.Media.ALBUM
            )

            val cursor = reactApplicationContext.contentResolver.query(
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                projection,
                null,
                null,
                null
            )

            cursor?.use {
                val idCol = it.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
                val titleCol = it.getColumnIndexOrThrow(MediaStore.Audio.Media.TITLE)
                val dataCol = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DATA)
                val durationCol = it.getColumnIndexOrThrow(MediaStore.Audio.Media.DURATION)
                val sizeCol = it.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE)
                val artistCol = it.getColumnIndex(MediaStore.Audio.Media.ARTIST)
                val albumCol = it.getColumnIndex(MediaStore.Audio.Media.ALBUM)

                while (it.moveToNext()) {
                    val id = it.getLong(idCol)
                    val title = it.getString(titleCol) ?: "Unknown Track"
                    val data = it.getString(dataCol) ?: ""
                    val duration = it.getLong(durationCol)
                    val size = it.getLong(sizeCol)
                    val artist = if (artistCol != -1) it.getString(artistCol) ?: "Unknown Artist" else "Unknown Artist"
                    val album = if (albumCol != -1) it.getString(albumCol) ?: "Unknown Album" else "Unknown Album"

                    val obj = JSONObject().apply {
                        put("id", id.toString())
                        put("uri", "file://$data")
                        put("title", title)
                        put("duration", duration)
                        put("size", size)
                        put("type", "audio")
                        put("artist", artist)
                        put("album", album)
                        put("genre", "Music")
                    }
                    jsonArray.put(obj)
                }
            }
            promise.resolve(jsonArray.toString())
        } catch (e: Exception) {
            promise.reject("AUDIO_FETCH_ERROR", e.message, e)
        }
    }
}
