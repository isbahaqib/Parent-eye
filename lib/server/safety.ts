import type { ChildRecord } from "@/lib/server/types";

export type ChildAgeGroup = "under_13" | "13_to_15" | "16_plus";

export function detectAgeGroup(age: number | null | undefined): ChildAgeGroup {
  if (age == null || age < 13) return "under_13";
  if (age <= 15) return "13_to_15";
  return "16_plus";
}

export function recommendedBlocksByAgeGroup(ageGroup: ChildAgeGroup) {
  if (ageGroup === "under_13") {
    return {
      blockedApps: ["TikTok", "Discord", "Snapchat"],
      blockedWebsites: ["reddit.com", "x.com", "discord.com"],
      screenTimeLimitMinutes: 120,
    };
  }
  if (ageGroup === "13_to_15") {
    return {
      blockedApps: ["TikTok"],
      blockedWebsites: ["reddit.com"],
      screenTimeLimitMinutes: 150,
    };
  }
  return {
    blockedApps: [],
    blockedWebsites: [],
    screenTimeLimitMinutes: 210,
  };
}

export function computeSuspiciousSignals(child: ChildRecord): string[] {
  const signals: string[] = [];
  if ((child.riskyEvents ?? 0) > 0) signals.push("Risky content interactions detected");
  if ((child.todayScreenTimeMinutes ?? 0) > (child.screenTimeLimitMinutes ?? 0)) {
    signals.push("Screen-time limit exceeded");
  }
  if ((child.activeApp || "").toLowerCase().includes("unknown")) {
    signals.push("Unknown active app sessions");
  }
  if ((child.battery ?? 100) < 15) signals.push("Low battery during monitoring window");
  return signals;
}

export function computeSuspiciousScore(child: ChildRecord): number {
  const overuse = Math.max(
    0,
    (child.todayScreenTimeMinutes ?? 0) - Math.max(1, child.screenTimeLimitMinutes ?? 1)
  );
  const score =
    (child.riskyEvents ?? 0) * 25 + Math.min(30, Math.round(overuse / 10)) + (child.battery < 15 ? 5 : 0);
  return Math.min(100, Math.max(0, score));
}
