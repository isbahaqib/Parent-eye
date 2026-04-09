package com.parenteye.child.access

import android.content.Intent
import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
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
        val staleMs = 20L * 60L * 1000L // 20 minutes
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
                ChildApiClient(prefs).sendTelemetry(
                    TelemetryPayload(
                        activeApp = currentLabel,
                        todayScreenTimeMinutes = newUsageMinutes,
                        riskyEvents = 0,
                        isOnline = true,
                        appName = prevLabel,
                        durationMinutes = minutesSpent,
                        eventTimestamp = nowMs,
                    )
                )
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

