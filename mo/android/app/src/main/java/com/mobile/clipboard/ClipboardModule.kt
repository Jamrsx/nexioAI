package com.mobile.clipboard

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ClipboardModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "NexioClipboard"

  @ReactMethod
  fun setString(text: String, promise: Promise) {
    try {
      val clipboard =
        reactApplicationContext.getSystemService(Context.CLIPBOARD_SERVICE) as
          ClipboardManager
      clipboard.setPrimaryClip(ClipData.newPlainText("nexio", text))
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("CLIPBOARD_ERROR", e.message, e)
    }
  }
}
