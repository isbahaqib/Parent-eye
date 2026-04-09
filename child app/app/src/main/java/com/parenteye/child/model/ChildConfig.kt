package com.parenteye.child.model

data class ChildConfig(
    val childId: String,
    val screenTimeLimitMinutes: Int,
    val blockedApps: List<String>
)

