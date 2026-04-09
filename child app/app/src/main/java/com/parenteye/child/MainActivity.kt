package com.parenteye.child

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.google.android.material.chip.Chip
import com.parenteye.child.data.Prefs
import com.parenteye.child.worker.ConfigSyncWorker
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {
    private lateinit var prefs: Prefs
    private lateinit var statusText: TextView
    private lateinit var childIdText: TextView
    private lateinit var screenTimeLimitText: TextView
    private lateinit var blockedAppsChipGroup: com.google.android.material.chip.ChipGroup
    private lateinit var noBlockedAppsText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        prefs = Prefs(this)
        if (prefs.getChildToken().isNullOrBlank() || prefs.getChildId().isNullOrBlank()) {
            startActivity(Intent(this, PairingActivity::class.java))
            finish()
            return
        }

        statusText = findViewById(R.id.statusText)
        childIdText = findViewById(R.id.childIdText)
        screenTimeLimitText = findViewById(R.id.screenTimeLimitText)
        blockedAppsChipGroup = findViewById(R.id.blockedAppsChipGroup)
        noBlockedAppsText = findViewById(R.id.noBlockedAppsText)

        val enableAccessibilityButton = findViewById<Button>(R.id.enableAccessibilityButton)
        val refreshConfigButton = findViewById<Button>(R.id.refreshConfigButton)

        renderUi()

        enableAccessibilityButton.setOnClickListener {
            startActivity(Intent(this, AccessibilitySetupActivity::class.java))
        }

        refreshConfigButton.setOnClickListener {
            refreshConfig()
        }
    }

    private fun renderUi() {
        statusText.text = getString(R.string.status_connected)
        childIdText.text = "Child ID: ${prefs.getChildId()}"
        screenTimeLimitText.text = "Screen time limit: ${prefs.getScreenTimeLimitMinutes()} minutes"

        blockedAppsChipGroup.removeAllViews()
        val blocked = prefs.getBlockedApps()
        if (blocked.isEmpty()) {
            noBlockedAppsText.visibility = android.view.View.VISIBLE
            return
        }
        noBlockedAppsText.visibility = android.view.View.GONE
        for (appName in blocked) {
            val chip = Chip(this).apply {
                text = appName
                isClickable = false
            }
            blockedAppsChipGroup.addView(chip)
        }
    }

    private fun refreshConfig() {
        Toast.makeText(this, "Refreshing parent config...", Toast.LENGTH_SHORT).show()

        val request = OneTimeWorkRequestBuilder<ConfigSyncWorker>()
            .setInitialDelay(0, TimeUnit.SECONDS)
            .build()

        val wm = WorkManager.getInstance(this)
        wm.enqueue(request)

        wm.getWorkInfoByIdLiveData(request.id).observe(this) { info ->
            if (info == null) return@observe
            if (info.state.isFinished) {
                runOnUiThread {
                    // ConfigSyncWorker updates prefs; we then re-render the UI.
                    renderUi()
                    Toast.makeText(this, "Config updated", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}

