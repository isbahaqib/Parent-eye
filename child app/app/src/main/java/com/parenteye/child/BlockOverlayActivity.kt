package com.parenteye.child

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import com.parenteye.child.R

class BlockOverlayActivity : AppCompatActivity() {
    companion object {
        const val EXTRA_REASON = "extra_reason"
        const val EXTRA_APP_LABEL = "extra_app_label"
        const val EXTRA_LIMIT_MINUTES = "extra_limit_minutes"
        const val EXTRA_USED_MINUTES = "extra_used_minutes"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_block_overlay)

        val reason = intent.getStringExtra(EXTRA_REASON).orEmpty()
        val appLabel = intent.getStringExtra(EXTRA_APP_LABEL).orEmpty()
        val limitMinutes = intent.getIntExtra(EXTRA_LIMIT_MINUTES, 0)
        val usedMinutes = intent.getIntExtra(EXTRA_USED_MINUTES, 0)

        val title = findViewById<TextView>(R.id.overlayTitle)
        val overlayReason = findViewById<TextView>(R.id.overlayReason)
        val overlayMeta = findViewById<TextView>(R.id.overlayMeta)

        if (reason == "time_limit") {
            title.text = getString(R.string.overlay_time_title)
            overlayReason.text = "You used $usedMinutes minutes today."
            overlayMeta.text = "Parent limit: $limitMinutes minutes"
        } else {
            title.text = getString(R.string.overlay_blocked_title)
            overlayReason.text = appLabel.ifBlank { "This app" }
            overlayMeta.text = "This app is blocked by the parent."
        }

        val backButton = findViewById<Button>(R.id.overlayBackButton)
        backButton.setOnClickListener {
            startActivity(Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            })
            finish()
        }
    }
}

