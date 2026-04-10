package com.parenteye.child.utils

import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.SystemClock
import com.parenteye.child.data.Prefs
import java.util.Locale

object PackageUtils {
    private var cachedLabels: Map<String, String> = emptyMap()
    private var cacheLoadedAtMs: Long = 0L

    private const val CACHE_TTL_MS = 24L * 60L * 60L * 1000L // 24 hours

    private fun normalize(s: String): String = s.trim().lowercase(Locale.ROOT)

    private fun ensureLabelCache(context: Context) {
        val now = SystemClock.elapsedRealtime()
        if (now - cacheLoadedAtMs < CACHE_TTL_MS && cachedLabels.isNotEmpty()) return

        val pm: PackageManager = context.packageManager
        val apps = pm.getInstalledApplications(0)

        val map = HashMap<String, String>(apps.size)
        for (app in apps) {
            val pkg = app.packageName
            val label = try {
                app.loadLabel(pm).toString()
            } catch (_: Exception) {
                pkg
            }
            map[pkg] = label
        }

        cachedLabels = map
        cacheLoadedAtMs = now
    }

    fun getAppLabel(context: Context, packageName: String): String {
        ensureLabelCache(context)
        return cachedLabels[packageName] ?: packageName
    }

    fun getLaunchableAppLabels(context: Context): List<String> {
        val pm: PackageManager = context.packageManager
        val launcherIntent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }
        val labels = linkedSetOf<String>()
        val results = pm.queryIntentActivities(launcherIntent, 0)
        for (item in results) {
            val label = try {
                item.loadLabel(pm)?.toString().orEmpty()
            } catch (_: Exception) {
                ""
            }.trim()
            if (label.isNotEmpty()) labels.add(label)
        }
        return labels.sortedBy { it.lowercase(Locale.ROOT) }
    }

    fun isBlockedApp(context: Context, prefs: Prefs, packageName: String): Boolean {
        // Never block the child app itself.
        if (packageName == context.packageName) return false

        ensureLabelCache(context)

        val blocked = prefs.getBlockedApps()
        if (blocked.isEmpty()) return false

        val label = cachedLabels[packageName] ?: packageName

        val pkgNorm = normalize(packageName)
        val labelNorm = normalize(label)

        for (b in blocked) {
            val bNorm = normalize(b)
            if (bNorm.isEmpty()) continue
            // Exact match (label or package).
            if (bNorm == labelNorm || bNorm == pkgNorm) return true
            // Loose match for common cases ("YouTube" vs "YouTube: Shorts").
            if (labelNorm.contains(bNorm) || bNorm.contains(labelNorm)) return true
        }
        return false
    }
}

