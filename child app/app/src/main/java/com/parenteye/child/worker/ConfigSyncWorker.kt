package com.parenteye.child.worker

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import com.parenteye.child.data.ChildApiClient
import com.parenteye.child.data.Prefs
import java.util.concurrent.TimeUnit

class ConfigSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters,
) : Worker(appContext, workerParams) {

    override fun doWork(): Result {
        val prefs = Prefs(applicationContext)
        val token = prefs.getChildToken() ?: return Result.success()

        return try {
            val api = ChildApiClient(prefs)
            val config = api.fetchChildConfig()
            prefs.setScreenTimeLimitMinutes(config.screenTimeLimitMinutes)
            prefs.setBlockedApps(config.blockedApps)
            prefs.setLastConfigFetchMs(System.currentTimeMillis())
            Result.success()
        } catch (_e: Exception) {
            // Retry later on transient network issues.
            Result.retry()
        }
    }
}

