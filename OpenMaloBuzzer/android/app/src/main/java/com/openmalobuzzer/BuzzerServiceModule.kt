package com.openmalobuzzer

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class BuzzerServiceModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "BuzzerService"

    @ReactMethod
    fun startService(userId: String) {
        val intent = Intent(reactApplicationContext, BuzzerService::class.java).apply {
            action = BuzzerService.ACTION_START
            putExtra(BuzzerService.EXTRA_USER_ID, userId)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            reactApplicationContext.startForegroundService(intent)
        } else {
            reactApplicationContext.startService(intent)
        }
    }

    @ReactMethod
    fun stopService() {
        val intent = Intent(reactApplicationContext, BuzzerService::class.java).apply {
            action = BuzzerService.ACTION_STOP
        }
        reactApplicationContext.startService(intent)
    }

    @ReactMethod
    fun stopAlarm() {
        val intent = Intent(reactApplicationContext, BuzzerService::class.java).apply {
            action = BuzzerService.ACTION_STOP_ALARM
        }
        reactApplicationContext.startService(intent)
    }

    @ReactMethod
    fun getPendingBuzz(promise: Promise) {
        val payload = MainActivity.pendingBuzzPayload
        if (payload != null) {
            val map = Arguments.createMap().apply {
                putString("buzz_id", payload.getString("buzz_id") ?: "")
                putString("from_user_id", payload.getString("from_user_id") ?: "")
                putString("from_user_name", payload.getString("from_user_name") ?: "")
                putString("reason", payload.getString("reason") ?: "")
                putString("note", payload.getString("note") ?: "")
            }
            MainActivity.pendingBuzzPayload = null
            promise.resolve(map)
        } else {
            promise.resolve(null)
        }
    }
}
