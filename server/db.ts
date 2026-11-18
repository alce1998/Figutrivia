import crypto from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { figutriviaUsers, type FiguUser, type InsertFiguUser } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;
let _tablesInitialized = false;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      let dbUrl = process.env.DATABASE_URL.trim();
      if (dbUrl.includes("tidbcloud.com") && !dbUrl.includes("ssl=")) {
        dbUrl +=
          (dbUrl.includes("?") ? "&" : "?") + 'ssl={"rejectUnauthorized":true}';
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

export async function ensureFiguTriviaTables(db: ReturnType<typeof drizzle>) {
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

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

export async function getUserByOpenId(
  openId: string
): Promise<FiguUser | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(figutriviaUsers)
    .where(eq(figutriviaUsers.openId, openId))
    .limit(1);
  return rows[0];
}

export async function getUserByEmail(
  email: string
): Promise<FiguUser | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(figutriviaUsers)
    .where(eq(figutriviaUsers.email, email.toLowerCase()))
    .limit(1);
  return rows[0];
}

export async function getUserByUsername(
  username: string
): Promise<FiguUser | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(figutriviaUsers)
    .where(eq(figutriviaUsers.username, username))
    .limit(1);
  return rows[0];
}

export async function createFiguUser(
  user: InsertFiguUser
): Promise<FiguUser> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(figutriviaUsers).values(user);
  const created = await getUserByOpenId(user.openId);
  if (!created) throw new Error("Failed to load created user");
  return created;
}

export async function touchUserSignIn(openId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(figutriviaUsers)
    .set({ lastSignedIn: new Date() })
    .where(eq(figutriviaUsers.openId, openId));
}
