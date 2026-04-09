package com.parenteye.child

import android.content.Intent
import android.os.Bundle
import android.provider.Settings
import android.widget.Button
import android.accessibilityservice.AccessibilityServiceInfo
import androidx.appcompat.app.AppCompatActivity
import android.view.accessibility.AccessibilityManager
import com.parenteye.child.access.MyAccessibilityService

class AccessibilitySetupActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_accessibility_setup)

        val openSettingsButton = findViewById<Button>(R.id.openSettingsButton)
        openSettingsButton.setOnClickListener {
            startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
        }

        // If accessibility is enabled, we can go back to dashboard.
        val checkEnabledButton = findViewById<Button>(R.id.checkEnabledButton)
        checkEnabledButton.setOnClickListener {
            if (isAccessibilityServiceEnabled()) {
                startActivity(Intent(this, MainActivity::class.java).apply {
                    addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                })
                finish()
            }
        }
    }

    private fun isAccessibilityServiceEnabled(): Boolean {
        val am = getSystemService(AccessibilityManager::class.java) ?: return false
        val enabledServices = am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
        val targetPkg = packageName
        val targetServiceName = MyAccessibilityService::class.java.name
        return enabledServices.any { info: AccessibilityServiceInfo ->
            val serviceInfo = info.resolveInfo?.serviceInfo
            serviceInfo?.packageName == targetPkg && serviceInfo?.name == targetServiceName
        }
    }
}

