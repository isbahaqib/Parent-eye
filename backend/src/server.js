const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const dotenv = require("dotenv");
const { prisma } = require("./db");

dotenv.config();

const app = express();

const PORT = Number(process.env.PORT || 3001);
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const DEFAULT_PARENT_EMAIL = "parent@example.com";
const DEFAULT_PARENT_PASSWORD = "Parent@123";
const LINK_CODE_TTL_MS = 1000 * 60 * 10;
/** Child devices must pair as Android; other platforms are rejected at link/confirm. */
const CHILD_PLATFORM_ANDROID = "android";

// Allow Next.js on common ports (3000–3005) and 127.0.0.1; extend via CORS_ORIGINS (comma-separated).
const defaultCorsOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:3002",
  "http://127.0.0.1:3002",
  "http://localhost:3003",
  "http://127.0.0.1:3003",
  "http://localhost:3004",
  "http://127.0.0.1:3004",
  "http://localhost:3005",
  "http://127.0.0.1:3005",
];
const extraOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowedCorsOrigins = [...new Set([FRONTEND_URL, ...defaultCorsOrigins, ...extraOrigins])];

app.use(
  cors({
    origin: allowedCorsOrigins,
    credentials: true,
  })
);
app.use(express.json());

function dateKeyFromISO(isoString) {
  return new Date(isoString).toISOString().slice(0, 10);
}

function childToApi(c) {
  if (!c) return null;
  const blockedApps = (c.blockedApps || []).map((b) => b.appName);
  const appUsageLogs = (c.appUsageLogs || []).map((l) => ({
    appName: l.appName,
    startedAt: l.startedAt instanceof Date ? l.startedAt.toISOString() : l.startedAt,
    durationMinutes: l.durationMinutes,
  }));
  return {
    id: c.id,
    parentId: c.parentId,
    name: c.name,
    age: c.age,
    device: c.device,
    battery: c.battery,
    location: c.location,
    lastSeen: c.lastSeen instanceof Date ? c.lastSeen.toISOString() : c.lastSeen,
    todayScreenTimeMinutes: c.todayScreenTimeMinutes,
    screenTimeLimitMinutes: c.screenTimeLimitMinutes,
    riskyEvents: c.riskyEvents,
    activeApp: c.activeApp,
    isOnline: c.isOnline,
    blockedApps,
    appUsageLogs,
  };
}

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (_error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function parentOnly(req, res, next) {
  if (!req.user?.sub) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function childAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Missing child token" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "child" || !decoded.childId || !decoded.parentId) {
      return res.status(401).json({ error: "Invalid child token" });
    }
    if (decoded.platform != null && decoded.platform !== CHILD_PLATFORM_ANDROID) {
      return res.status(403).json({ error: "Only Android child devices are supported" });
    }
    req.child = decoded;
    next();
  } catch (_error) {
    return res.status(401).json({ error: "Invalid or expired child token" });
  }
}

async function ensureSeedUser() {
  const existing = await prisma.user.findUnique({
    where: { email: DEFAULT_PARENT_EMAIL },
  });
  if (existing) return;
  await prisma.user.create({
    data: {
      email: DEFAULT_PARENT_EMAIL,
      name: "Default Parent",
      passwordHash: bcrypt.hashSync(DEFAULT_PARENT_PASSWORD, 10),
    },
  });
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, message: "Backend is running", database: "connected" });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body || {};

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const dup = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (dup) {
      return res.status(409).json({ error: "Email already exists" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    await prisma.user.create({
      data: {
        name: String(name).trim(),
        email: normalizedEmail,
        passwordHash,
      },
    });

    return res.status(201).json({ message: "Account created" });
  } catch (_error) {
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(String(password), user.passwordHash);

    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ sub: user.id, email: user.email, role: "parent" }, JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({ token, user: sanitizeUser(user) });
  } catch (_error) {
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body || {};
    const normalizedEmail = String(email || "").trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (user) {
      const token = crypto.randomBytes(24).toString("hex");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
      await prisma.passwordResetToken.create({
        data: {
          token,
          userId: user.id,
          expiresAt,
        },
      });

      console.log(`Password reset token for ${user.email}: ${token}`);
      console.log(`Reset URL: ${FRONTEND_URL}/reset-password?token=${token}`);
    }

    return res.json({
      message:
        "If an account exists with this email, a reset link has been generated.",
    });
  } catch (_error) {
    return res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body || {};

    if (!token || !password) {
      return res.status(400).json({ error: "Token and password are required" });
    }

    const tokenEntry = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!tokenEntry || tokenEntry.usedAt || tokenEntry.expiresAt < new Date()) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: tokenEntry.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: tokenEntry.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return res.json({ message: "Password reset successful" });
  } catch (_error) {
    return res.status(500).json({ error: "Server error" });
  }
});

