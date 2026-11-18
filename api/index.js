// server/_core/vercel-entry.ts
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/routers.ts
import { TRPCError as TRPCError2 } from "@trpc/server";
import { and, desc, eq as eq2, sql as sql2 } from "drizzle-orm";
import nodemailer from "nodemailer";
import { z } from "zod";

// drizzle/schema.ts
import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from "drizzle-orm/mysql-core";
var figutriviaUsers = mysqlTable("figutrivia_users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  username: varchar("username", { length: 32 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 32 }).default("email").notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});
var figutriviaProgress = mysqlTable(
  "figutrivia_progress",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    playerId: varchar("playerId", { length: 64 }).notNull(),
    solved: int("solved").default(0).notNull(),
    hintsUsed: text("hintsUsed"),
    // JSON array of HintType
    pointsAwarded: int("pointsAwarded").default(0).notNull(),
    unlockedByUserId: int("unlockedByUserId"),
    solvedAt: timestamp("solvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
  },
  (t2) => ({
    userPlayerUnique: uniqueIndex("figutrivia_progress_user_player_idx").on(
      t2.userId,
      t2.playerId
    )
  })
);
var figutriviaPoints = mysqlTable("figutrivia_points", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  points: int("points").default(0).notNull(),
  totalEarned: int("totalEarned").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var figutriviaAchievements = mysqlTable(
  "figutrivia_achievements",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    achievementId: varchar("achievementId", { length: 64 }).notNull(),
    unlockedAt: timestamp("unlockedAt").defaultNow().notNull()
  },
  (t2) => ({
    userAchUnique: uniqueIndex("figutrivia_ach_user_id_idx").on(
      t2.userId,
      t2.achievementId
    )
  })
);
var figutriviaMancolista = mysqlTable(
  "figutrivia_mancolista",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    playerId: varchar("playerId", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull()
  },
  (t2) => ({
    userMancoUnique: uniqueIndex("figutrivia_manco_user_player_idx").on(
      t2.userId,
      t2.playerId
    )
  })
);
var figutriviaMancolistaGifts = mysqlTable("figutrivia_mancolista_gifts", {
  id: int("id").autoincrement().primaryKey(),
  senderUserId: int("senderUserId").notNull(),
  recipientUserId: int("recipientUserId").notNull(),
  playerId: varchar("playerId", { length: 64 }).notNull(),
  giftDate: varchar("giftDate", { length: 10 }).notNull(),
  // YYYY-MM-DD (Europe/Rome)
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var figutriviaErrorReports = mysqlTable("figutrivia_error_reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  reporterEmail: varchar("reporterEmail", { length: 320 }),
  playerId: varchar("playerId", { length: 64 }).notNull(),
  playerName: varchar("playerName", { length: 160 }).notNull(),
  albumDecade: varchar("albumDecade", { length: 32 }).notNull(),
  numero: int("numero").notNull(),
  description: text("description").notNull(),
  emailSent: int("emailSent").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});

// shared/const.ts
var COOKIE_NAME = "figutrivia_session";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var UNAUTHED_ERR_MSG = "Devi accedere per continuare (10001)";
var NOT_ADMIN_ERR_MSG = "Permessi insufficienti (10002)";

// shared/figutrivia.ts
var ALBUM_DECADES = [
  {
    key: "1980-89",
    label: "1979\u201389",
    subtitle: "Stagioni 1979/80 \u2013 1989/90 (e presenze prec.)",
    badgeColor: "bg-amber-400"
  },
  {
    key: "1990-99",
    label: "1990\u201399",
    subtitle: "Stagioni 1990/91 \u2013 1999/00",
    badgeColor: "bg-emerald-400"
  },
  {
    key: "2000-09",
    label: "2000\u201309",
    subtitle: "Stagioni 2000/01 \u2013 2009/10",
    badgeColor: "bg-sky-400"
  },
  {
    key: "2010-19",
    label: "2010\u201319",
    subtitle: "Stagioni 2010/11 \u2013 2019/20",
    badgeColor: "bg-violet-400"
  },
  {
    key: "2020-oggi",
    label: "2020\u2013oggi",
    subtitle: "Stagioni 2020/21 \u2013 oggi",
    badgeColor: "bg-rose-400"
  }
];
var HINT_COSTS = {
  anno_ruolo: 1,
  nazionalita_presenze: 1,
  iniziali: 3
};
var MAX_MANCOLISTA_SIZE = 50;
var MAX_DAILY_GIFTS = 5;
function getPointsForAppearances(apps) {
  if (apps >= 400) return 1;
  if (apps >= 300) return 2;
  if (apps >= 200) return 3;
  if (apps >= 100) return 4;
  return 5;
}
var ALBUM_SECTION_SIZE = 150;
function getAlbumSections(decade, totalInDecade) {
  const out = [];
  if (totalInDecade <= 0) return out;
  let idx = 1;
  for (let start = 1; start <= totalInDecade; start += ALBUM_SECTION_SIZE) {
    const end = Math.min(totalInDecade, start + ALBUM_SECTION_SIZE - 1);
    out.push({
      index: idx,
      id: `album_${decade}_sec_${idx}`,
      label: `${start}\u2013${end}`,
      min: start,
      max: end,
      count: end - start + 1
    });
    idx++;
  }
  return out;
}
var TROPHIES = [
  {
    id: "found_100",
    title: "Primo Centinaio",
    description: "Trova 100 giocatori negli album FiguTrivia",
    category: "milestone",
    threshold: 100,
    icon: "\u{1F949}"
  },
  {
    id: "found_500",
    title: "Collezionista Esperto",
    description: "Trova 500 giocatori negli album FiguTrivia",
    category: "milestone",
    threshold: 500,
    icon: "\u{1F948}"
  },
  {
    id: "found_1000",
    title: "Mille Figurine",
    description: "Trova 1.000 giocatori negli album FiguTrivia",
    category: "milestone",
    threshold: 1e3,
    icon: "\u{1F947}"
  },
  {
    id: "found_all",
    title: "Leggenda Assoluta",
    description: "Trova tutti i giocatori presenti sul sito",
    category: "milestone",
    isAllPlayers: true,
    icon: "\u{1F451}"
  },
  ...ALBUM_DECADES.map((d) => ({
    id: `album_${d.key}`,
    title: `Album ${d.label} Completo`,
    description: `Completa tutte le sezioni dell'album ${d.label} per comporre il trofeo`,
    category: "album",
    decade: d.key,
    icon: "\u{1F3C6}"
  }))
];
function normalizePlayerStr(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").trim();
}
var COMPOUND_GIVEN_NAMES = /* @__PURE__ */ new Set([
  "gian marco",
  "jose luis",
  "fabian natale",
  "antonio carlos",
  "john arne",
  "marc oliver",
  "tore andre",
  "juan pablo",
  "joseph dayo",
  "ramos borges",
  "pier luigi",
  "gian luca",
  "jean pierre",
  "jan vennegoor",
  "luis antonio",
  "marco antonio",
  "carlos alberto",
  "paulo cesar",
  "paulo roberto",
  "pedro pablo"
]);
function extractSurname(fullName) {
  const cleaned = fullName.replace(/\s+Jr\.?$/i, "").trim();
  const parts = cleaned.split(/\s+/);
  if (parts.length <= 1) return parts[0] || fullName;
  if (parts.length === 2) return parts[1];
  const firstTwo = normalizePlayerStr(`${parts[0]} ${parts[1]}`);
  if (COMPOUND_GIVEN_NAMES.has(firstTwo)) {
    return parts.slice(2).join(" ");
  }
  return parts.slice(1).join(" ");
}
function matchesPlayerName(guess, fullName) {
  const normGuess = normalizePlayerStr(guess);
  const normFull = normalizePlayerStr(fullName);
  const normSurname = normalizePlayerStr(extractSurname(fullName));
  if (!normGuess) return false;
  return normGuess === normFull || normGuess === normSurname;
}

// server/dataLoader.ts
import fs from "node:fs";
import path from "node:path";
var cachedPlayers = null;
var cachedById = null;
var cachedCountsByDecade = null;
var cachedMtimeMs = 0;
function resolvePlayersPath() {
  const candidates = [
    path.join(process.cwd(), "client", "public", "data", "figutrivia_players.json"),
    path.join(process.cwd(), "dist", "public", "data", "figutrivia_players.json"),
    path.join(process.cwd(), "public", "data", "figutrivia_players.json")
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("figutrivia_players.json not found");
}
function ensureLoaded() {
  const filePath = resolvePlayersPath();
  const stat = fs.statSync(filePath);
  if (cachedPlayers && stat.mtimeMs === cachedMtimeMs) return;
  cachedMtimeMs = stat.mtimeMs;
  const raw = fs.readFileSync(filePath, "utf8");
  const list = JSON.parse(raw);
  cachedPlayers = list;
  cachedById = /* @__PURE__ */ new Map();
  cachedCountsByDecade = {
    "1980-89": 0,
    "1990-99": 0,
    "2000-09": 0,
    "2010-19": 0,
    "2020-oggi": 0
  };
  for (const p of list) {
    cachedById.set(p.player_id, p);
    cachedCountsByDecade[p.album_decade] = (cachedCountsByDecade[p.album_decade] || 0) + 1;
  }
}
function getAllPlayers() {
  ensureLoaded();
  return cachedPlayers;
}
function getPlayerById(playerId) {
  ensureLoaded();
  return cachedById.get(playerId);
}
function getCountsByDecade() {
  ensureLoaded();
  return cachedCountsByDecade;
}

// server/db.ts
import crypto from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
var _db = null;
var _tablesInitialized = false;
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      let dbUrl = process.env.DATABASE_URL.trim();
      if (dbUrl.includes("tidbcloud.com") && !dbUrl.includes("ssl=")) {
        dbUrl += (dbUrl.includes("?") ? "&" : "?") + 'ssl={"rejectUnauthorized":true}';
      }
      _db = drizzle(dbUrl);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  if (_db && !_tablesInitialized) {
    await ensureFiguTriviaTables(_db);
    _tablesInitialized = true;
  }
  return _db;
}
async function ensureFiguTriviaTables(db) {
  await db.execute(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS figutrivia_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      openId VARCHAR(64) NOT NULL UNIQUE,
      username VARCHAR(32) NOT NULL UNIQUE,
      email VARCHAR(320) NOT NULL UNIQUE,
      passwordHash VARCHAR(255) NULL,
      loginMethod VARCHAR(32) NOT NULL DEFAULT 'email',
      role ENUM('user','admin') NOT NULL DEFAULT 'user',
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      lastSignedIn TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
  );
  await db.execute(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS figutrivia_progress (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      playerId VARCHAR(64) NOT NULL,
      solved INT NOT NULL DEFAULT 0,
      hintsUsed TEXT NULL,
      pointsAwarded INT NOT NULL DEFAULT 0,
      unlockedByUserId INT NULL,
      solvedAt TIMESTAMP NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY figutrivia_progress_user_player_idx (userId, playerId)
    )`)
  );
  await db.execute(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS figutrivia_points (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL UNIQUE,
      points INT NOT NULL DEFAULT 0,
      totalEarned INT NOT NULL DEFAULT 0,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`)
  );
  await db.execute(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS figutrivia_achievements (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      achievementId VARCHAR(64) NOT NULL,
      unlockedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY figutrivia_ach_user_id_idx (userId, achievementId)
    )`)
  );
  await db.execute(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS figutrivia_mancolista (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NOT NULL,
      playerId VARCHAR(64) NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY figutrivia_manco_user_player_idx (userId, playerId)
    )`)
  );
  await db.execute(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS figutrivia_mancolista_gifts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      senderUserId INT NOT NULL,
      recipientUserId INT NOT NULL,
      playerId VARCHAR(64) NOT NULL,
      giftDate VARCHAR(10) NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
  );
  await db.execute(
    sql.raw(`
    CREATE TABLE IF NOT EXISTS figutrivia_error_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userId INT NULL,
      reporterEmail VARCHAR(320) NULL,
      playerId VARCHAR(64) NOT NULL,
      playerName VARCHAR(160) NOT NULL,
      albumDecade VARCHAR(32) NOT NULL,
      numero INT NOT NULL,
      description TEXT NOT NULL,
      emailSent INT NOT NULL DEFAULT 0,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
  );
}
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, storedHash) {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(figutriviaUsers).where(eq(figutriviaUsers.openId, openId)).limit(1);
  return rows[0];
}
async function getUserByEmail(email) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(figutriviaUsers).where(eq(figutriviaUsers.email, email.toLowerCase())).limit(1);
  return rows[0];
}
async function getUserByUsername(username) {
  const db = await getDb();
  if (!db) return void 0;
  const rows = await db.select().from(figutriviaUsers).where(eq(figutriviaUsers.username, username)).limit(1);
  return rows[0];
}
async function createFiguUser(user) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(figutriviaUsers).values(user);
  const created = await getUserByOpenId(user.openId);
  if (!created) throw new Error("Failed to load created user");
  return created;
}
async function touchUserSignIn(openId) {
  const db = await getDb();
  if (!db) return;
  await db.update(figutriviaUsers).set({ lastSignedIn: /* @__PURE__ */ new Date() }).where(eq(figutriviaUsers.openId, openId));
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const list = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return list.some((p) => p.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isSecureRequest(req)
  };
}

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID || "figutrivia",
  cookieSecret: process.env.JWT_SECRET || "figutrivia-dev-jwt-secret-change-in-prod",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  errorReportEmail: process.env.ERROR_REPORT_EMAIL || "alessandro.centra10@gmail.com"
};

// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/routers.ts
function getRomeDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(/* @__PURE__ */ new Date());
}
async function evaluateAndUnlockTrophies(db, userId) {
  const solvedRows = await db.select({ playerId: figutriviaProgress.playerId }).from(figutriviaProgress).where(
    and(
      eq2(figutriviaProgress.userId, userId),
      eq2(figutriviaProgress.solved, 1)
    )
  );
  const solvedSet = new Set(solvedRows.map((r) => r.playerId));
  const totalSolved = solvedSet.size;
  const solvedByDecade = {
    "1980-89": 0,
    "1990-99": 0,
    "2000-09": 0,
    "2010-19": 0,
    "2020-oggi": 0
  };
  const solvedPlayersByDecade = {
    "1980-89": [],
    "1990-99": [],
    "2000-09": [],
    "2010-19": [],
    "2020-oggi": []
  };
  for (const pid of Array.from(solvedSet)) {
    const player = getPlayerById(pid);
    if (player) {
      solvedByDecade[player.album_decade]++;
      solvedPlayersByDecade[player.album_decade].push(player.numero);
    }
  }
  const allPlayersCount = getAllPlayers().length;
  const decadeTotals = getCountsByDecade();
  const eligibleIds = [];
  for (const t2 of TROPHIES) {
    if (t2.category === "milestone") {
      const target = t2.isAllPlayers ? allPlayersCount : t2.threshold;
      if (target !== void 0 && target > 0 && totalSolved >= target) {
        eligibleIds.push(t2.id);
      }
    } else if (t2.category === "album" && t2.decade) {
      const target = decadeTotals[t2.decade] || 0;
      const sections = getAlbumSections(t2.decade, target);
      const solvedNums = solvedPlayersByDecade[t2.decade] || [];
      for (const sec of sections) {
        const solvedInSec = solvedNums.filter(
          (n) => n >= sec.min && n <= sec.max
        ).length;
        if (sec.count > 0 && solvedInSec >= sec.count) {
          eligibleIds.push(sec.id);
        }
      }
      if (target > 0 && solvedByDecade[t2.decade] >= target) {
        eligibleIds.push(t2.id);
      }
    }
  }
  if (eligibleIds.length === 0) return [];
  const existing = await db.select({ achievementId: figutriviaAchievements.achievementId }).from(figutriviaAchievements).where(eq2(figutriviaAchievements.userId, userId));
  const existingSet = new Set(existing.map((e) => e.achievementId));
  const newlyUnlocked = [];
  for (const id of eligibleIds) {
    if (!existingSet.has(id)) {
      await db.insert(figutriviaAchievements).values({ userId, achievementId: id }).onDuplicateKeyUpdate({ set: { achievementId: id } });
      newlyUnlocked.push(id);
    }
  }
  return newlyUnlocked;
}
async function getDiscoveryStatsForPlayer(db, playerId) {
  const [usersCountRows, solversRows] = await Promise.all([
    db.select({ cnt: sql2`COUNT(*)` }).from(figutriviaUsers),
    db.select({ cnt: sql2`COUNT(*)` }).from(figutriviaProgress).where(
      and(
        eq2(figutriviaProgress.playerId, playerId),
        eq2(figutriviaProgress.solved, 1)
      )
    )
  ]);
  const totalUsers = Number(usersCountRows[0]?.cnt ?? 1) || 1;
  const solvers = Number(solversRows[0]?.cnt ?? 0);
  const pct = Math.round(solvers / totalUsers * 1e3) / 10;
  return { solvers, totalUsers, pct };
}
var appRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      if (!ctx.user) return null;
      return {
        id: ctx.user.id,
        username: ctx.user.username,
        email: ctx.user.email,
        role: ctx.user.role
      };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, {
        ...getSessionCookieOptions(ctx.req),
        maxAge: -1
      });
      return { success: true };
    })
  }),
  album: router({
    getState: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const today = getRomeDateString();
      const [
        progressRows,
        pointsRows,
        achRows,
        mancoRows,
        giftsTodayRows,
        usersCountRows,
        discoveryRows,
        allUsersRows
      ] = await Promise.all([
        db.select().from(figutriviaProgress).where(eq2(figutriviaProgress.userId, ctx.user.id)),
        db.select().from(figutriviaPoints).where(eq2(figutriviaPoints.userId, ctx.user.id)).limit(1),
        db.select().from(figutriviaAchievements).where(eq2(figutriviaAchievements.userId, ctx.user.id)),
        db.select().from(figutriviaMancolista).where(eq2(figutriviaMancolista.userId, ctx.user.id)),
        db.select({ cnt: sql2`COUNT(*)` }).from(figutriviaMancolistaGifts).where(
          and(
            eq2(figutriviaMancolistaGifts.senderUserId, ctx.user.id),
            eq2(figutriviaMancolistaGifts.giftDate, today)
          )
        ),
        db.select({ cnt: sql2`COUNT(*)` }).from(figutriviaUsers),
        db.select({
          playerId: figutriviaProgress.playerId,
          cnt: sql2`COUNT(*)`
        }).from(figutriviaProgress).where(eq2(figutriviaProgress.solved, 1)).groupBy(figutriviaProgress.playerId),
        db.select({
          id: figutriviaUsers.id,
          username: figutriviaUsers.username
        }).from(figutriviaUsers)
      ]);
      const usernameById = new Map(allUsersRows.map((u) => [u.id, u.username]));
      const discoveryCounts = {};
      for (const r of discoveryRows) {
        discoveryCounts[r.playerId] = Number(r.cnt);
      }
      const dailyGiftsUsed = Number(giftsTodayRows[0]?.cnt ?? 0);
      return {
        progress: progressRows.map((p) => ({
          playerId: p.playerId,
          solved: p.solved === 1,
          hintsUsed: (() => {
            try {
              return JSON.parse(p.hintsUsed || "[]");
            } catch {
              return [];
            }
          })(),
          pointsAwarded: p.pointsAwarded,
          unlockedByUsername: p.unlockedByUserId ? usernameById.get(p.unlockedByUserId) ?? null : null
        })),
        points: pointsRows[0]?.points ?? 0,
        totalEarned: pointsRows[0]?.totalEarned ?? 0,
        achievements: achRows.map((a) => ({
          achievementId: a.achievementId,
          unlockedAt: a.unlockedAt
        })),
        mancolista: mancoRows.map((m) => m.playerId),
        dailyGiftsUsed,
        dailyGiftsRemaining: Math.max(0, MAX_DAILY_GIFTS - dailyGiftsUsed),
        totalUsers: Number(usersCountRows[0]?.cnt ?? 1) || 1,
        discoveryCounts
      };
    }),
    guessPlayer: protectedProcedure.input(
      z.object({
        playerId: z.string().min(1).max(64),
        guess: z.string().min(1).max(160)
      })
    ).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const player = getPlayerById(input.playerId);
      if (!player) {
        throw new TRPCError2({
          code: "NOT_FOUND",
          message: "Giocatore non trovato."
        });
      }
      const isCorrect = matchesPlayerName(input.guess, player.name);
      if (!isCorrect) {
        return {
          correct: false,
          alreadySolved: false,
          pointsAwarded: 0,
          newPoints: null,
          newlyUnlockedTrophies: [],
          discoveryStats: null
        };
      }
      const existing = await db.select().from(figutriviaProgress).where(
        and(
          eq2(figutriviaProgress.userId, ctx.user.id),
          eq2(figutriviaProgress.playerId, player.player_id)
        )
      ).limit(1);
      const ptsRow = await db.select().from(figutriviaPoints).where(eq2(figutriviaPoints.userId, ctx.user.id)).limit(1);
      const currentPoints = ptsRow[0]?.points ?? 0;
      if (existing.length > 0 && existing[0].solved === 1) {
        const discoveryStats2 = await getDiscoveryStatsForPlayer(
          db,
          player.player_id
        );
        return {
          correct: true,
          alreadySolved: true,
          pointsAwarded: 0,
          newPoints: currentPoints,
          newlyUnlockedTrophies: [],
          discoveryStats: discoveryStats2
        };
      }
      const awarded = getPointsForAppearances(player.serie_a_apps);
      if (existing.length > 0) {
        await db.update(figutriviaProgress).set({
          solved: 1,
          pointsAwarded: awarded,
          solvedAt: /* @__PURE__ */ new Date()
        }).where(eq2(figutriviaProgress.id, existing[0].id));
      } else {
        await db.insert(figutriviaProgress).values({
          userId: ctx.user.id,
          playerId: player.player_id,
          solved: 1,
          hintsUsed: JSON.stringify([]),
          pointsAwarded: awarded,
          solvedAt: /* @__PURE__ */ new Date()
        });
      }
      if (ptsRow.length > 0) {
        await db.update(figutriviaPoints).set({
          points: ptsRow[0].points + awarded,
          totalEarned: ptsRow[0].totalEarned + awarded
        }).where(eq2(figutriviaPoints.userId, ctx.user.id));
      } else {
        await db.insert(figutriviaPoints).values({
          userId: ctx.user.id,
          points: awarded,
          totalEarned: awarded
        });
      }
      await db.delete(figutriviaMancolista).where(
        and(
          eq2(figutriviaMancolista.userId, ctx.user.id),
          eq2(figutriviaMancolista.playerId, player.player_id)
        )
      );
      const [newlyUnlockedTrophies, discoveryStats] = await Promise.all([
        evaluateAndUnlockTrophies(db, ctx.user.id),
        getDiscoveryStatsForPlayer(db, player.player_id)
      ]);
      return {
        correct: true,
        alreadySolved: false,
        pointsAwarded: awarded,
        newPoints: currentPoints + awarded,
        newlyUnlockedTrophies,
        discoveryStats
      };
    }),
    useHint: protectedProcedure.input(
      z.object({
        playerId: z.string().min(1).max(64),
        hintType: z.enum(["anno_ruolo", "nazionalita_presenze", "iniziali"])
      })
    ).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const player = getPlayerById(input.playerId);
      if (!player) {
        throw new TRPCError2({
          code: "NOT_FOUND",
          message: "Giocatore non trovato."
        });
      }
      const existing = await db.select().from(figutriviaProgress).where(
        and(
          eq2(figutriviaProgress.userId, ctx.user.id),
          eq2(figutriviaProgress.playerId, player.player_id)
        )
      ).limit(1);
      const currentHints = existing[0]?.hintsUsed ? JSON.parse(existing[0].hintsUsed) : [];
      if (currentHints.includes(input.hintType)) {
        const pts = await db.select().from(figutriviaPoints).where(eq2(figutriviaPoints.userId, ctx.user.id)).limit(1);
        return {
          success: true,
          newPoints: pts[0]?.points ?? 0,
          hintsUsed: currentHints
        };
      }
      const cost = HINT_COSTS[input.hintType];
      const ptsRows = await db.select().from(figutriviaPoints).where(eq2(figutriviaPoints.userId, ctx.user.id)).limit(1);
      const currentPoints = ptsRows[0]?.points ?? 0;
      if (currentPoints < cost) {
        throw new TRPCError2({
          code: "BAD_REQUEST",
          message: `Punti indizio insufficienti (servono ${cost} pt).`
        });
      }
      const nextPoints = currentPoints - cost;
      await db.update(figutriviaPoints).set({ points: nextPoints }).where(eq2(figutriviaPoints.userId, ctx.user.id));
      const nextHints = [...currentHints, input.hintType];
      if (existing.length > 0) {
        await db.update(figutriviaProgress).set({ hintsUsed: JSON.stringify(nextHints) }).where(eq2(figutriviaProgress.id, existing[0].id));
      } else {
        await db.insert(figutriviaProgress).values({
          userId: ctx.user.id,
          playerId: player.player_id,
          solved: 0,
          hintsUsed: JSON.stringify(nextHints)
        });
      }
      return {
        success: true,
        newPoints: nextPoints,
        hintsUsed: nextHints
      };
    }),
    reportError: protectedProcedure.input(
      z.object({
        playerId: z.string().min(1).max(64),
        description: z.string().trim().min(3).max(2e3)
      })
    ).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const player = getPlayerById(input.playerId);
      if (!player) {
        throw new TRPCError2({
          code: "NOT_FOUND",
          message: "Giocatore non trovato."
        });
      }
      let emailSent = false;
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      if (smtpHost && smtpUser && smtpPass) {
        try {
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: parseInt(smtpPort || "587", 10),
            secure: smtpPort === "465",
            auth: { user: smtpUser, pass: smtpPass }
          });
          await transporter.sendMail({
            from: smtpUser,
            to: ENV.errorReportEmail,
            replyTo: ctx.user.email,
            subject: `[FiguTrivia] Segnalazione Figurina #${player.numero} (${player.album_decade}) - ${player.name}`,
            text: [
              `Segnalazione errore da FiguTrivia`,
              `Utente: ${ctx.user.username} (${ctx.user.email})`,
              `Album: ${player.album_decade}`,
              `Figurina: #${player.numero} (ID: ${player.player_id})`,
              `Giocatore: ${player.name}`,
              `Presenze Serie A: ${player.serie_a_apps}`,
              ``,
              `Descrizione errore:`,
              input.description
            ].join("\n")
          });
          emailSent = true;
        } catch (err) {
          console.error("[FiguTrivia] Email error report failed:", err);
        }
      } else {
        console.warn(
          "[FiguTrivia] SMTP non configurato; segnalazione salvata su database."
        );
      }
      await db.insert(figutriviaErrorReports).values({
        userId: ctx.user.id,
        reporterEmail: ctx.user.email,
        playerId: player.player_id,
        playerName: player.name,
        albumDecade: player.album_decade,
        numero: player.numero,
        description: input.description,
        emailSent: emailSent ? 1 : 0
      });
      return {
        success: true,
        emailSent,
        recipient: ENV.errorReportEmail
      };
    })
  }),
  mancolista: router({
    toggle: protectedProcedure.input(z.object({ playerId: z.string().min(1).max(64) })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const player = getPlayerById(input.playerId);
      if (!player) {
        throw new TRPCError2({
          code: "NOT_FOUND",
          message: "Giocatore non trovato."
        });
      }
      const existing = await db.select().from(figutriviaMancolista).where(
        and(
          eq2(figutriviaMancolista.userId, ctx.user.id),
          eq2(figutriviaMancolista.playerId, player.player_id)
        )
      ).limit(1);
      if (existing.length > 0) {
        await db.delete(figutriviaMancolista).where(eq2(figutriviaMancolista.id, existing[0].id));
        return { inMancolista: false };
      }
      const solvedRow = await db.select({ id: figutriviaProgress.id }).from(figutriviaProgress).where(
        and(
          eq2(figutriviaProgress.userId, ctx.user.id),
          eq2(figutriviaProgress.playerId, player.player_id),
          eq2(figutriviaProgress.solved, 1)
        )
      ).limit(1);
      if (solvedRow.length > 0) {
        throw new TRPCError2({
          code: "BAD_REQUEST",
          message: "Hai gi\xE0 sbloccato questa figurina."
        });
      }
      const currentManco = await db.select({ cnt: sql2`COUNT(*)` }).from(figutriviaMancolista).where(eq2(figutriviaMancolista.userId, ctx.user.id));
      const count = Number(currentManco[0]?.cnt ?? 0);
      if (count >= MAX_MANCOLISTA_SIZE) {
        throw new TRPCError2({
          code: "BAD_REQUEST",
          message: `La tua Mancolista ha gi\xE0 raggiunto il massimo di ${MAX_MANCOLISTA_SIZE} giocatori.`
        });
      }
      await db.insert(figutriviaMancolista).values({
        userId: ctx.user.id,
        playerId: player.player_id
      });
      return { inMancolista: true };
    }),
    listAll: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const today = getRomeDateString();
      const [usersRows, mancoRows, solvedCountsRows, giftsTodayRows] = await Promise.all([
        db.select({
          id: figutriviaUsers.id,
          username: figutriviaUsers.username
        }).from(figutriviaUsers),
        db.select().from(figutriviaMancolista).orderBy(desc(figutriviaMancolista.createdAt)),
        db.select({
          userId: figutriviaProgress.userId,
          cnt: sql2`COUNT(*)`
        }).from(figutriviaProgress).where(eq2(figutriviaProgress.solved, 1)).groupBy(figutriviaProgress.userId),
        db.select({ cnt: sql2`COUNT(*)` }).from(figutriviaMancolistaGifts).where(
          and(
            eq2(figutriviaMancolistaGifts.senderUserId, ctx.user.id),
            eq2(figutriviaMancolistaGifts.giftDate, today)
          )
        )
      ]);
      const solvedCountByUser = new Map(
        solvedCountsRows.map((r) => [r.userId, Number(r.cnt)])
      );
      const itemsByUser = /* @__PURE__ */ new Map();
      for (const m of mancoRows) {
        const list = itemsByUser.get(m.userId) ?? [];
        list.push({ playerId: m.playerId, createdAt: m.createdAt });
        itemsByUser.set(m.userId, list);
      }
      const lists = usersRows.map((u) => ({
        userId: u.id,
        username: u.username,
        isSelf: u.id === ctx.user.id,
        solvedCount: solvedCountByUser.get(u.id) ?? 0,
        items: itemsByUser.get(u.id) ?? []
      })).filter((u) => u.isSelf || u.items.length > 0).sort((a, b) => {
        if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
        return b.items.length - a.items.length;
      });
      const dailyGiftsUsed = Number(giftsTodayRows[0]?.cnt ?? 0);
      return {
        lists,
        dailyGiftsUsed,
        dailyGiftsRemaining: Math.max(0, MAX_DAILY_GIFTS - dailyGiftsUsed)
      };
    }),
    giftSticker: protectedProcedure.input(
      z.object({
        recipientUserId: z.number().int().positive(),
        playerId: z.string().min(1).max(64)
      })
    ).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (input.recipientUserId === ctx.user.id) {
        throw new TRPCError2({
          code: "BAD_REQUEST",
          message: "Non puoi sbloccare figurine nella tua stessa mancolista."
        });
      }
      const player = getPlayerById(input.playerId);
      if (!player) {
        throw new TRPCError2({
          code: "NOT_FOUND",
          message: "Giocatore non trovato."
        });
      }
      const senderSolved = await db.select({ id: figutriviaProgress.id }).from(figutriviaProgress).where(
        and(
          eq2(figutriviaProgress.userId, ctx.user.id),
          eq2(figutriviaProgress.playerId, player.player_id),
          eq2(figutriviaProgress.solved, 1)
        )
      ).limit(1);
      if (senderSolved.length === 0) {
        throw new TRPCError2({
          code: "FORBIDDEN",
          message: "Puoi regalare/sbloccare solo giocatori che hai gi\xE0 trovato nel tuo album."
        });
      }
      const today = getRomeDateString();
      const giftsTodayRows = await db.select({ cnt: sql2`COUNT(*)` }).from(figutriviaMancolistaGifts).where(
        and(
          eq2(figutriviaMancolistaGifts.senderUserId, ctx.user.id),
          eq2(figutriviaMancolistaGifts.giftDate, today)
        )
      );
      const dailyGiftsUsed = Number(giftsTodayRows[0]?.cnt ?? 0);
      if (dailyGiftsUsed >= MAX_DAILY_GIFTS) {
        throw new TRPCError2({
          code: "BAD_REQUEST",
          message: `Hai gi\xE0 raggiunto il limite di ${MAX_DAILY_GIFTS} figurine regalate oggi.`
        });
      }
      const mancoEntry = await db.select().from(figutriviaMancolista).where(
        and(
          eq2(figutriviaMancolista.userId, input.recipientUserId),
          eq2(figutriviaMancolista.playerId, player.player_id)
        )
      ).limit(1);
      if (mancoEntry.length === 0) {
        throw new TRPCError2({
          code: "NOT_FOUND",
          message: "Questa figurina non \xE8 pi\xF9 presente nella mancolista dell'utente."
        });
      }
      const recExisting = await db.select().from(figutriviaProgress).where(
        and(
          eq2(figutriviaProgress.userId, input.recipientUserId),
          eq2(figutriviaProgress.playerId, player.player_id)
        )
      ).limit(1);
      if (recExisting.length > 0 && recExisting[0].solved === 1) {
        await db.delete(figutriviaMancolista).where(eq2(figutriviaMancolista.id, mancoEntry[0].id));
        throw new TRPCError2({
          code: "BAD_REQUEST",
          message: "L'utente ha gi\xE0 sbloccato questo giocatore."
        });
      }
      if (recExisting.length > 0) {
        await db.update(figutriviaProgress).set({
          solved: 1,
          unlockedByUserId: ctx.user.id,
          solvedAt: /* @__PURE__ */ new Date()
        }).where(eq2(figutriviaProgress.id, recExisting[0].id));
      } else {
        await db.insert(figutriviaProgress).values({
          userId: input.recipientUserId,
          playerId: player.player_id,
          solved: 1,
          hintsUsed: JSON.stringify([]),
          pointsAwarded: 0,
          unlockedByUserId: ctx.user.id,
          solvedAt: /* @__PURE__ */ new Date()
        });
      }
      await Promise.all([
        db.delete(figutriviaMancolista).where(eq2(figutriviaMancolista.id, mancoEntry[0].id)),
        db.insert(figutriviaMancolistaGifts).values({
          senderUserId: ctx.user.id,
          recipientUserId: input.recipientUserId,
          playerId: player.player_id,
          giftDate: today
        })
      ]);
      await evaluateAndUnlockTrophies(db, input.recipientUserId);
      const nextUsed = dailyGiftsUsed + 1;
      return {
        success: true,
        dailyGiftsUsed: nextUsed,
        dailyGiftsRemaining: Math.max(0, MAX_DAILY_GIFTS - nextUsed)
      };
    })
  })
});

