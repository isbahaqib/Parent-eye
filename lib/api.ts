const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();

/** Shown when fetch fails (offline, wrong URL, CORS, etc.). Compare with `error` from `api()`. */
export const API_NETWORK_ERROR =
  "Unable to connect to backend. Check NEXT_PUBLIC_API_URL, backend server, and CORS settings.";

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
};

export async function api<T>(
  path: string,
  options: RequestOptions = {}
): Promise<{ data?: T; error?: string }> {
  const { method = "GET", body, token, headers = {} } = options;

  const reqHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (token) {
    reqHeaders["Authorization"] = `Bearer ${token}`;
  }

  const requestInit: RequestInit = {
    method,
    headers: reqHeaders,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    credentials: "include",
  };

  const requestTargets = API_URL ? [`${API_URL}${path}`, path] : [path];
  let lastNetworkError: unknown = null;

  for (const target of requestTargets) {
    try {
      const res = await fetch(target, requestInit);
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { error: json.message ?? json.error ?? "Request failed" };
      }

      return { data: json as T };
    } catch (error) {
      lastNetworkError = error;
      if (target === path) {
        console.error("API request failed:", error);
      }
    }
  }

  console.error("API request failed:", lastNetworkError);
  return { error: API_NETWORK_ERROR };
}