app.get("/api/auth/me", authMiddleware, async (req, res) => {
  const userId = req.user.sub;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.json(sanitizeUser(user));
});

app.post("/api/parent/link/request", authMiddleware, parentOnly, async (req, res) => {
  const { childName } = req.body || {};
  const parentId = req.user.sub;
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS);

  await prisma.childLinkCode.create({
    data: {
      code,
      parentId,
      childName: String(childName || "").trim() || "Child Device",
      expiresAt,
    },
  });

  return res.json({
    code,
    expiresAt: expiresAt.getTime(),
    message: "Share this code in the Parent Eye Android child app to connect",
  });
});

app.post("/api/child/link/confirm", async (req, res) => {
  const { code, childName, deviceName } = req.body || {};
  const platform = String(req.body?.platform ?? "")
    .trim()
    .toLowerCase();

  if (!code) {
    return res.status(400).json({ error: "Code is required" });
  }

  if (platform !== CHILD_PLATFORM_ANDROID) {
    return res.status(400).json({
      error:
        'Only Android child devices are supported. Send "platform": "android" from the Android app when confirming the link code.',
    });
  }

  const link = await prisma.childLinkCode.findUnique({
    where: { code: String(code) },
  });

  if (!link || link.used || link.expiresAt < new Date()) {
    return res.status(400).json({ error: "Invalid or expired link code" });
  }

  const child = await prisma.$transaction(async (tx) => {
    await tx.childLinkCode.update({
      where: { id: link.id },
      data: { used: true },
    });

    const created = await tx.child.create({
      data: {
        parentId: link.parentId,
        name: String(childName || link.childName || "Child").trim(),
        device: String(deviceName || "Unknown Device").trim(),
      },
    });

    const now = new Date();
    await tx.appUsageLog.createMany({
      data: [
        {
          childId: created.id,
          appName: "YouTube",
          startedAt: new Date(now.getTime() - 1000 * 60 * 90),
          durationMinutes: 25,
        },
        {
          childId: created.id,
          appName: "Chrome",
          startedAt: new Date(now.getTime() - 1000 * 60 * 60),
          durationMinutes: 15,
        },
        {
          childId: created.id,
          appName: "WhatsApp",
          startedAt: new Date(now.getTime() - 1000 * 60 * 30),
          durationMinutes: 10,
        },
      ],
    });

    return tx.child.findUnique({
      where: { id: created.id },
      include: { blockedApps: true, appUsageLogs: true },
    });
  });

  const childToken = jwt.sign(
    {
      role: "child",
      childId: child.id,
      parentId: child.parentId,
      platform: CHILD_PLATFORM_ANDROID,
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

  return res.status(201).json({
    message: "Android child device connected successfully",
    childToken,
    child: childToApi(child),
  });
});

app.post("/api/child/telemetry", childAuthMiddleware, async (req, res) => {
  const childId = req.child.childId;

  const child = await prisma.child.findUnique({ where: { id: childId } });

  if (!child) {
    return res.status(404).json({ error: "Child not found" });
  }

  const {
    location,
    battery,
    activeApp,
    todayScreenTimeMinutes,
    riskyEvents,
    isOnline,
    appName,
    durationMinutes,
    eventTimestamp,
    harmfulContentDetected,
    harmfulCategory,
    harmfulContentText,
  } = req.body || {};

  const updateData = {
    lastSeen: new Date(),
  };

  if (location !== undefined) updateData.location = String(location);
  if (battery !== undefined) updateData.battery = Number(battery);
  if (activeApp !== undefined) updateData.activeApp = String(activeApp);
  if (todayScreenTimeMinutes !== undefined) {
    updateData.todayScreenTimeMinutes = Number(todayScreenTimeMinutes);
  }
  if (riskyEvents !== undefined) updateData.riskyEvents = Number(riskyEvents);
  if (isOnline !== undefined) updateData.isOnline = Boolean(isOnline);

  await prisma.child.update({
    where: { id: childId },
    data: updateData,
  });

  if (appName) {
    await prisma.appUsageLog.create({
      data: {
        childId,
        appName: String(appName),
        startedAt: eventTimestamp ? new Date(eventTimestamp) : new Date(),
        durationMinutes: Number(durationMinutes) > 0 ? Number(durationMinutes) : 5,
      },
    });
  }

  if (harmfulContentDetected) {
    const detailsObj = {
      category: harmfulCategory || "unspecified",
      preview: harmfulContentText ? String(harmfulContentText).slice(0, 120) : null,
    };
    await prisma.parentAlert.create({
      data: {
        parentId: child.parentId,
        childId: child.id,
        type: "harmful_content",
        message: `${child.name} accessed potentially harmful content`,
        details: JSON.stringify(detailsObj),
      },
    });
  }

  return res.json({ message: "Telemetry updated" });
});

app.get("/api/parent/children", authMiddleware, parentOnly, async (req, res) => {
  const parentId = req.user.sub;
  const rows = await prisma.child.findMany({
    where: { parentId },
    include: { blockedApps: true, appUsageLogs: true },
    orderBy: { lastSeen: "desc" },
  });
  return res.json({ children: rows.map(childToApi) });
});

app.get("/api/parent/children/:childId", authMiddleware, parentOnly, async (req, res) => {
  const parentId = req.user.sub;
  const child = await prisma.child.findFirst({
    where: { id: req.params.childId, parentId },
    include: { blockedApps: true, appUsageLogs: true },
  });

  if (!child) {
    return res.status(404).json({ error: "Child not found" });
  }

  return res.json({ child: childToApi(child) });
});

app.patch("/api/parent/children/:childId/screen-time-limit", authMiddleware, parentOnly, async (req, res) => {
  const parentId = req.user.sub;
  const { childId } = req.params;
  const { limitMinutes } = req.body || {};
  const parsedLimit = Number(limitMinutes);

  if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
    return res.status(400).json({ error: "limitMinutes must be a positive number" });
  }

  const updated = await prisma.child.updateMany({
    where: { id: childId, parentId },
    data: { screenTimeLimitMinutes: parsedLimit },
  });

  if (updated.count === 0) {
    return res.status(404).json({ error: "Child not found" });
  }

  const child = await prisma.child.findFirst({
    where: { id: childId, parentId },
    include: { blockedApps: true, appUsageLogs: true },
  });

  return res.json({
    message: "Screen time limit updated",
    child: childToApi(child),
  });
});

app.patch("/api/parent/children/:childId/apps/block", authMiddleware, parentOnly, async (req, res) => {
  const parentId = req.user.sub;
  const { childId } = req.params;
  const appName = String(req.body?.appName || "").trim();

  if (!appName) {
    return res.status(400).json({ error: "appName is required" });
  }

  const child = await prisma.child.findFirst({
    where: { id: childId, parentId },
  });
  if (!child) {
    return res.status(404).json({ error: "Child not found" });
  }

  await prisma.blockedApp.upsert({
    where: {
      childId_appName: { childId, appName },
    },
    create: { childId, appName },
    update: {},
  });

  const blocked = await prisma.blockedApp.findMany({
    where: { childId },
    select: { appName: true },
  });

  return res.json({
    message: "App blocked",
    blockedApps: blocked.map((b) => b.appName),
  });
});

app.patch("/api/parent/children/:childId/apps/unblock", authMiddleware, parentOnly, async (req, res) => {
  const parentId = req.user.sub;
  const { childId } = req.params;
  const appName = String(req.body?.appName || "").trim();

  if (!appName) {
    return res.status(400).json({ error: "appName is required" });
  }

  const child = await prisma.child.findFirst({
    where: { id: childId, parentId },
  });
  if (!child) {
    return res.status(404).json({ error: "Child not found" });
  }

  await prisma.blockedApp.deleteMany({
    where: { childId, appName },
  });

  const blocked = await prisma.blockedApp.findMany({
    where: { childId },
    select: { appName: true },
  });

  return res.json({
    message: "App unblocked",
    blockedApps: blocked.map((b) => b.appName),
  });
});

app.get("/api/parent/children/:childId/activity-report", authMiddleware, parentOnly, async (req, res) => {
  const parentId = req.user.sub;
  const { childId } = req.params;
  const range = String(req.query.range || "day");

  const child = await prisma.child.findFirst({
    where: { id: childId, parentId },
  });
  if (!child) {
    return res.status(404).json({ error: "Child not found" });
  }

  const now = new Date();
  const rangeDays = range === "month" ? 30 : range === "week" ? 7 : 1;
  const rangeStart = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);

  const logs = await prisma.appUsageLog.findMany({
    where: {
      childId,
      startedAt: { gte: rangeStart },
    },
    orderBy: { startedAt: "asc" },
  });

  const timeline = logs.map((l) => ({
    appName: l.appName,
    startedAt: l.startedAt.toISOString(),
    durationMinutes: l.durationMinutes,
  }));

  const totalsByApp = {};
  const totalsByDay = {};

  for (const entry of logs) {
    const minutes = Number(entry.durationMinutes) || 0;
    const day = dateKeyFromISO(entry.startedAt.toISOString());
    totalsByApp[entry.appName] = (totalsByApp[entry.appName] || 0) + minutes;
    totalsByDay[day] = (totalsByDay[day] || 0) + minutes;
  }

  return res.json({
    range,
    childId: child.id,
    timeline,
    totalsByApp,
    totalsByDay,
  });
});