// server/_core/auth.ts
import crypto2 from "node:crypto";

// server/_core/sdk.ts
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
function getSessionSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}
async function createSessionToken(openId, username, expiresInMs = ONE_YEAR_MS) {
  const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1e3);
  return new SignJWT({
    openId,
    appId: ENV.appId,
    username
  }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(getSessionSecret());
}
async function verifySession(cookieValue) {
  if (!cookieValue) return null;
  try {
    const { payload } = await jwtVerify(cookieValue, getSessionSecret(), {
      algorithms: ["HS256"]
    });
    const { openId, appId, username } = payload;
    if (typeof openId !== "string" || !openId || typeof appId !== "string" || typeof username !== "string") {
      return null;
    }
    return { openId, appId, username };
  } catch {
    return null;
  }
}
async function authenticateRequest(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const parsed = parseCookieHeader(cookieHeader);
  const token = parsed[COOKIE_NAME];
  const session = await verifySession(token);
  if (!session) return null;
  const user = await getUserByOpenId(session.openId);
  return user ?? null;
}

// server/_core/auth.ts
var USERNAME_RE = /^[a-zA-Z0-9._-]{3,24}$/;
function registerAuthRoutes(app2) {
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const username = String(req.body?.username || "").trim();
      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");
      if (!USERNAME_RE.test(username)) {
        res.status(400).json({
          error: "Username non valido (3-24 caratteri: lettere, numeri, . _ -)."
        });
        return;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: "Inserisci un indirizzo email valido." });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({
          error: "La password deve contenere almeno 6 caratteri."
        });
        return;
      }
      const [existingEmail, existingUsername] = await Promise.all([
        getUserByEmail(email),
        getUserByUsername(username)
      ]);
      if (existingEmail) {
        res.status(409).json({ error: "Esiste gi\xE0 un account con questa email." });
        return;
      }
      if (existingUsername) {
        res.status(409).json({ error: "Questo username \xE8 gi\xE0 occupato." });
        return;
      }
      const openId = `figu_${crypto2.randomUUID().replace(/-/g, "")}`;
      const passwordHash = hashPassword(password);
      const user = await createFiguUser({
        openId,
        username,
        email,
        passwordHash,
        loginMethod: "email",
        role: "user",
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const token = await createSessionToken(user.openId, user.username);
      res.cookie(COOKIE_NAME, token, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS
      });
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error("[Auth] Register error:", error);
      res.status(500).json({ error: "Errore durante la registrazione." });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const identifier = String(req.body?.identifier || "").trim();
      const password = String(req.body?.password || "");
      if (!identifier || !password) {
        res.status(400).json({ error: "Inserisci email/username e password." });
        return;
      }
      const user = identifier.includes("@") ? await getUserByEmail(identifier.toLowerCase()) : await getUserByUsername(identifier);
      if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
        res.status(401).json({ error: "Credenziali non valide." });
        return;
      }
      await touchUserSignIn(user.openId);
      const token = await createSessionToken(user.openId, user.username);
      res.cookie(COOKIE_NAME, token, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS
      });
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error("[Auth] Login error:", error);
      res.status(500).json({ error: "Errore durante l'accesso." });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    res.clearCookie(COOKIE_NAME, {
      ...getSessionCookieOptions(req),
      maxAge: -1
    });
    res.json({ success: true });
  });
}

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await authenticateRequest(opts.req);
  } catch {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vercel-entry.ts
var app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
registerAuthRoutes(app);
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext
  })
);
var vercel_entry_default = app;
export {
  vercel_entry_default as default
};
