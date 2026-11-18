import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const figutriviaUsers = mysqlTable("figutrivia_users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  username: varchar("username", { length: 32 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 32 }).default("email").notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type FiguUser = typeof figutriviaUsers.$inferSelect;
export type InsertFiguUser = typeof figutriviaUsers.$inferInsert;

export const figutriviaProgress = mysqlTable(
  "figutrivia_progress",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    playerId: varchar("playerId", { length: 64 }).notNull(),
    solved: int("solved").default(0).notNull(),
    hintsUsed: text("hintsUsed"), // JSON array of HintType
    pointsAwarded: int("pointsAwarded").default(0).notNull(),
    unlockedByUserId: int("unlockedByUserId"),
    solvedAt: timestamp("solvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => ({
    userPlayerUnique: uniqueIndex("figutrivia_progress_user_player_idx").on(
      t.userId,
      t.playerId
    ),
  })
);

export const figutriviaPoints = mysqlTable("figutrivia_points", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  points: int("points").default(0).notNull(),
  totalEarned: int("totalEarned").default(0).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const figutriviaAchievements = mysqlTable(
  "figutrivia_achievements",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    achievementId: varchar("achievementId", { length: 64 }).notNull(),
    unlockedAt: timestamp("unlockedAt").defaultNow().notNull(),
  },
  (t) => ({
    userAchUnique: uniqueIndex("figutrivia_ach_user_id_idx").on(
      t.userId,
      t.achievementId
    ),
  })
);

export const figutriviaMancolista = mysqlTable(
  "figutrivia_mancolista",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    playerId: varchar("playerId", { length: 64 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    userMancoUnique: uniqueIndex("figutrivia_manco_user_player_idx").on(
      t.userId,
      t.playerId
    ),
  })
);

export const figutriviaMancolistaGifts = mysqlTable("figutrivia_mancolista_gifts", {
  id: int("id").autoincrement().primaryKey(),
  senderUserId: int("senderUserId").notNull(),
  recipientUserId: int("recipientUserId").notNull(),
  playerId: varchar("playerId", { length: 64 }).notNull(),
  giftDate: varchar("giftDate", { length: 10 }).notNull(), // YYYY-MM-DD (Europe/Rome)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const figutriviaErrorReports = mysqlTable("figutrivia_error_reports", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  reporterEmail: varchar("reporterEmail", { length: 320 }),
  playerId: varchar("playerId", { length: 64 }).notNull(),
  playerName: varchar("playerName", { length: 160 }).notNull(),
  albumDecade: varchar("albumDecade", { length: 32 }).notNull(),
  numero: int("numero").notNull(),
  description: text("description").notNull(),
  emailSent: int("emailSent").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
