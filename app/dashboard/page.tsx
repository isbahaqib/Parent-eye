"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  LinearProgress,
  MenuItem,
  IconButton,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import DevicesOutlinedIcon from "@mui/icons-material/DevicesOutlined";
import ChildCareOutlinedIcon from "@mui/icons-material/ChildCareOutlined";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import AnalyticsRoundedIcon from "@mui/icons-material/AnalyticsRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import FeedbackOutlinedIcon from "@mui/icons-material/FeedbackOutlined";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { useAuth } from "@/context/AuthContext";
import { useColorMode } from "@/components/Providers";
import { authApi } from "@/lib/api";

type ChildProfile = {
  id: string;
  name: string;
  age: number | null;
  device: string;
  battery: number;
  location: string;
  lastSeen: string;
  todayScreenTimeMinutes: number;
  screenTimeLimitMinutes: number;
  blockedApps: string[];
  blockedWebsites: string[];
  installedApps: string[];
  riskyEvents: number;
  estimatedAge: number | null;
  ageConfidence: number;
  ageGroup: "under_13" | "13_to_15" | "16_plus";
  suspiciousScore: number;
  suspiciousSignals: string[];
  lastSnapshotAt: string | null;
};

type DashboardSectionKey =
  | "section-about"
  | "section-child-list"
  | "section-child-info"
  | "section-location"
  | "section-screen-time"
  | "section-activity"
  | "section-apps"
  | "section-device";

const childrenSeed: ChildProfile[] = [
  {
    id: "child-1",
    name: "Aarav",
    age: 11,
    device: "Galaxy Tab A9",
    battery: 68,
    location: "Green Valley School",
    lastSeen: "2 min ago",
    todayScreenTimeMinutes: 145,
    screenTimeLimitMinutes: 180,
    blockedApps: ["YouTube", "Instagram"],
    blockedWebsites: ["reddit.com"],
    installedApps: ["YouTube", "Instagram", "Chrome", "WhatsApp"],
    riskyEvents: 1,
    estimatedAge: 11,
    ageConfidence: 0.94,
    ageGroup: "under_13",
    suspiciousScore: 28,
    suspiciousSignals: ["Screen-time limit exceeded"],
    lastSnapshotAt: new Date().toISOString(),
  },
  {
    id: "child-2",
    name: "Diya",
    age: 9,
    device: "Redmi Note 12",
    battery: 42,
    location: "Home",
    lastSeen: "Just now",
    todayScreenTimeMinutes: 92,
    screenTimeLimitMinutes: 120,
    blockedApps: ["TikTok", "Snapchat", "Roblox"],
    blockedWebsites: ["x.com", "discord.com"],
    installedApps: ["TikTok", "Snapchat", "Roblox", "YouTube", "Chrome"],
    riskyEvents: 0,
    estimatedAge: 9,
    ageConfidence: 0.92,
    ageGroup: "under_13",
    suspiciousScore: 10,
    suspiciousSignals: [],
    lastSnapshotAt: new Date().toISOString(),
  },
  {
    id: "child-3",
    name: "Vivaan",
    age: 13,
    device: "Pixel 8",
    battery: 81,
    location: "Football Ground",
    lastSeen: "6 min ago",
    todayScreenTimeMinutes: 173,
    screenTimeLimitMinutes: 210,
    blockedApps: ["Discord"],
    blockedWebsites: ["x.com"],
    installedApps: ["Discord", "Instagram", "YouTube", "Chrome"],
    riskyEvents: 2,
    estimatedAge: 13,
    ageConfidence: 0.9,
    ageGroup: "13_to_15",
    suspiciousScore: 46,
    suspiciousSignals: ["Risky content interactions detected"],
    lastSnapshotAt: new Date().toISOString(),
  },
];

function mapApiChildToProfile(c: {
  id: string;
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
}): ChildProfile {
  const lastSeen =
    c.lastSeen && c.lastSeen.includes("T")
      ? new Date(c.lastSeen).toLocaleString()
      : c.lastSeen;
  return {
    id: c.id,
    name: c.name,
    age: c.age ?? null,
    device: c.device,
    battery: c.battery,
    location: c.location,
    lastSeen,
    todayScreenTimeMinutes: c.todayScreenTimeMinutes,
    screenTimeLimitMinutes: c.screenTimeLimitMinutes,
    blockedApps: c.blockedApps ?? [],
    blockedWebsites: c.blockedWebsites ?? [],
    installedApps: c.installedApps ?? [],
    riskyEvents: c.riskyEvents,
    estimatedAge: c.estimatedAge ?? c.age ?? null,
    ageConfidence: c.ageConfidence ?? 0.9,
    ageGroup:
      c.ageGroup ?? ((c.age ?? 0) < 13 ? "under_13" : (c.age ?? 0) <= 15 ? "13_to_15" : "16_plus"),
    suspiciousScore: c.suspiciousScore ?? Math.min(100, (c.riskyEvents ?? 0) * 20),
    suspiciousSignals: c.suspiciousSignals ?? [],
    lastSnapshotAt: c.lastSnapshotAt ?? null,
  };
}

function FeatureCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        height: "100%",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        {icon}
        <Typography fontWeight={700}>{title}</Typography>
      </Stack>
      {children}
    </Paper>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, loading, logout } = useAuth();
  const { mode } = useColorMode();
  const isDark = mode === "dark";
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [childListReady, setChildListReady] = useState(false);
  const [locationTrackingEnabled, setLocationTrackingEnabled] = useState(true);
  const [deviceMonitoringEnabled, setDeviceMonitoringEnabled] = useState(true);
  const [appBlockingEnabled, setAppBlockingEnabled] = useState(true);
  const [addChildOpen, setAddChildOpen] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildAge, setNewChildAge] = useState("");
  const [newChildDevice, setNewChildDevice] = useState("");
  const [editChildOpen, setEditChildOpen] = useState(false);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editChildName, setEditChildName] = useState("");
  const [editChildAge, setEditChildAge] = useState("");
  const [editChildDevice, setEditChildDevice] = useState("");
  const [limitInput, setLimitInput] = useState("");
  const [blockedAppInput, setBlockedAppInput] = useState("");
  const [blockedWebsiteInput, setBlockedWebsiteInput] = useState("");
  const [reportRange, setReportRange] = useState<"day" | "week" | "month">("day");
  const [activityReport, setActivityReport] = useState<{
    timeline: { appName: string; startedAt: string; durationMinutes: number }[];
    totalsByApp: Record<string, number>;
    totalsByDay: Record<string, number>;
    suspiciousSignals?: string[];
    suspiciousScore?: number;
    lastSnapshotAt?: string | null;
  } | null>(null);
  const [alerts, setAlerts] = useState<
    Array<{
      id: string;
      childId: string;
      type: string;
      message: string;
      details?: { category?: string; preview?: string | null } | null;
      createdAt: string;
      read: boolean;
    }>
  >([]);
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [pairExpiresAt, setPairExpiresAt] = useState<number | null>(null);
  const [pairLoading, setPairLoading] = useState(false);
  const [pairChildLabel, setPairChildLabel] = useState("");
  const [pairError, setPairError] = useState<string | null>(null);
  const [childCrudError, setChildCrudError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<DashboardSectionKey | null>(null);

  async function refreshChildrenFromApi(parentToken: string) {
    const refreshed = await authApi.getParentChildren(parentToken);
    if (refreshed.error || !refreshed.data?.children) {
      setChildCrudError(refreshed.error ?? "Failed to refresh children");
      return;
    }
    const mapped = refreshed.data.children.map(mapApiChildToProfile);
    setChildren(mapped);
    setSelectedChildId((prev) => {
      if (mapped.some((c) => c.id === prev)) return prev;
      return mapped[0]?.id ?? "";
    });
  }

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!token) {
      setChildren(childrenSeed);
      setSelectedChildId(childrenSeed[0]?.id ?? "");
      setChildListReady(true);
      return;
    }
    let cancelled = false;
    setChildListReady(false);
    (async () => {
      const { data, error } = await authApi.getParentChildren(token);
      if (cancelled) return;
      if (data?.children?.length) {
        const mapped = data.children.map(mapApiChildToProfile);
        setChildren(mapped);
        setSelectedChildId(mapped[0].id);
      } else if (error) {
        setChildren([]);
        setSelectedChildId("");
        setPairError(error);
      } else {
        setChildren([]);
        setSelectedChildId("");
      }
      setChildListReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const selectedChild = useMemo(
    () => children.find((c) => c.id === selectedChildId) ?? children[0],
    [children, selectedChildId]
  );

  const totalChildren = children.length;
  const totalRiskEvents = children.reduce((acc, c) => acc + c.riskyEvents, 0);

  const screenPct = selectedChild
    ? Math.min(
        100,
        Math.round(
          (selectedChild.todayScreenTimeMinutes /
            Math.max(1, selectedChild.screenTimeLimitMinutes)) *
            100
        )
      )
    : 0;
  const safeScore = Math.max(0, 100 - totalRiskEvents * 10);

  useEffect(() => {
    if (!selectedChild) return;
    setLimitInput(String(selectedChild.screenTimeLimitMinutes));
  }, [selectedChild?.id, selectedChild?.screenTimeLimitMinutes]);

  useEffect(() => {
    let cancelled = false;
    async function loadActivityReport() {
      if (!token || !selectedChild) {
        setActivityReport(null);
        return;
      }
      const { data } = await authApi.getChildActivityReport(
        token,
        selectedChild.id,
        reportRange
      );
      if (!cancelled && data) {
        setActivityReport({
          timeline: data.timeline || [],
          totalsByApp: data.totalsByApp || {},
          totalsByDay: data.totalsByDay || {},
          suspiciousSignals: data.suspiciousSignals || [],
          suspiciousScore: data.suspiciousScore || 0,
          lastSnapshotAt: data.lastSnapshotAt ?? null,
        });
      }
    }
    loadActivityReport();
    return () => {
      cancelled = true;
    };
  }, [token, selectedChild?.id, reportRange]);

  useEffect(() => {
    const parentToken = token;
    if (!parentToken) return;
    let cancelled = false;

    async function loadAlerts() {
      const { data } = await authApi.getParentAlerts(parentToken!, false, 10);
      if (!cancelled && data) {
        setAlerts(data.alerts || []);
        setUnreadAlertCount(data.unreadCount || 0);
      }
    }

    loadAlerts();
    const timer = setInterval(loadAlerts, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [token]);

  async function handleAddChild() {
    const name = newChildName.trim();
    const age = Number(newChildAge);
    const device = newChildDevice.trim();

    if (!name || !device || !Number.isFinite(age) || age <= 0) {
      setChildCrudError("Enter valid child name, age, and device model");
      return;
    }

    setChildCrudError(null);
    if (token) {
      const { data, error } = await authApi.createChild(token, {
        name,
        age,
        device,
      });
      if (error || !data?.child) {
        setChildCrudError(error ?? "Failed to create child");
        return;
      }
      await refreshChildrenFromApi(token);
      setSelectedChildId((data.child as { id?: string }).id ?? "");
    } else {
      const id = `child-${Date.now()}`;
      const newChild: ChildProfile = {
        id,
        name,
        age,
        device,
        battery: 100,
        location: "Not available",
        lastSeen: "Just now",
        todayScreenTimeMinutes: 0,
        screenTimeLimitMinutes: 120,
        blockedApps: [],
        blockedWebsites: [],
        installedApps: [],
        riskyEvents: 0,
        estimatedAge: age,
        ageConfidence: 0.95,
        ageGroup: age < 13 ? "under_13" : age <= 15 ? "13_to_15" : "16_plus",
        suspiciousScore: 0,
        suspiciousSignals: [],
        lastSnapshotAt: new Date().toISOString(),
      };

      setChildren((prev) => [...prev, newChild]);
      setSelectedChildId(id);
    }
    setNewChildName("");
    setNewChildAge("");
    setNewChildDevice("");
    setAddChildOpen(false);
  }

  async function handleSetScreenTimeLimit() {
    if (!selectedChild) return;
    const parsedLimit = Number(limitInput);
    if (!Number.isFinite(parsedLimit) || parsedLimit < 1) return;

    if (token) {
      const { error } = await authApi.updateChild(token, selectedChild.id, {
        screenTimeLimitMinutes: parsedLimit,
      });
      if (error) {
        setChildCrudError(error);
        return;
      }
    }

    setChildren((prev) =>
      prev.map((item) =>
        item.id === selectedChild.id ? { ...item, screenTimeLimitMinutes: parsedLimit } : item
      )
    );
  }

  async function handleBlockApp(appNameOverride?: string) {
    if (!selectedChild) return;
    const appName = (appNameOverride ?? blockedAppInput).trim();
    if (!appName) return;

    if (token) {
      const nextBlockedApps = selectedChild.blockedApps.includes(appName)
        ? selectedChild.blockedApps
        : [...selectedChild.blockedApps, appName];
      const { error } = await authApi.updateChild(token, selectedChild.id, {
        blockedApps: nextBlockedApps,
      });
      if (error) {
        setChildCrudError(error);
        return;
      }
      setChildren((prev) =>
        prev.map((item) =>
          item.id === selectedChild.id
            ? {
                ...item,
                blockedApps: nextBlockedApps,
                installedApps: item.installedApps.includes(appName)
                  ? item.installedApps
                  : [...item.installedApps, appName],
              }
            : item
        )
      );
    } else {
      setChildren((prev) =>
        prev.map((item) =>
          item.id === selectedChild.id && !item.blockedApps.includes(appName)
            ? {
                ...item,
                blockedApps: [...item.blockedApps, appName],
                installedApps: item.installedApps.includes(appName)
                  ? item.installedApps
                  : [...item.installedApps, appName],
              }
            : item
        )
      );
    }

    if (!appNameOverride) setBlockedAppInput("");
  }

  async function handleUnblockApp(appName: string) {
    if (!selectedChild) return;
    if (token) {
      const nextBlockedApps = selectedChild.blockedApps.filter((app) => app !== appName);
      const { error } = await authApi.updateChild(token, selectedChild.id, {
        blockedApps: nextBlockedApps,
      });
      if (error) {
        setChildCrudError(error);
        return;
      }
      setChildren((prev) =>
        prev.map((item) =>
          item.id === selectedChild.id ? { ...item, blockedApps: nextBlockedApps } : item
        )
      );
      return;
    }

    setChildren((prev) =>
      prev.map((item) =>
        item.id === selectedChild.id
          ? { ...item, blockedApps: item.blockedApps.filter((app) => app !== appName) }
          : item
      )
    );
  }

  async function handleToggleAppBlock(appName: string) {
    if (!selectedChild) return;
    if (selectedChild.blockedApps.includes(appName)) {
      await handleUnblockApp(appName);
      return;
    }
    await handleBlockApp(appName);
  }

  async function handleBlockWebsite(websiteNameOverride?: string) {
    if (!selectedChild) return;
    const website = (websiteNameOverride ?? blockedWebsiteInput).trim().toLowerCase();
    if (!website) return;

    if (token) {
      const { error } = await authApi.blockChildWebsite(token, selectedChild.id, website);
      if (error) {
        setChildCrudError(error);
        return;
      }
      await refreshChildrenFromApi(token);
    } else {
      setChildren((prev) =>
        prev.map((item) =>
          item.id === selectedChild.id
            ? { ...item, blockedWebsites: Array.from(new Set([...(item.blockedWebsites || []), website])) }
            : item
        )
      );
    }
    if (!websiteNameOverride) setBlockedWebsiteInput("");
  }

  async function handleUnblockWebsite(website: string) {
    if (!selectedChild) return;
    if (token) {
      const { error } = await authApi.unblockChildWebsite(token, selectedChild.id, website);
      if (error) {
        setChildCrudError(error);
        return;
      }
      await refreshChildrenFromApi(token);
      return;
    }
    setChildren((prev) =>
      prev.map((item) =>
        item.id === selectedChild.id
          ? { ...item, blockedWebsites: (item.blockedWebsites || []).filter((w) => w !== website) }
          : item
      )
    );
  }

  async function handleMarkAlertRead(alertId: string) {
    const parentToken = token;
    if (!parentToken) return;
    await authApi.markAlertRead(parentToken, alertId);
    setAlerts((prev) => prev.map((item) => (item.id === alertId ? { ...item, read: true } : item)));
    setUnreadAlertCount((prev) => Math.max(0, prev - 1));
  }

  async function handleDeleteChildById(childId: string) {
    setChildCrudError(null);
    if (token) {
      const { error } = await authApi.deleteChild(token, childId);
      if (error) {
        setChildCrudError(error);
        return;
      }
      await refreshChildrenFromApi(token);
      return;
    }
    const next = children.filter((item) => item.id !== childId);
    setChildren(next);
    if (selectedChildId === childId) {
      setSelectedChildId(next[0]?.id ?? "");
    }
  }

  function handleOpenEditChild(child: ChildProfile) {
    setEditingChildId(child.id);
    setEditChildName(child.name);
    setEditChildAge(child.age != null ? String(child.age) : "");
    setEditChildDevice(child.device);
    setEditChildOpen(true);
  }

  async function handleSaveEditChild() {
    if (!editingChildId) return;
    const name = editChildName.trim();
    const device = editChildDevice.trim();
    const ageNum = editChildAge.trim() ? Number(editChildAge) : null;
    if (!name || !device || (ageNum !== null && (!Number.isFinite(ageNum) || ageNum <= 0))) {
      setChildCrudError("Enter valid child name, age, and device model");
      return;
    }

    setChildCrudError(null);
    if (token) {
      const { error } = await authApi.updateChild(token, editingChildId, {
        name,
        device,
        age: ageNum,
      });
      if (error) {
        setChildCrudError(error);
        return;
      }
      await refreshChildrenFromApi(token);
    } else {
      setChildren((prev) =>
        prev.map((item) =>
          item.id === editingChildId ? { ...item, name, device, age: ageNum } : item
        )
      );
    }
    setEditChildOpen(false);
    setEditingChildId(null);
  }

  function openSectionOnly(id: DashboardSectionKey) {
    setActiveSection(id);
  }

  function shouldShowSection(id: DashboardSectionKey) {
    if (activeSection === "section-about") {
      return (
        id === "section-child-info" ||
        id === "section-location" ||
        id === "section-screen-time" ||
        id === "section-activity" ||
        id === "section-apps" ||
        id === "section-device"
      );
    }
    return activeSection === null || activeSection === id;
  }

  function getChildTasks(child: ChildProfile): string[] {
    const tasks: string[] = [];
    if (child.todayScreenTimeMinutes > child.screenTimeLimitMinutes) {
      tasks.push("Review screen-time overuse");
    }
    if (child.riskyEvents > 0) {
      tasks.push("Check risky activity alerts");
    }
    if ((child.blockedApps?.length ?? 0) === 0) {
      tasks.push("Set app blocking rules");
    }
    if (child.battery <= 25) {
      tasks.push("Ask child to charge device");
    }
    if (!tasks.length) {
      tasks.push("No pending tasks");
    }
    return tasks;
  }

  const isHomePageView = activeSection === null;

  if (loading || !user) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography color="text.secondary">Loading...</Typography>
      </Box>
    );
  }

  const installedAppsForSelectedChild = Array.from(
    new Set([
      ...(selectedChild?.installedApps ?? []),
      ...(selectedChild?.blockedApps ?? []),
      ...Object.keys(activityReport?.totalsByApp || {}),
      "YouTube",
      "Chrome",
      "WhatsApp",
      "Instagram",
      "Snapchat",
      "TikTok",
      "Discord",
      "Roblox",
    ])
  ).sort((a, b) => a.localeCompare(b));

  if (!childListReady) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography color="text.secondary">Loading children…</Typography>
      </Box>
    );
  }

  async function handleGeneratePairCode() {
    if (!token) return;
    setPairError(null);
    setPairLoading(true);
    const { data, error } = await authApi.requestChildLinkCode(
      token,
      pairChildLabel.trim() || undefined
    );
    setPairLoading(false);
    if (error) {
      setPairError(error);
      return;
    }
    if (data?.code) {
      setPairCode(data.code);
      setPairExpiresAt(typeof data.expiresAt === "number" ? data.expiresAt : null);
    }
  }

  async function handleRefreshChildrenList() {
    if (!token) return;
    setPairError(null);
    setChildListReady(false);
    const { data, error } = await authApi.getParentChildren(token);
    setChildListReady(true);
    if (data?.children?.length) {
      const mapped = data.children.map(mapApiChildToProfile);
      setChildren(mapped);
      setSelectedChildId(mapped[0].id);
      setPairCode(null);
      setPairExpiresAt(null);
      return;
    }
    if (error) {
      setPairError(error);
      return;
    }
    setPairError("Still no children found. Enter the code on the child app, then refresh again.");
  }

  if (!selectedChild) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          p: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#e5e7eb",
        }}
      >
        <Paper sx={{ p: 4, maxWidth: 520, width: "100%" }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            No Android devices linked yet
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Parent Eye supports Android child devices only. Generate a 6-digit code here, enter it
            in the Android child app (same backend URL), call{" "}
            <code>/api/child/link/confirm</code> with <code>platform: &quot;android&quot;</code>,
            then refresh this page.
          </Typography>

          {token ? (
            <Stack spacing={2}>
              <TextField
                label="Label for this child (optional)"
                placeholder="e.g. Aarav’s tablet"
                size="small"
                fullWidth
                value={pairChildLabel}
                onChange={(e) => setPairChildLabel(e.target.value)}
              />
              <Button
                variant="contained"
                onClick={handleGeneratePairCode}
                disabled={pairLoading}
                sx={{ alignSelf: "flex-start" }}
              >
                {pairLoading ? "Generating…" : "Generate pairing code"}
              </Button>

              {pairCode && (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: "action.hover" }}>
                  <Typography variant="body2" color="text.secondary">
                    Enter this code in the Android child app:
                  </Typography>
                  <Typography
                    variant="h4"
                    fontWeight={800}
                    letterSpacing={4}
                    sx={{ my: 1, fontFamily: "monospace" }}
                  >
                    {pairCode}
                  </Typography>
                  {pairExpiresAt && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Expires: {new Date(pairExpiresAt).toLocaleString()}
                    </Typography>
                  )}
                  <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => {
                        void navigator.clipboard.writeText(pairCode);
                      }}
                    >
                      Copy code
                    </Button>
                    <Button size="small" variant="outlined" onClick={handleRefreshChildrenList}>
                      I paired — refresh dashboard
                    </Button>
                  </Stack>
                </Paper>
              )}

              {pairError && (
                <Alert severity="error" onClose={() => setPairError(null)}>
                  {pairError}
                </Alert>
              )}

              <Typography variant="caption" color="text.secondary" component="div">
                Android child app: <code>POST …/api/child/link/confirm</code> with body{" "}
                <code>
                  {`{ "code": "${pairCode ?? "123456"}", "platform": "android", "childName": "Name", "deviceName": "Phone model" }`}
                </code>
              </Typography>
            </Stack>
          ) : (
            <Typography color="text.secondary">
              Sign in again to generate pairing codes. (Demo mode without login uses sample Android
              profiles.)
            </Typography>
          )}

          <Stack direction="row" sx={{ mt: 3, flexWrap: "wrap", gap: 1 }}>
            <Button variant="text" onClick={() => router.push("/login")}>
              Back to sign in
            </Button>
            {token && (
              <Button variant="outlined" onClick={handleRefreshChildrenList}>
                Refresh linked children
              </Button>
            )}
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        p: { xs: 1.5, md: 3 },
        background: isDark
          ? "linear-gradient(180deg, #0b1220 0%, #0f172a 100%)"
          : "linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(241,245,249,1) 100%)",
      }}
    >
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "280px minmax(0, 1fr)" },
            gap: 2,
            alignItems: "start",
          }}
        >
        <Paper
          sx={{
            p: 2.25,
            borderRadius: 0,
            border: isDark
              ? "1px solid rgba(148,163,184,0.16)"
              : "1px solid rgba(15,23,42,0.08)",
            position: { md: "sticky" },
            top: { md: 0 },
            width: "100%",
            height: { md: "100vh" },
            mb: { xs: 2, md: 0 },
            overflowY: "auto",
            bgcolor: isDark ? "#0b1220" : "#ffffff",
            color: isDark ? "#e2e8f0" : "#0f172a",
            boxShadow: isDark
              ? "0 8px 24px rgba(2,6,23,0.45)"
              : "0 8px 24px rgba(15,23,42,0.08)",
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: isDark ? "#93c5fd" : "#7c5cff", display: "block", mb: 1 }}
          >
            Parent Eye dashboard
          </Typography>
          <Paper
            sx={{
              p: 1.25,
              borderRadius: 2,
              bgcolor: isDark ? "#111b2f" : "#f8fafc",
              border: isDark
                ? "1px solid rgba(148,163,184,0.22)"
                : "1px solid rgba(15,23,42,0.12)",
              mb: 1.5,
            }}
          >
            <Typography fontWeight={700}>ParentEye-web</Typography>
            <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b" }}>
              Monitoring app
            </Typography>
          </Paper>
          <Stack spacing={0.6}>
            <Button startIcon={<HomeRoundedIcon />} sx={{ justifyContent: "flex-start", color: isDark ? "#e2e8f0" : "#0f172a" }} onClick={() => setActiveSection(null)}>
              Home
            </Button>
            <Button startIcon={<AnalyticsRoundedIcon />} sx={{ justifyContent: "flex-start", color: isDark ? "#e2e8f0" : "#0f172a" }} onClick={() => openSectionOnly("section-activity")}>
              Analytics
            </Button>
            <Button startIcon={<GroupRoundedIcon />} sx={{ justifyContent: "flex-start", color: isDark ? "#e2e8f0" : "#0f172a" }} onClick={() => openSectionOnly("section-child-list")}>
              Children
            </Button>
            <Button startIcon={<InfoOutlinedIcon />} sx={{ justifyContent: "flex-start", color: isDark ? "#e2e8f0" : "#0f172a" }} onClick={() => openSectionOnly("section-about")}>
              About
            </Button>
            <Button startIcon={<FeedbackOutlinedIcon />} sx={{ justifyContent: "flex-start", color: isDark ? "#e2e8f0" : "#0f172a" }} onClick={() => router.push("/login")}>
              Feedback
            </Button>
          </Stack>
          <Paper
            sx={{
              mt: 1.5,
              p: 1.25,
              borderRadius: 2,
              bgcolor: isDark ? "#111b2f" : "#f8fafc",
              border: isDark
                ? "1px solid rgba(148,163,184,0.22)"
                : "1px solid rgba(15,23,42,0.12)",
            }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <BoltRoundedIcon fontSize="small" sx={{ color: isDark ? "#c4b5fd" : "#7c5cff" }} />
              <Typography fontWeight={700}>Quick actions</Typography>
            </Stack>
            <Stack spacing={0.7} sx={{ mt: 1 }}>
              <Button variant="outlined" size="small" onClick={logout}>
                Log out
              </Button>
            </Stack>
          </Paper>

          <FormControl size="small" fullWidth sx={{ mt: 2, mb: 1 }}>
            <InputLabel id="sidebar-children-select-label" sx={{ color: isDark ? "#94a3b8" : "#64748b" }}>
              Children
            </InputLabel>
            <Select
              labelId="sidebar-children-select-label"
              label="Children"
              value={selectedChildId}
              onChange={(event) => setSelectedChildId(event.target.value)}
              MenuProps={{
                PaperProps: {
                  sx: { bgcolor: isDark ? "#0f172a" : "#ffffff", color: isDark ? "#e2e8f0" : "#0f172a" },
                },
              }}
              sx={{
                color: isDark ? "#e2e8f0" : "#0f172a",
                ".MuiOutlinedInput-notchedOutline": {
                  borderColor: isDark ? "rgba(148,163,184,0.4)" : "rgba(15,23,42,0.2)",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: isDark ? "rgba(148,163,184,0.7)" : "rgba(15,23,42,0.4)",
                },
              }}
            >
              {children.map((child) => (
                <MenuItem key={`sidebar-child-option-${child.id}`} value={child.id}>
                  {child.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="subtitle2" sx={{ mt: 1, mb: 0.75, color: isDark ? "#cbd5e1" : "#334155" }}>
            Child quick links
          </Typography>
          <Button
            size="small"
            variant={activeSection === null ? "contained" : "text"}
            fullWidth
            onClick={() => setActiveSection(null)}
            sx={{ mb: 0.75, textTransform: "none" }}
          >
            Show all cards
          </Button>
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }} useFlexGap>
            <Button size="small" variant="text" onClick={() => openSectionOnly("section-child-info")}>
              Info
            </Button>
            <Button size="small" variant="text" onClick={() => openSectionOnly("section-location")}>
              Location
            </Button>
            <Button size="small" variant="text" onClick={() => openSectionOnly("section-screen-time")}>
              Screen
            </Button>
            <Button size="small" variant="text" onClick={() => openSectionOnly("section-activity")}>
              Activity
            </Button>
            <Button size="small" variant="text" onClick={() => openSectionOnly("section-apps")}>
              Apps
            </Button>
            <Button size="small" variant="text" onClick={() => openSectionOnly("section-device")}>
              Device
            </Button>
          </Stack>
          <Box sx={{ mt: 2.5, p: 1.25, borderTop: isDark ? "1px solid rgba(148,163,184,0.2)" : "1px solid rgba(15,23,42,0.12)" }}>
            <Typography fontWeight={700} sx={{ lineHeight: 1.2 }}>
              {user.name ?? "Parent user"}
            </Typography>
            <Typography variant="caption" sx={{ color: isDark ? "#94a3b8" : "#64748b" }}>
              {user.email}
            </Typography>
          </Box>
        </Paper>
        <Box>
          {isHomePageView && (
            <Paper
              sx={{
                p: { xs: 2, md: 2.5 },
                borderRadius: 4,
                border: "1px solid",
                borderColor: "divider",
                mb: 2,
                background: isDark
                  ? "linear-gradient(90deg, rgba(30,41,59,1) 0%, rgba(15,23,42,1) 100%)"
                  : "linear-gradient(90deg, rgba(237,233,254,1) 0%, rgba(224,242,254,1) 100%)",
                color: isDark ? "#ffffff" : "#0f172a",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography variant="h5" fontWeight={800}>
                    Welcome, {user.name ?? user.email}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.85, mt: 0.5 }}>
                    Family safety dashboard
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1.5}>
                  <Button
                    variant="contained"
                    onClick={logout}
                    sx={{
                      bgcolor: isDark ? "#e2e8f0" : "#7c5cff",
                      color: isDark ? "#111827" : "#ffffff",
                      "&:hover": { bgcolor: isDark ? "#cbd5e1" : "#6d4ff0" },
                      fontWeight: 700,
                    }}
                  >
                    Sign out
                  </Button>
                </Stack>
              </Box>
            </Paper>
          )}

          {isHomePageView && (
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                  <Typography variant="body2" color="text.secondary">
                    Parent Account
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontWeight: 600 }}>{user.email}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                  <Typography variant="body2" color="text.secondary">
                    Connected Android devices
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontWeight: 700, fontSize: 24 }}>
                    {totalChildren}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 2.5, borderRadius: 3, border: "1px solid", borderColor: "divider" }}>
                  <Typography variant="body2" color="text.secondary">
                    Family Safety Score
                  </Typography>
                  <Typography sx={{ mt: 0.5, fontWeight: 700, fontSize: 24 }}>
                    {safeScore}%
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}

          {isHomePageView && (
            <Paper
              sx={{
                p: 2.25,
                borderRadius: 4,
                border: "1px solid",
                borderColor: "divider",
                mb: 2,
                boxShadow: isDark
                  ? "0 4px 14px rgba(2,6,23,0.35)"
                  : "0 4px 14px rgba(15,23,42,0.06)",
              }}
            >
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                Alert Notifications ({unreadAlertCount} unread)
              </Typography>
              <Stack spacing={1}>
                {alerts.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No alerts yet. Harmful-content alerts will appear here.
                  </Typography>
                )}
                {alerts.map((item) => (
                  <Alert
                    key={item.id}
                    severity={item.read ? "info" : "warning"}
                    action={
                      !item.read ? (
                        <Button size="small" onClick={() => handleMarkAlertRead(item.id)}>
                          Mark read
                        </Button>
                      ) : undefined
                    }
                  >
                    <Typography fontWeight={600}>{item.message}</Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {new Date(item.createdAt).toLocaleString()}
                    </Typography>
                    {item.details?.category && (
                      <Typography variant="caption" display="block">
                        Category: {item.details.category}
                      </Typography>
                    )}
                    {item.details?.preview && (
                      <Typography variant="caption" display="block">
                        Preview: {item.details.preview}
                      </Typography>
                    )}
                  </Alert>
                ))}
              </Stack>
            </Paper>
          )}


        {childCrudError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setChildCrudError(null)}>
            {childCrudError}
          </Alert>
        )}

        <Grid container spacing={2}>
          {shouldShowSection("section-child-list") && (
            <Grid item xs={12} id="section-child-list">
              <FeatureCard
                title="Connected Children"
                icon={<GroupRoundedIcon color="primary" fontSize="small" />}
              >
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1.25 }}>
                  <Button size="small" variant="outlined" onClick={() => setAddChildOpen(true)}>
                    Add Child
                  </Button>
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
                  Showing only children connected to your parent account.
                </Typography>
                <Stack spacing={1}>
                  {children.map((child) => (
                    <Paper
                      key={`connected-child-${child.id}`}
                      variant="outlined"
                      sx={{
                        px: 1.5,
                        py: 1.1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                      }}
                      onClick={() => setSelectedChildId(child.id)}
                    >
                      <Box>
                        <Typography fontWeight={700}>
                          {child.name} {child.age != null ? `(${child.age} yrs)` : ""}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {child.device} • {child.location}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.35 }}>
                          Used screen time: {child.todayScreenTimeMinutes} / {child.screenTimeLimitMinutes} min
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.35 }}>
                          Tasks: {getChildTasks(child).join(" • ")}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Edit child">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditChild(child);
                            }}
                          >
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove child">
                          <IconButton
                            size="small"
                            color="warning"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDeleteChildById(child.id);
                            }}
                          >
                            <RemoveCircleOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete child">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDeleteChildById(child.id);
                            }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Paper>
                  ))}
                  {children.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No children connected yet.
                    </Typography>
                  )}
                </Stack>
              </FeatureCard>
            </Grid>
          )}

          {shouldShowSection("section-child-info") && (
          <Grid item xs={12} md={6} id="section-child-info">
            <FeatureCard
              title="Child Info"
              icon={<ChildCareOutlinedIcon color="primary" fontSize="small" />}
            >
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                <Avatar sx={{ bgcolor: "primary.main", width: 44, height: 44 }}>
                  {selectedChild.name.charAt(0)}
                </Avatar>
                <Box>
                  <Typography fontWeight={700}>{selectedChild.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedChild.age != null ? `Age ${selectedChild.age} • ` : ""}
                    {selectedChild.device}
                  </Typography>
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Battery: {selectedChild.battery}% • Last seen: {selectedChild.lastSeen}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                Age detection: {selectedChild.estimatedAge ?? "N/A"} yrs • Group:{" "}
                {selectedChild.ageGroup.replaceAll("_", " ")} • Confidence:{" "}
                {Math.round(selectedChild.ageConfidence * 100)}%
              </Typography>
            </FeatureCard>
          </Grid>
          )}

          {shouldShowSection("section-location") && (
          <Grid item xs={12} md={6} id="section-location">
            <FeatureCard
              title="Location Tracking"
              icon={<LocationOnOutlinedIcon color="primary" fontSize="small" />}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Real-time location monitoring
                </Typography>
                <Switch
                  checked={locationTrackingEnabled}
                  onChange={(e) => setLocationTrackingEnabled(e.target.checked)}
                />
              </Stack>
              <Typography sx={{ mt: 1 }}>
                {locationTrackingEnabled ? selectedChild.location : "Tracking paused"}
              </Typography>
              {locationTrackingEnabled && (
                <Box
                  sx={{
                    mt: 1.2,
                    borderRadius: 2,
                    overflow: "hidden",
                    border: "1px solid",
                    borderColor: "divider",
                    height: 220,
                  }}
                >
                  <iframe
                    title={`${selectedChild.name} live location`}
                    src={`https://www.google.com/maps?q=${encodeURIComponent(
                      selectedChild.location
                    )}&output=embed`}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </Box>
              )}
            </FeatureCard>
          </Grid>
          )}

          {shouldShowSection("section-screen-time") && (
          <Grid item xs={12} md={6} id="section-screen-time">
            <FeatureCard
              title="Screen Time"
              icon={<AccessTimeOutlinedIcon color="primary" fontSize="small" />}
            >
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Today: {selectedChild.todayScreenTimeMinutes} min / Limit:{" "}
                {selectedChild.screenTimeLimitMinutes} min
              </Typography>
              <LinearProgress
                variant="determinate"
                value={screenPct}
                sx={{ height: 8, borderRadius: 10 }}
              />
              <Typography variant="body2" sx={{ mt: 1 }}>
                Usage: {screenPct}%
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.5 }}>
                <TextField
                  label="Limit (min)"
                  type="number"
                  size="small"
                  value={limitInput}
                  onChange={(e) => setLimitInput(e.target.value)}
                  sx={{ width: { xs: "100%", sm: 150 } }}
                />
                <Button variant="outlined" onClick={handleSetScreenTimeLimit}>
                  Set Limit
                </Button>
              </Stack>
            </FeatureCard>
          </Grid>
          )}

          {shouldShowSection("section-activity") && (
          <Grid item xs={12} md={6} id="section-activity">
            <FeatureCard
              title="Activity Report"
              icon={<AssessmentOutlinedIcon color="primary" fontSize="small" />}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                spacing={1}
              >
                <Typography variant="body2" color="text.secondary">
                  Detailed usage report for {selectedChild.name}
                </Typography>
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel id="report-range-label">Range</InputLabel>
                  <Select
                    labelId="report-range-label"
                    label="Range"
                    value={reportRange}
                    onChange={(e) =>
                      setReportRange(e.target.value as "day" | "week" | "month")
                    }
                  >
                    <MenuItem value="day">Day</MenuItem>
                    <MenuItem value="week">Week</MenuItem>
                    <MenuItem value="month">Month</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              <Typography variant="subtitle2" sx={{ mt: 1.5 }}>
                App-wise usage
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }} useFlexGap flexWrap="wrap">
                {Object.entries(activityReport?.totalsByApp || {}).map(([appName, minutes]) => (
                  <Chip key={appName} label={`${appName}: ${minutes}m`} size="small" />
                ))}
                {!Object.keys(activityReport?.totalsByApp || {}).length && (
                  <Typography variant="body2" color="text.secondary">
                    No app usage data yet.
                  </Typography>
                )}
              </Stack>

              <Typography variant="subtitle2" sx={{ mt: 1.5 }}>
                Day-wise total
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }} useFlexGap flexWrap="wrap">
                {Object.entries(activityReport?.totalsByDay || {}).map(([day, minutes]) => (
                  <Chip key={day} label={`${day}: ${minutes}m`} size="small" variant="outlined" />
                ))}
                {!Object.keys(activityReport?.totalsByDay || {}).length && (
                  <Typography variant="body2" color="text.secondary">
                    No day-wise data yet.
                  </Typography>
                )}
              </Stack>

              <Typography variant="subtitle2" sx={{ mt: 1.5 }}>
                Timeline (time and app)
              </Typography>
              <Stack spacing={0.5} sx={{ mt: 0.8 }}>
                {(activityReport?.timeline || []).slice(-5).map((item, index) => (
                  <Typography key={`${item.startedAt}-${index}`} variant="body2" color="text.secondary">
                    {new Date(item.startedAt).toLocaleString()} - {item.appName} ({item.durationMinutes}m)
                  </Typography>
                ))}
                {!activityReport?.timeline?.length && (
                  <Typography variant="body2" color="text.secondary">
                    No timeline data yet.
                  </Typography>
                )}
              </Stack>
              <Typography variant="subtitle2" sx={{ mt: 1.5 }}>
                Suspicious behaviour signals
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }} useFlexGap flexWrap="wrap">
                {(activityReport?.suspiciousSignals || selectedChild.suspiciousSignals || []).map((signal) => (
                  <Chip key={signal} label={signal} size="small" color="warning" variant="outlined" />
                ))}
                {!(activityReport?.suspiciousSignals || selectedChild.suspiciousSignals || []).length && (
                  <Typography variant="body2" color="text.secondary">
                    No suspicious patterns found.
                  </Typography>
                )}
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Risk score: {activityReport?.suspiciousScore ?? selectedChild.suspiciousScore}/100
                {selectedChild.lastSnapshotAt
                  ? ` • Last snapshot: ${new Date(selectedChild.lastSnapshotAt).toLocaleString()}`
                  : ""}
              </Typography>
            </FeatureCard>
          </Grid>
          )}

          {shouldShowSection("section-apps") && (
          <Grid item xs={12} md={6} id="section-apps">
            <FeatureCard
              title="App Blocking"
              icon={<BlockOutlinedIcon color="primary" fontSize="small" />}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Restrict risky or distracting apps
                </Typography>
                <Switch
                  checked={appBlockingEnabled}
                  onChange={(e) => setAppBlockingEnabled(e.target.checked)}
                />
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 1.2 }} useFlexGap flexWrap="wrap">
                {selectedChild.blockedApps.map((app) => (
                  <Chip
                    key={app}
                    label={app}
                    size="small"
                    color="default"
                    onDelete={() => handleUnblockApp(app)}
                  />
                ))}
              </Stack>
              <Typography variant="subtitle2" sx={{ mt: 1.5, mb: 1 }}>
                Installed apps on {selectedChild.name}
              </Typography>
              <Stack spacing={0.8}>
                {installedAppsForSelectedChild.map((app) => {
                  const blocked = selectedChild.blockedApps.includes(app);
                  return (
                    <Paper
                      key={`installed-${app}`}
                      variant="outlined"
                      sx={{
                        px: 1.25,
                        py: 0.8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box>
                        <Typography fontWeight={600}>{app}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {blocked ? "Currently blocked" : "Allowed"}
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant={blocked ? "outlined" : "contained"}
                        color={blocked ? "inherit" : "primary"}
                        onClick={() => handleToggleAppBlock(app)}
                      >
                        {blocked ? "Unblock" : "Block"}
                      </Button>
                    </Paper>
                  );
                })}
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.5 }}>
                <TextField
                  label="App name"
                  size="small"
                  value={blockedAppInput}
                  onChange={(e) => setBlockedAppInput(e.target.value)}
                  sx={{ width: { xs: "100%", sm: 180 } }}
                />
                <Button variant="outlined" onClick={() => void handleBlockApp()}>
                  Block App
                </Button>
              </Stack>
              <Typography variant="subtitle2" sx={{ mt: 1.75, mb: 1 }}>
                Blocked websites
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1 }} useFlexGap flexWrap="wrap">
                {(selectedChild.blockedWebsites || []).map((site) => (
                  <Chip
                    key={site}
                    label={site}
                    size="small"
                    color="warning"
                    variant="outlined"
                    onDelete={() => handleUnblockWebsite(site)}
                  />
                ))}
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.25 }}>
                <TextField
                  label="Website (domain)"
                  size="small"
                  value={blockedWebsiteInput}
                  onChange={(e) => setBlockedWebsiteInput(e.target.value)}
                  sx={{ width: { xs: "100%", sm: 220 } }}
                />
                <Button variant="outlined" onClick={() => void handleBlockWebsite()}>
                  Block Website
                </Button>
              </Stack>
            </FeatureCard>
          </Grid>
          )}

          {shouldShowSection("section-device") && (
          <Grid item xs={12} md={6} id="section-device">
            <FeatureCard
              title="Device Monitoring"
              icon={<DevicesOutlinedIcon color="primary" fontSize="small" />}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Android device health, status, and alerts
                </Typography>
                <Switch
                  checked={deviceMonitoringEnabled}
                  onChange={(e) => setDeviceMonitoringEnabled(e.target.checked)}
                />
              </Stack>
              <Typography sx={{ mt: 1 }}>
                {deviceMonitoringEnabled
                  ? `${selectedChild.device} is online • Battery ${selectedChild.battery}%`
                  : "Monitoring paused"}
              </Typography>
            </FeatureCard>
          </Grid>
          )}
        </Grid>
        </Box>
        </Box>
      </Box>

      <Dialog open={addChildOpen} onClose={() => setAddChildOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add Child</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {token
              ? "Creates and stores the child record in the database immediately."
              : "Demo mode: profiles exist only in this browser session. For a saved child, sign in and pair from the Android app."}
          </Typography>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField
              label="Child Name"
              value={newChildName}
              onChange={(e) => setNewChildName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Age"
              type="number"
              value={newChildAge}
              onChange={(e) => setNewChildAge(e.target.value)}
              fullWidth
            />
            <TextField
              label="Android device model"
              placeholder="e.g. Galaxy Tab A9"
              value={newChildDevice}
              onChange={(e) => setNewChildDevice(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddChildOpen(false)}>Cancel</Button>
          <Button onClick={handleAddChild} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editChildOpen} onClose={() => setEditChildOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Edit Child</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <TextField
              label="Child Name"
              value={editChildName}
              onChange={(e) => setEditChildName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Age"
              type="number"
              value={editChildAge}
              onChange={(e) => setEditChildAge(e.target.value)}
              fullWidth
            />
            <TextField
              label="Android device model"
              value={editChildDevice}
              onChange={(e) => setEditChildDevice(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditChildOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveEditChild} variant="contained">
            Save changes
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
