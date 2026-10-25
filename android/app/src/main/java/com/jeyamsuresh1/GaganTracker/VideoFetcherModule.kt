package com.jeyamsuresh1.GaganTracker

import android.provider.MediaStore
import com.facebook.react.bridge.*
import org.json.JSONArray
import org.json.JSONObject

class VideoFetcherModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String {
        return "VideoFetcher"
    }

    @ReactMethod
    fun getLocalVideos(promise: Promise) {
        try {
            val jsonArray = JSONArray()
            val projection = arrayOf(
                MediaStore.Video.Media._ID,
                MediaStore.Video.Media.TITLE,
                MediaStore.Video.Media.DATA,
                MediaStore.Video.Media.DURATION,
                MediaStore.Video.Media.SIZE,
                MediaStore.Video.Media.ARTIST,
                MediaStore.Video.Media.ALBUM
            )

            val cursor = reactApplicationContext.contentResolver.query(
                MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                projection,
                null,
                null,
                null
            )

            cursor?.use {
                val idCol = it.getColumnIndexOrThrow(MediaStore.Video.Media._ID)
                val titleCol = it.getColumnIndexOrThrow(MediaStore.Video.Media.TITLE)
                val dataCol = it.getColumnIndexOrThrow(MediaStore.Video.Media.DATA)
                val durationCol = it.getColumnIndexOrThrow(MediaStore.Video.Media.DURATION)
                val sizeCol = it.getColumnIndexOrThrow(MediaStore.Video.Media.SIZE)
                val artistCol = it.getColumnIndex(MediaStore.Video.Media.ARTIST)
                val albumCol = it.getColumnIndex(MediaStore.Video.Media.ALBUM)

                while (it.moveToNext()) {
                    val id = it.getLong(idCol)
                    val title = it.getString(titleCol) ?: "Unknown Video"
                    val data = it.getString(dataCol) ?: ""
                    val duration = it.getLong(durationCol)
                    val size = it.getLong(sizeCol)
                    val artist = if (artistCol != -1) it.getString(artistCol) ?: "Unknown" else "Unknown"
                    val album = if (albumCol != -1) it.getString(albumCol) ?: "Videos" else "Videos"

                    val obj = JSONObject().apply {
                        put("id", id.toString())
                        put("uri", "file://$data")
                        put("title", title)
                        put("duration", duration)
                        put("size", size)
                        put("type", "video")
                        put("artist", artist)
                        put("album", album)
                        put("genre", "Video")
                    }
                    jsonArray.put(obj)
                }
            }
            promise.resolve(jsonArray.toString())
        } catch (e: Exception) {
            promise.reject("VIDEO_FETCH_ERROR", e.message, e)
        }
    }
}
