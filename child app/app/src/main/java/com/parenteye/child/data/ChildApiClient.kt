package com.parenteye.child.data

import com.google.gson.Gson
import com.parenteye.child.model.ChildConfig
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

class ChildApiClient(private val prefs: Prefs) {
    private val http = OkHttpClient()
    private val gson = Gson()

    private fun apiUrl(path: String): String {
        var base = prefs.getApiBaseUrl().trim()
        if (!base.startsWith("http://") && !base.startsWith("https://")) {
            base = "http://$base"
        }
        base = base.trimEnd('/')
        if (base.endsWith("/api")) {
            base = base.removeSuffix("/api")
        }
        return "$base$path"
    }

    @Throws(IOException::class)
    fun confirmLink(
        linkCode: String,
        childName: String?,
        deviceName: String?,
    ): ConfirmLinkResult {
        val platform = "android"
        val payload = mapOf(
            "code" to linkCode,
            "childName" to childName.orEmpty(),
            "deviceName" to deviceName.orEmpty(),
            "platform" to platform
        )
        val bodyJson = gson.toJson(payload)
        val request = Request.Builder()
            .url(apiUrl("/api/child/link/confirm"))
            .post(bodyJson.toRequestBody(JSON_MEDIA_TYPE))
            .build()

        http.newCall(request).execute().use { resp ->
            val raw = resp.body?.string().orEmpty()
            if (!resp.isSuccessful) {
                // Backend often returns { error } or plain { message }.
                val err = parseErrorMessage(raw) ?: "Link confirm failed"
                throw IOException(err)
            }
            val parsed = gson.fromJson(raw, ConfirmLinkResponse::class.java)
            if (parsed.childToken.isNullOrBlank() || parsed.child?.id.isNullOrBlank()) {
                throw IOException("Unexpected link confirm response")
            }
            val child = parsed.child!!
            return ConfirmLinkResult(
                childToken = parsed.childToken!!,
                childId = child.id!!,
                screenTimeLimitMinutes = child.screenTimeLimitMinutes ?: 0,
                blockedApps = child.blockedApps ?: emptyList()
            )
        }
    }

    @Throws(IOException::class)
    fun fetchChildConfig(): ChildConfig {
        val childToken = prefs.getChildToken()
            ?: throw IOException("Missing child token. Pair first.")

        val request = Request.Builder()
            .url(apiUrl("/api/child/config"))
            .get()
            .header("Authorization", "Bearer $childToken")
            .build()

        http.newCall(request).execute().use { resp ->
            val raw = resp.body?.string().orEmpty()
            if (!resp.isSuccessful) {
                val err = parseErrorMessage(raw) ?: "Config fetch failed"
                throw IOException(err)
            }
            val parsed = gson.fromJson(raw, ChildConfigResponse::class.java)
            return ChildConfig(
                childId = parsed.childId,
                screenTimeLimitMinutes = parsed.screenTimeLimitMinutes,
                blockedApps = parsed.blockedApps
            )
        }
    }

    @Throws(IOException::class)
    fun sendTelemetry(payload: TelemetryPayload) {
        val childToken = prefs.getChildToken()
            ?: throw IOException("Missing child token. Pair first.")

        val bodyJson = gson.toJson(payload)
        val request = Request.Builder()
            .url(apiUrl("/api/child/telemetry"))
            .post(bodyJson.toRequestBody(JSON_MEDIA_TYPE))
            .header("Authorization", "Bearer $childToken")
            .build()

        http.newCall(request).execute().use { resp ->
            if (!resp.isSuccessful) {
                val raw = resp.body?.string().orEmpty()
                val err = parseErrorMessage(raw) ?: "Telemetry failed"
                throw IOException(err)
            }
        }
    }

    private fun parseErrorMessage(raw: String): String? {
        if (raw.isBlank()) return null
        return try {
            val map = gson.fromJson(raw, Map::class.java)
            when {
                map["error"] != null -> map["error"].toString()
                map["message"] != null -> map["message"].toString()
                else -> null
            }
        } catch (_: Exception) {
            null
        }
    }

    data class ConfirmLinkResult(
        val childToken: String,
        val childId: String,
        val screenTimeLimitMinutes: Int,
        val blockedApps: List<String>
    )

    data class ConfirmLinkResponse(
        val message: String? = null,
        val childToken: String? = null,
        val child: ChildToApiChild? = null,
    )

    data class ChildToApiChild(
        val id: String? = null,
        val screenTimeLimitMinutes: Int? = null,
        val blockedApps: List<String>? = null
    )

    data class ChildConfigResponse(
        val childId: String,
        val screenTimeLimitMinutes: Int,
        val blockedApps: List<String>
    )

    data class TelemetryPayload(
        val location: String? = null,
        val battery: Int? = null,
        val activeApp: String? = null,
        val todayScreenTimeMinutes: Int? = null,
        val riskyEvents: Int? = null,
        val isOnline: Boolean? = null,
        val appName: String? = null,
        val durationMinutes: Int? = null,
        val eventTimestamp: Long? = null,
        val harmfulContentDetected: Boolean? = null,
        val harmfulCategory: String? = null,
        val harmfulContentText: String? = null
    )

    companion object {
        private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()
    }
}

