export type ParentUser = {
  id: string;
  email: string;
  name: string;
  role: "parent" | "super_admin";
  passwordHash: string;
  createdAt: string;
};

export type ChildRecord = {
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
  blockedWebsites?: string[];
  installedApps?: string[];
  riskyEvents: number;
  estimatedAge?: number | null;
  ageConfidence?: number;
  ageGroup?: "under_13" | "13_to_15" | "16_plus";
  suspiciousScore?: number;
  suspiciousSignals?: string[];
  lastSnapshotAt?: string | null;
  activeApp: string;
  isOnline: boolean;
};

export type ChildLinkCode = {
  id: string;
  parentId: string;
  childName: string;
  code: string;
  expiresAt: string;
  used: boolean;
};

export type ParentAlert = {
  id: string;
  parentId: string;
  childId: string;
  type: string;
  message: string;
  details?: { category?: string; preview?: string | null } | null;
  read: boolean;
  createdAt: string;
};

export type AppDb = {
  users: ParentUser[];
  children: ChildRecord[];
  linkCodes?: ChildLinkCode[];
  alerts?: ParentAlert[];
};