// Auth API calls – adjust paths to match your Node backend
export const authApi = {
  login: (email: string, password: string) =>
    api<{ token: string; user: { id: string; email: string; name?: string; role?: "parent" | "super_admin" } }>(
      "/api/auth/login",
      { method: "POST", body: { email, password } }
    ),

  register: (email: string, password: string, name: string) =>
    api<{ message: string }>("/api/auth/register", {
      method: "POST",
      body: { email, password, name },
    }),

  forgotPassword: (email: string) =>
    api<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: { email },
    }),

  resetPassword: (token: string, password: string) =>
    api<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: { token, password },
    }),

  me: (token: string) =>
    api<{ id: string; email: string; name?: string; role?: "parent" | "super_admin" }>("/api/auth/me", {
      token,
    }),

  updatePassword: (token: string, currentPassword: string, newPassword: string) =>
    api<{ message: string }>("/api/auth/password", {
      method: "PATCH",
      token,
      body: { currentPassword, newPassword },
    }),

  deleteAccount: (token: string) =>
    api<{ message: string }>("/api/auth/account", {
      method: "DELETE",
      token,
    }),

  getParentProfile: (token: string) =>
    api<{ user: { id: string; email: string; name: string; createdAt: string } }>(
      "/api/parent/profile",
      { token }
    ),

  updateParentProfile: (token: string, payload: { name?: string; email?: string }) =>
    api<{ message: string; token: string; user: { id: string; email: string; name: string } }>(
      "/api/parent/profile",
      { method: "PATCH", token, body: payload }
    ),

  getParentFullReport: (token: string) =>
    api<{
      summary: { totalParents: number; totalChildren: number };
      isSuperAdmin?: boolean;
      parents: Array<{ id: string; name: string; email: string; role?: "parent" | "super_admin"; createdAt: string }>;
      children: Array<
        {
          id: string;
          parentId: string;
          name: string;
          age: number | null;
          device: string;
          battery: number;
          location: string;
          lastSeen: string;
          todayScreenTimeMinutes: number;
          screenTimeLimitMinutes: number;
          blockedApps: string[];
          installedApps?: string[];
          riskyEvents: number;
          activeApp: string;
          isOnline: boolean;
        } & { parentName: string; parentEmail: string }
      >;
    }>("/api/parent/report", { token }),

  setChildScreenTimeLimit: (token: string, childId: string, limitMinutes: number) =>
    api<{ message: string; child: { id: string; screenTimeLimitMinutes: number } }>(
      `/api/parent/children/${childId}/screen-time-limit`,
      {
        method: "PATCH",
        token,
        body: { limitMinutes },
      }
    ),

  blockChildApp: (token: string, childId: string, appName: string) =>
    api<{ message: string; blockedApps: string[] }>(
      `/api/parent/children/${childId}/apps/block`,
      {
        method: "PATCH",
        token,
        body: { appName },
      }
    ),

  unblockChildApp: (token: string, childId: string, appName: string) =>
    api<{ message: string; blockedApps: string[] }>(
      `/api/parent/children/${childId}/apps/unblock`,
      {
        method: "PATCH",
        token,
        body: { appName },
      }
    ),

  blockChildWebsite: (token: string, childId: string, website: string) =>
    api<{ message: string; blockedWebsites: string[] }>(
      `/api/parent/children/${childId}/websites/block`,
      {
        method: "PATCH",
        token,
        body: { website },
      }
    ),

  unblockChildWebsite: (token: string, childId: string, website: string) =>
    api<{ message: string; blockedWebsites: string[] }>(
      `/api/parent/children/${childId}/websites/unblock`,
      {
        method: "PATCH",
        token,
        body: { website },
      }
    ),

  getChildActivityReport: (
    token: string,
    childId: string,
    range: "day" | "week" | "month"
  ) =>
    api<{
      range: "day" | "week" | "month";
      timeline: { appName: string; startedAt: string; durationMinutes: number }[];
      totalsByApp: Record<string, number>;
      totalsByDay: Record<string, number>;
      suspiciousSignals?: string[];
      suspiciousScore?: number;
      lastSnapshotAt?: string | null;
    }>(`/api/parent/children/${childId}/activity-report?range=${range}`, {
      token,
    }),

  requestChildLinkCode: (token: string, childName?: string) =>
    api<{ code: string; expiresAt: number; message: string }>("/api/parent/link/request", {
      method: "POST",
      token,
      body: childName ? { childName } : {},
    }),

  getParentChildren: (token: string) =>
    api<{
      children: Array<{
        id: string;
        parentId?: string;
        name: string;
        age: number | null;
        device: string;
        battery: number;
        location: string;
        lastSeen: string;
        todayScreenTimeMinutes: number;
        screenTimeLimitMinutes: number;
        blockedApps: string[];
        blockedWebsites?: string[];
        installedApps?: string[];
        riskyEvents: number;
        estimatedAge?: number | null;
        ageConfidence?: number;
        ageGroup?: "under_13" | "13_to_15" | "16_plus";
        suspiciousScore?: number;
        suspiciousSignals?: string[];
        lastSnapshotAt?: string | null;
        activeApp?: string;
        isOnline?: boolean;
      }>;
    }>("/api/parent/children", { token }),

  createChild: (
    token: string,
    payload: {
      name: string;
      age?: number | null;
      device: string;
      battery?: number;
      location?: string;
      screenTimeLimitMinutes?: number;
    }
  ) =>
    api<{ message: string; child: Record<string, unknown> }>("/api/parent/children/add", {
      method: "POST",
      token,
      body: payload,
    }),

  getChildById: (token: string, childId: string) =>
    api<{ child: Record<string, unknown> }>(`/api/parent/children/${childId}`, { token }),

  updateChild: (token: string, childId: string, payload: Record<string, unknown>) =>
    api<{ message: string; child: Record<string, unknown> }>(
      `/api/parent/children/${childId}/edit`,
      {
      method: "PATCH",
      token,
      body: payload,
      }
    ),

  deleteChild: (token: string, childId: string) =>
    api<{ message: string }>(`/api/parent/children/${childId}/delete`, {
      method: "DELETE",
      token,
    }),

  getParentAlerts: (token: string, unreadOnly = false, limit = 20) =>
    api<{
      alerts: Array<{
        id: string;
        childId: string;
        type: string;
        message: string;
        details?: { category?: string; preview?: string | null } | null;
        createdAt: string;
        read: boolean;
      }>;
      unreadCount: number;
    }>(`/api/parent/alerts?unreadOnly=${unreadOnly}&limit=${limit}`, { token }),

  markAlertRead: (token: string, alertId: string) =>
    api<{ message: string }>(`/api/parent/alerts/${alertId}/read`, {
      method: "PATCH",
      token,
    }),
};