app.get("/api/parent/alerts", authMiddleware, parentOnly, async (req, res) => {
  const parentId = req.user.sub;
  const unreadOnly = String(req.query.unreadOnly || "false") === "true";
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));

  const where = { parentId, ...(unreadOnly ? { read: false } : {}) };

  const [alerts, unreadCount] = await Promise.all([
    prisma.parentAlert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.parentAlert.count({ where: { parentId, read: false } }),
  ]);

  const mapped = alerts.map((a) => ({
    id: a.id,
    parentId: a.parentId,
    childId: a.childId,
    type: a.type,
    message: a.message,
    details: a.details ? JSON.parse(a.details) : null,
    createdAt: a.createdAt.toISOString(),
    read: a.read,
  }));

  return res.json({
    alerts: mapped,
    unreadCount,
  });
});

app.patch("/api/parent/alerts/:alertId/read", authMiddleware, parentOnly, async (req, res) => {
  const parentId = req.user.sub;

  const updated = await prisma.parentAlert.updateMany({
    where: { id: req.params.alertId, parentId },
    data: { read: true },
  });

  if (updated.count === 0) {
    return res.status(404).json({ error: "Alert not found" });
  }

  const alert = await prisma.parentAlert.findUnique({
    where: { id: req.params.alertId },
  });

  return res.json({
    message: "Alert marked as read",
    alert: alert
      ? {
          ...alert,
          details: alert.details ? JSON.parse(alert.details) : null,
          createdAt: alert.createdAt.toISOString(),
        }
      : null,
  });
});

app.get("/api/child/config", childAuthMiddleware, async (req, res) => {
  const child = await prisma.child.findUnique({
    where: { id: req.child.childId },
    include: { blockedApps: true },
  });

  if (!child) {
    return res.status(404).json({ error: "Child not found" });
  }

  return res.json({
    childId: child.id,
    screenTimeLimitMinutes: child.screenTimeLimitMinutes,
    blockedApps: child.blockedApps.map((b) => b.appName),
  });
});

async function start() {
  await ensureSeedUser();

  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
    console.log(`Allowed frontend origin: ${FRONTEND_URL}`);
    console.log("Database: SQLite (Prisma)");
    console.log("Seeded login:");
    console.log(`Email: ${DEFAULT_PARENT_EMAIL}`);
    console.log(`Password: ${DEFAULT_PARENT_PASSWORD}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
