package com.parenteye.child.data

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson

class Prefs(context: Context) {
    private val sp: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val gson = Gson()

    fun getApiBaseUrl(): String {
        return sp.getString(KEY_API_BASE_URL, DEFAULT_API_BASE_URL) ?: DEFAULT_API_BASE_URL
    }

    fun setApiBaseUrl(url: String) {
        sp.edit().putString(KEY_API_BASE_URL, url.trim()).apply()
    }

    fun getChildToken(): String? = sp.getString(KEY_CHILD_TOKEN, null)

    fun getChildId(): String? = sp.getString(KEY_CHILD_ID, null)

    fun setChildSession(childToken: String, childId: String) {
        sp.edit()
            .putString(KEY_CHILD_TOKEN, childToken)
            .putString(KEY_CHILD_ID, childId)
            .apply()
    }

    fun clearChildSession() {
        sp.edit()
            .remove(KEY_CHILD_TOKEN)
            .remove(KEY_CHILD_ID)
            .apply()
    }

    fun getScreenTimeLimitMinutes(): Int {
        return sp.getInt(KEY_SCREEN_TIME_LIMIT_MINUTES, 120)
    }

    fun setScreenTimeLimitMinutes(limitMinutes: Int) {
        sp.edit().putInt(KEY_SCREEN_TIME_LIMIT_MINUTES, limitMinutes).apply()
    }

    fun getBlockedApps(): List<String> {
        val json = sp.getString(KEY_BLOCKED_APPS_JSON, null) ?: return emptyList()
        return try {
            val list = gson.fromJson(json, Array<String>::class.java).toList()
            list.map { it.trim() }.filter { it.isNotEmpty() }
        } catch (_: Exception) {
            emptyList()
        }
    }

    fun setBlockedApps(appNames: List<String>) {
        val cleaned = appNames.map { it.trim() }.filter { it.isNotEmpty() }
        sp.edit().putString(KEY_BLOCKED_APPS_JSON, gson.toJson(cleaned)).apply()
    }

    fun getLastConfigFetchMs(): Long {
        return sp.getLong(KEY_LAST_CONFIG_FETCH_MS, 0L)
    }

    fun setLastConfigFetchMs(ms: Long) {
        sp.edit().putLong(KEY_LAST_CONFIG_FETCH_MS, ms).apply()
    }

    fun getUsageDayKey(): String? = sp.getString(KEY_USAGE_DAY_KEY, null)

    fun setUsageDayKey(dayKey: String) {
        sp.edit().putString(KEY_USAGE_DAY_KEY, dayKey).apply()
    }

    fun getUsageMinutesToday(): Int = sp.getInt(KEY_USAGE_MINUTES_TODAY, 0)

    fun setUsageMinutesToday(minutes: Int) {
        sp.edit().putInt(KEY_USAGE_MINUTES_TODAY, minutes).apply()
    }

    fun getLastPackage(): String? = sp.getString(KEY_LAST_PACKAGE, null)

    fun setLastPackage(packageName: String) {
        sp.edit().putString(KEY_LAST_PACKAGE, packageName).apply()
    }

    fun clearLastPackage() {
        sp.edit().remove(KEY_LAST_PACKAGE).apply()
    }

    fun getLastSwitchTimestampMs(): Long = sp.getLong(KEY_LAST_SWITCH_TIMESTAMP_MS, 0L)

    fun setLastSwitchTimestampMs(tsMs: Long) {
        sp.edit().putLong(KEY_LAST_SWITCH_TIMESTAMP_MS, tsMs).apply()
    }

    companion object {
        private const val PREFS_NAME = "parenteye_child_prefs"
        private const val DEFAULT_API_BASE_URL = "http://192.168.8.2:3004"

        private const val KEY_API_BASE_URL = "api_base_url"
        private const val KEY_CHILD_TOKEN = "child_token"
        private const val KEY_CHILD_ID = "child_id"

        private const val KEY_SCREEN_TIME_LIMIT_MINUTES = "screen_time_limit_minutes"
        private const val KEY_BLOCKED_APPS_JSON = "blocked_apps_json"
        private const val KEY_LAST_CONFIG_FETCH_MS = "last_config_fetch_ms"

        private const val KEY_USAGE_DAY_KEY = "usage_day_key"
        private const val KEY_USAGE_MINUTES_TODAY = "usage_minutes_today"
        private const val KEY_LAST_PACKAGE = "usage_last_package"
        private const val KEY_LAST_SWITCH_TIMESTAMP_MS = "usage_last_switch_timestamp_ms"
    }
}

