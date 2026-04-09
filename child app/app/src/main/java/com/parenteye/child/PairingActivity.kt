package com.parenteye.child

import android.os.Bundle
import android.os.Build
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.parenteye.child.data.ChildApiClient
import com.parenteye.child.data.Prefs
import com.parenteye.child.worker.ConfigSyncScheduler

class PairingActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_pairing)

        val prefs = Prefs(this)

        val apiUrlInput = findViewById<EditText>(R.id.apiUrlInput)
        val linkCodeInput = findViewById<EditText>(R.id.linkCodeInput)
        val childNameInput = findViewById<EditText>(R.id.childNameInput)
        val deviceNameInput = findViewById<EditText>(R.id.deviceNameInput)

        val connectButton = findViewById<Button>(R.id.connectButton)
        val enableAccessibilityButton = findViewById<Button>(R.id.enableAccessibilityButton)
        val errorText = findViewById<TextView>(R.id.errorText)

        apiUrlInput.setText(prefs.getApiBaseUrl())
        if (deviceNameInput.text.isNullOrBlank()) {
            val model = "${Build.MANUFACTURER} ${Build.MODEL}".trim()
            deviceNameInput.setText(model)
        }
        // Child app should stay as a login/pairing-only screen.
        enableAccessibilityButton.visibility = View.GONE

        connectButton.setOnClickListener {
            errorText.visibility = android.view.View.GONE

            val linkCode = linkCodeInput.text.toString().trim()
            val childName = childNameInput.text?.toString()?.trim()
            val deviceName = deviceNameInput.text?.toString()?.trim()
            val apiUrl = apiUrlInput.text.toString().trim()

            if (linkCode.length != 6) {
                errorText.text = "Link code must be 6 digits."
                errorText.visibility = android.view.View.VISIBLE
                return@setOnClickListener
            }

            // Save API URL before calling backend.
            prefs.setApiBaseUrl(apiUrl)

            // Best-effort network call on a background thread.
            connectButton.isEnabled = false
            Thread {
                try {
                    val api = ChildApiClient(prefs)
                    val result = api.confirmLink(linkCode, childName, deviceName)

                    prefs.setChildSession(result.childToken, result.childId)
                    prefs.setScreenTimeLimitMinutes(result.screenTimeLimitMinutes)
                    prefs.setBlockedApps(result.blockedApps)

                    ConfigSyncScheduler.schedule(this)

                    runOnUiThread {
                        connectButton.isEnabled = true
                        Toast.makeText(this, "Connected", Toast.LENGTH_SHORT).show()
                        // Keep user on this login/pairing screen only.
                        linkCodeInput.text?.clear()
                    }
                } catch (e: Exception) {
                    runOnUiThread {
                        connectButton.isEnabled = true
                        errorText.text = e.message ?: "Connection failed"
                        errorText.visibility = android.view.View.VISIBLE
                    }
                }
            }.start()
        }
    }
}

