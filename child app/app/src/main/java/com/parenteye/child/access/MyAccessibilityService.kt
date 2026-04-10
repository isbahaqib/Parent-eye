package com.parenteye.child.access

import android.content.Intent
import android.accessibilityservice.AccessibilityService
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.location.LocationManager
import android.os.BatteryManager
import android.view.accessibility.AccessibilityEvent
import androidx.core.content.ContextCompat
import com.parenteye.child.BlockOverlayActivity
import com.parenteye.child.data.ChildApiClient
import com.parenteye.child.data.Prefs
import com.parenteye.child.data.ChildApiClient.TelemetryPayload
import com.parenteye.child.utils.PackageUtils
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.atomic.AtomicLong
import kotlin.math.max

class MyAccessibilityService : AccessibilityService() {
    private lateinit var prefs: Prefs
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private val lastEnforcedAtMs = AtomicLong(0L)
    private val enforceThrottleMs = 10_000L
    private val dayKeyFormatter = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    private val lastConfigRefreshAttemptAtMs = AtomicLong(0L)
    private val lastInstalledAppsSentAtMs = AtomicLong(0L)

    private fun getBatteryPercent(): Int? {
        return try {
            val intent = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED)) ?: return null
            val level = intent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1)
            val scale = intent.getIntExtra(BatteryManager.EXTRA_SCALE, -1)
            if (level >= 0 && scale > 0) ((level * 100f) / scale).toInt() else null
        } catch (_: Exception) {
            null
        }
    }

    private fun getBestEffortLocation(): String? {
        val fineGranted =
            ContextCompat.checkSelfPermission(
                applicationContext,
                android.Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        val coarseGranted =
            ContextCompat.checkSelfPermission(
                applicationContext,
                android.Manifest.permission.ACCESS_COARSE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED
        if (!fineGranted && !coarseGranted) return null
        return try {
            val lm = applicationContext.getSystemService(LOCATION_SERVICE) as? LocationManager ?: return null
            val providers = lm.getProviders(true)
            var best: android.location.Location? = null
            for (provider in providers) {
                val loc = lm.getLastKnownLocation(provider) ?: continue
                if (best == null || loc.time > best.time) best = loc
            }
            best?.let { "${it.latitude},${it.longitude}" }
        } catch (_: Exception) {
            null
        }
    }

    override fun onServiceConnected() {
        prefs = Prefs(applicationContext)
        super.onServiceConnected()
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

        val pkg = event.packageName?.toString() ?: return
        // Don't react to events coming from our own app UI.
        if (pkg == applicationContext.packageName) return

        val nowMs = System.currentTimeMillis()
        val todayKey = dayKeyFormatter.format(Date(nowMs))

        // If the parent updates rules, we won't see it until the periodic Worker runs.
        // Refresh config opportunistically when it looks stale.
        val lastFetch = prefs.getLastConfigFetchMs()
        val staleMs = 30L * 1000L // 30 seconds
        if (lastFetch == 0L || nowMs - lastFetch > staleMs) {
            val lastAttempt = lastConfigRefreshAttemptAtMs.get()
            if (nowMs - lastAttempt > staleMs) {
                lastConfigRefreshAttemptAtMs.set(nowMs)
                scope.launch {
                    try {
                        val api = ChildApiClient(prefs)
                        val config = api.fetchChildConfig()
                        prefs.setScreenTimeLimitMinutes(config.screenTimeLimitMinutes)
                        prefs.setBlockedApps(config.blockedApps)
                        prefs.setLastConfigFetchMs(System.currentTimeMillis())
                    } catch (_: Exception) {
                        // Ignore and keep enforcing with cached config.
                    }
                }
            }
        }

        val storedDayKey = prefs.getUsageDayKey()
        if (storedDayKey == null || storedDayKey != todayKey) {
            // New day -> reset today's counters.
            prefs.setUsageDayKey(todayKey)
            prefs.setUsageMinutesToday(0)
            prefs.clearLastPackage()
            prefs.setLastSwitchTimestampMs(nowMs)
        }

        // Enforce blocked apps immediately on foreground change, even before usage accounting.
        // This avoids a bypass where the first observed blocked app could open briefly.
        val immediateBlocked = PackageUtils.isBlockedApp(applicationContext, prefs, pkg)
        if (immediateBlocked) {
            val last = lastEnforcedAtMs.get()
            if (nowMs - last >= enforceThrottleMs) {
                lastEnforcedAtMs.set(nowMs)
                try {
                    performGlobalAction(GLOBAL_ACTION_HOME)
                } catch (_: Exception) {
                }
                val currentLabel = PackageUtils.getAppLabel(applicationContext, pkg)
                val intent = Intent(applicationContext, BlockOverlayActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    putExtra(BlockOverlayActivity.EXTRA_REASON, "blocked")
                    putExtra(BlockOverlayActivity.EXTRA_APP_LABEL, currentLabel)
                    putExtra(BlockOverlayActivity.EXTRA_LIMIT_MINUTES, prefs.getScreenTimeLimitMinutes())
                    putExtra(BlockOverlayActivity.EXTRA_USED_MINUTES, prefs.getUsageMinutesToday())
                }
                startActivity(intent)
            }
            return
        }

        val prevPackage = prefs.getLastPackage()
        val prevSwitchTs = prefs.getLastSwitchTimestampMs()

        if (prevPackage == null || prevPackage == pkg) {
            // Initialize switch tracking, but don't add usage for the first observed package.
            if (prevPackage == null) {
                prefs.setLastPackage(pkg)
                prefs.setLastSwitchTimestampMs(nowMs)
            }
            return
        }

        // Package changed -> account time spent on previous package.
        val deltaMs = nowMs - prevSwitchTs
        val minutesSpent = if (deltaMs > 0) max(1, (deltaMs / 60_000L).toInt()) else 0
        val newUsageMinutes = prefs.getUsageMinutesToday() + minutesSpent
        prefs.setUsageMinutesToday(newUsageMinutes)

        val prevLabel = PackageUtils.getAppLabel(applicationContext, prevPackage)
        val currentLabel = PackageUtils.getAppLabel(applicationContext, pkg)

        // Update "current app" pointers first so blocking logic uses the newest usage value.
        prefs.setLastPackage(pkg)
        prefs.setLastSwitchTimestampMs(nowMs)

        // Async telemetry (best effort).
        scope.launch {
            try {
                val lastInstalledSync = lastInstalledAppsSentAtMs.get()
                val includeInstalledApps = nowMs - lastInstalledSync > 5L * 60L * 1000L
                val installedAppsSnapshot =
                    if (includeInstalledApps) PackageUtils.getLaunchableAppLabels(applicationContext) else null
                ChildApiClient(prefs).sendTelemetry(
                    TelemetryPayload(
                        location = getBestEffortLocation(),
                        battery = getBatteryPercent(),
                        activeApp = currentLabel,
                        todayScreenTimeMinutes = newUsageMinutes,
                        riskyEvents = 0,
                        isOnline = true,
                        installedApps = installedAppsSnapshot,
                        appName = prevLabel,
                        durationMinutes = minutesSpent,
                        eventTimestamp = nowMs,
                    )
                )
                if (includeInstalledApps) {
                    lastInstalledAppsSentAtMs.set(nowMs)
                }
            } catch (_: Exception) {
                // Ignore telemetry failures: blocking enforcement should still work.
            }
        }

        val isBlocked = PackageUtils.isBlockedApp(applicationContext, prefs, pkg)
        val limit = prefs.getScreenTimeLimitMinutes()
        val timeLimitExceeded = limit > 0 && newUsageMinutes >= limit

        if (isBlocked || timeLimitExceeded) {
            val last = lastEnforcedAtMs.get()
            if (nowMs - last < enforceThrottleMs) return
            lastEnforcedAtMs.set(nowMs)

            // Reduce ability to return quickly by navigating away.
            try {
                performGlobalAction(GLOBAL_ACTION_HOME)
            } catch (_: Exception) {
            }

            val reason = when {
                isBlocked -> "blocked"
                else -> "time_limit"
            }

            val intent = Intent(applicationContext, BlockOverlayActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                putExtra(BlockOverlayActivity.EXTRA_REASON, reason)
                putExtra(BlockOverlayActivity.EXTRA_APP_LABEL, currentLabel)
                putExtra(BlockOverlayActivity.EXTRA_LIMIT_MINUTES, limit)
                putExtra(BlockOverlayActivity.EXTRA_USED_MINUTES, newUsageMinutes)
            }
            startActivity(intent)
        }
    }

    override fun onInterrupt() {
        // No-op
    }
}

