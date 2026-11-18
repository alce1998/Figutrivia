import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import nodemailer from "nodemailer";
import { z } from "zod";
import {
  figutriviaAchievements,
  figutriviaErrorReports,
  figutriviaMancolista,
  figutriviaMancolistaGifts,
  figutriviaPoints,
  figutriviaProgress,
  figutriviaUsers,
} from "../drizzle/schema";
import { COOKIE_NAME } from "../shared/const";
import {
  ALBUM_DECADES,
  HINT_COSTS,
  MAX_DAILY_GIFTS,
  MAX_MANCOLISTA_SIZE,
  TROPHIES,
  getAlbumSections,
  getPointsForAppearances,
  matchesPlayerName,
  type AlbumDecadeKey,
} from "../shared/figutrivia";
import { getAllPlayers, getCountsByDecade, getPlayerById } from "./dataLoader";
import { getDb } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";

function getRomeDateString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function evaluateAndUnlockTrophies(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  userId: number
): Promise<string[]> {
  const solvedRows = await db
    .select({ playerId: figutriviaProgress.playerId })
    .from(figutriviaProgress)
    .where(
      and(
        eq(figutriviaProgress.userId, userId),
        eq(figutriviaProgress.solved, 1)
      )
    );

  const solvedSet = new Set(solvedRows.map((r) => r.playerId));
  const totalSolved = solvedSet.size;

  const solvedByDecade: Record<AlbumDecadeKey, number> = {
    "1980-89": 0,
    "1990-99": 0,
    "2000-09": 0,
    "2010-19": 0,
    "2020-oggi": 0,
  };
  const solvedPlayersByDecade: Record<AlbumDecadeKey, number[]> = {
    "1980-89": [],
    "1990-99": [],
    "2000-09": [],
    "2010-19": [],
    "2020-oggi": [],
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
  const eligibleIds: string[] = [];

  for (const t of TROPHIES) {
    if (t.category === "milestone") {
      const target = t.isAllPlayers ? allPlayersCount : t.threshold;
      if (target !== undefined && target > 0 && totalSolved >= target) {
        eligibleIds.push(t.id);
      }
    } else if (t.category === "album" && t.decade) {
      const target = decadeTotals[t.decade] || 0;
      const sections = getAlbumSections(t.decade, target);
      const solvedNums = solvedPlayersByDecade[t.decade] || [];
      for (const sec of sections) {
        const solvedInSec = solvedNums.filter(
          (n) => n >= sec.min && n <= sec.max
        ).length;
        if (sec.count > 0 && solvedInSec >= sec.count) {
          eligibleIds.push(sec.id);
        }
      }
      if (target > 0 && solvedByDecade[t.decade] >= target) {
        eligibleIds.push(t.id);
      }
    }
  }

  if (eligibleIds.length === 0) return [];

  const existing = await db
    .select({ achievementId: figutriviaAchievements.achievementId })
    .from(figutriviaAchievements)
    .where(eq(figutriviaAchievements.userId, userId));
  const existingSet = new Set(existing.map((e) => e.achievementId));

  const newlyUnlocked: string[] = [];
  for (const id of eligibleIds) {
    if (!existingSet.has(id)) {
      await db
        .insert(figutriviaAchievements)
        .values({ userId, achievementId: id })
        .onDuplicateKeyUpdate({ set: { achievementId: id } });
      newlyUnlocked.push(id);
    }
  }
  return newlyUnlocked;
}

async function getDiscoveryStatsForPlayer(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  playerId: string
) {
  const [usersCountRows, solversRows] = await Promise.all([
    db.select({ cnt: sql<number>`COUNT(*)` }).from(figutriviaUsers),
    db
      .select({ cnt: sql<number>`COUNT(*)` })
      .from(figutriviaProgress)
      .where(
        and(
          eq(figutriviaProgress.playerId, playerId),
          eq(figutriviaProgress.solved, 1)
        )
      ),
  ]);
  const totalUsers = Number(usersCountRows[0]?.cnt ?? 1) || 1;
  const solvers = Number(solversRows[0]?.cnt ?? 0);
  const pct = Math.round((solvers / totalUsers) * 1000) / 10;
  return { solvers, totalUsers, pct };
}

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      if (!ctx.user) return null;
      return {
        id: ctx.user.id,
        username: ctx.user.username,
        email: ctx.user.email,
        role: ctx.user.role,
      };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, {
        ...getSessionCookieOptions(ctx.req),
        maxAge: -1,
      });
      return { success: true };
    }),
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
        allUsersRows,
        receivedGiftsRows,
      ] = await Promise.all([
        db
          .select()
          .from(figutriviaProgress)
          .where(eq(figutriviaProgress.userId, ctx.user.id)),
        db
          .select()
          .from(figutriviaPoints)
          .where(eq(figutriviaPoints.userId, ctx.user.id))
          .limit(1),
        db
          .select()
          .from(figutriviaAchievements)
          .where(eq(figutriviaAchievements.userId, ctx.user.id)),
        db
          .select()
          .from(figutriviaMancolista)
          .where(eq(figutriviaMancolista.userId, ctx.user.id)),
        db
          .select({ cnt: sql<number>`COUNT(*)` })
          .from(figutriviaMancolistaGifts)
          .where(
            and(
              eq(figutriviaMancolistaGifts.senderUserId, ctx.user.id),
              eq(figutriviaMancolistaGifts.giftDate, today)
            )
          ),
        db.select({ cnt: sql<number>`COUNT(*)` }).from(figutriviaUsers),
        db
          .select({
            playerId: figutriviaProgress.playerId,
            cnt: sql<number>`COUNT(*)`,
          })
          .from(figutriviaProgress)
          .where(eq(figutriviaProgress.solved, 1))
          .groupBy(figutriviaProgress.playerId),
        db
          .select({
            id: figutriviaUsers.id,
            username: figutriviaUsers.username,
          })
          .from(figutriviaUsers),
        db
          .select()
          .from(figutriviaMancolistaGifts)
          .where(eq(figutriviaMancolistaGifts.recipientUserId, ctx.user.id)),
      ]);

      const usernameById = new Map(allUsersRows.map((u) => [u.id, u.username]));
      const discoveryCounts: Record<string, number> = {};
      for (const r of discoveryRows) {
        discoveryCounts[r.playerId] = Number(r.cnt);
      }

      const dailyGiftsUsed = Number(giftsTodayRows[0]?.cnt ?? 0);

      const progressList = progressRows.map((p) => ({
        playerId: p.playerId,
        solved: p.solved === 1,
        hintsUsed: (() => {
          try {
            return JSON.parse(p.hintsUsed || "[]") as string[];
          } catch {
            return [];
          }
        })(),
        pointsAwarded: p.pointsAwarded,
        unlockedByUsername: p.unlockedByUserId
          ? usernameById.get(p.unlockedByUserId) ?? null
          : null,
      }));

      // Ensure every received gift is always reflected as solved in progress
      const progByPlayerId = new Map(progressList.map((p) => [p.playerId, p]));
      for (const g of receivedGiftsRows) {
        const senderName = usernameById.get(g.senderUserId) ?? "Un amico";
        const ex = progByPlayerId.get(g.playerId);
        if (!ex) {
          const item = {
            playerId: g.playerId,
            solved: true,
            hintsUsed: [] as string[],
            pointsAwarded: 0,
            unlockedByUsername: senderName,
          };
          progressList.push(item);
          progByPlayerId.set(g.playerId, item);
        } else if (!ex.solved) {
          ex.solved = true;
          ex.unlockedByUsername = senderName;
        }
      }

      return {
        progress: progressList,
        points: pointsRows[0]?.points ?? 0,
        totalEarned: pointsRows[0]?.totalEarned ?? 0,
        achievements: achRows.map((a) => ({
          achievementId: a.achievementId,
          unlockedAt: a.unlockedAt,
        })),
        mancolista: mancoRows.map((m) => m.playerId),
        dailyGiftsUsed,
        dailyGiftsRemaining: Math.max(0, MAX_DAILY_GIFTS - dailyGiftsUsed),
        totalUsers: Number(usersCountRows[0]?.cnt ?? 1) || 1,
        discoveryCounts,
        receivedGifts: receivedGiftsRows.map((g) => ({
          id: g.id,
          playerId: g.playerId,
          senderUsername: usernameById.get(g.senderUserId) ?? "Un amico",
          createdAt: g.createdAt,
        })),
      };
    }),

    guessPlayer: protectedProcedure
      .input(
        z.object({
          playerId: z.string().min(1).max(64),
          guess: z.string().min(1).max(160),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const player = getPlayerById(input.playerId);
        if (!player) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Giocatore non trovato.",
          });
        }

        const isCorrect = matchesPlayerName(input.guess, player.name);
        if (!isCorrect) {
          return {
            correct: false as const,
            alreadySolved: false,
            pointsAwarded: 0,
            newPoints: null,
            newlyUnlockedTrophies: [] as string[],
            discoveryStats: null,
          };
        }

        const existing = await db
          .select()
          .from(figutriviaProgress)
          .where(
            and(
              eq(figutriviaProgress.userId, ctx.user.id),
              eq(figutriviaProgress.playerId, player.player_id)
            )
          )
          .limit(1);

        const ptsRow = await db
          .select()
          .from(figutriviaPoints)
          .where(eq(figutriviaPoints.userId, ctx.user.id))
          .limit(1);
        const currentPoints = ptsRow[0]?.points ?? 0;

        if (existing.length > 0 && existing[0].solved === 1) {
          const discoveryStats = await getDiscoveryStatsForPlayer(
            db,
            player.player_id
          );
          return {
            correct: true as const,
            alreadySolved: true,
            pointsAwarded: 0,
            newPoints: currentPoints,
            newlyUnlockedTrophies: [] as string[],
            discoveryStats,
          };
        }

        const awarded = getPointsForAppearances(player.serie_a_apps);

        if (existing.length > 0) {
          await db
            .update(figutriviaProgress)
            .set({
              solved: 1,
              pointsAwarded: awarded,
              solvedAt: new Date(),
            })
            .where(eq(figutriviaProgress.id, existing[0].id));
        } else {
          await db.insert(figutriviaProgress).values({
            userId: ctx.user.id,
            playerId: player.player_id,
            solved: 1,
            hintsUsed: JSON.stringify([]),
            pointsAwarded: awarded,
            solvedAt: new Date(),
          });
        }

        if (ptsRow.length > 0) {
          await db
            .update(figutriviaPoints)
            .set({
              points: ptsRow[0].points + awarded,
              totalEarned: ptsRow[0].totalEarned + awarded,
            })
            .where(eq(figutriviaPoints.userId, ctx.user.id));
        } else {
          await db.insert(figutriviaPoints).values({
            userId: ctx.user.id,
            points: awarded,
            totalEarned: awarded,
          });
        }

        // Rimuovi dalla propria mancolista se presente
        await db
          .delete(figutriviaMancolista)
          .where(
            and(
              eq(figutriviaMancolista.userId, ctx.user.id),
              eq(figutriviaMancolista.playerId, player.player_id)
            )
          );

        const [newlyUnlockedTrophies, discoveryStats] = await Promise.all([
          evaluateAndUnlockTrophies(db, ctx.user.id),
          getDiscoveryStatsForPlayer(db, player.player_id),
        ]);

        return {
          correct: true as const,
          alreadySolved: false,
          pointsAwarded: awarded,
          newPoints: currentPoints + awarded,
          newlyUnlockedTrophies,
          discoveryStats,
        };
      }),

    useHint: protectedProcedure
      .input(
        z.object({
          playerId: z.string().min(1).max(64),
          hintType: z.enum(["anno_ruolo", "nazionalita_presenze", "iniziali"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const player = getPlayerById(input.playerId);
        if (!player) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Giocatore non trovato.",
          });
        }

        const existing = await db
          .select()
          .from(figutriviaProgress)
          .where(
            and(
              eq(figutriviaProgress.userId, ctx.user.id),
              eq(figutriviaProgress.playerId, player.player_id)
            )
          )
          .limit(1);

        const currentHints: string[] = existing[0]?.hintsUsed
          ? JSON.parse(existing[0].hintsUsed)
          : [];
        if (currentHints.includes(input.hintType)) {
          const pts = await db
            .select()
            .from(figutriviaPoints)
            .where(eq(figutriviaPoints.userId, ctx.user.id))
            .limit(1);
          return {
            success: true,
            newPoints: pts[0]?.points ?? 0,
            hintsUsed: currentHints,
          };
        }

        const cost = HINT_COSTS[input.hintType];
        const ptsRows = await db
          .select()
          .from(figutriviaPoints)
          .where(eq(figutriviaPoints.userId, ctx.user.id))
          .limit(1);
        const currentPoints = ptsRows[0]?.points ?? 0;

        if (currentPoints < cost) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Punti indizio insufficienti (servono ${cost} pt).`,
          });
        }

        const nextPoints = currentPoints - cost;
        await db
          .update(figutriviaPoints)
          .set({ points: nextPoints })
          .where(eq(figutriviaPoints.userId, ctx.user.id));

        const nextHints = [...currentHints, input.hintType];
        if (existing.length > 0) {
          await db
            .update(figutriviaProgress)
            .set({ hintsUsed: JSON.stringify(nextHints) })
            .where(eq(figutriviaProgress.id, existing[0].id));
        } else {
          await db.insert(figutriviaProgress).values({
            userId: ctx.user.id,
            playerId: player.player_id,
            solved: 0,
            hintsUsed: JSON.stringify(nextHints),
          });
        }

        return {
          success: true,
          newPoints: nextPoints,
          hintsUsed: nextHints,
        };
      }),

    reportError: protectedProcedure
      .input(
        z.object({
          playerId: z.string().min(1).max(64),
          description: z.string().trim().min(3).max(2000),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const player = getPlayerById(input.playerId);
        if (!player) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Giocatore non trovato.",
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
              auth: { user: smtpUser, pass: smtpPass },
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
                input.description,
              ].join("\n"),
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
          emailSent: emailSent ? 1 : 0,
        });

        return {
          success: true,
          emailSent,
          recipient: ENV.errorReportEmail,
        };
      }),
  }),

  mancolista: router({
    toggle: protectedProcedure
      .input(z.object({ playerId: z.string().min(1).max(64) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const player = getPlayerById(input.playerId);
        if (!player) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Giocatore non trovato.",
          });
        }

        const existing = await db
          .select()
          .from(figutriviaMancolista)
          .where(
            and(
              eq(figutriviaMancolista.userId, ctx.user.id),
              eq(figutriviaMancolista.playerId, player.player_id)
            )
          )
          .limit(1);

        if (existing.length > 0) {
          await db
            .delete(figutriviaMancolista)
            .where(eq(figutriviaMancolista.id, existing[0].id));
          return { inMancolista: false };
        }

        const solvedRow = await db
          .select({ id: figutriviaProgress.id })
          .from(figutriviaProgress)
          .where(
            and(
              eq(figutriviaProgress.userId, ctx.user.id),
              eq(figutriviaProgress.playerId, player.player_id),
              eq(figutriviaProgress.solved, 1)
            )
          )
          .limit(1);
        if (solvedRow.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Hai già sbloccato questa figurina.",
          });
        }

        const currentManco = await db
          .select({ cnt: sql<number>`COUNT(*)` })
          .from(figutriviaMancolista)
          .where(eq(figutriviaMancolista.userId, ctx.user.id));
        const count = Number(currentManco[0]?.cnt ?? 0);

        if (count >= MAX_MANCOLISTA_SIZE) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `La tua Mancolista ha già raggiunto il massimo di ${MAX_MANCOLISTA_SIZE} giocatori.`,
          });
        }

        await db.insert(figutriviaMancolista).values({
          userId: ctx.user.id,
          playerId: player.player_id,
        });

        return { inMancolista: true };
      }),

    listAll: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const today = getRomeDateString();
      const [usersRows, mancoRows, solvedCountsRows, giftsTodayRows] =
        await Promise.all([
          db
            .select({
              id: figutriviaUsers.id,
              username: figutriviaUsers.username,
            })
            .from(figutriviaUsers),
          db
            .select()
            .from(figutriviaMancolista)
            .orderBy(desc(figutriviaMancolista.createdAt)),
          db
            .select({
              userId: figutriviaProgress.userId,
              cnt: sql<number>`COUNT(*)`,
            })
            .from(figutriviaProgress)
            .where(eq(figutriviaProgress.solved, 1))
            .groupBy(figutriviaProgress.userId),
          db
            .select({ cnt: sql<number>`COUNT(*)` })
            .from(figutriviaMancolistaGifts)
            .where(
              and(
                eq(figutriviaMancolistaGifts.senderUserId, ctx.user.id),
                eq(figutriviaMancolistaGifts.giftDate, today)
              )
            ),
        ]);

      const solvedCountByUser = new Map(
        solvedCountsRows.map((r) => [r.userId, Number(r.cnt)])
      );
      const itemsByUser = new Map<
        number,
        Array<{ playerId: string; createdAt: Date }>
      >();
      for (const m of mancoRows) {
        const list = itemsByUser.get(m.userId) ?? [];
        list.push({ playerId: m.playerId, createdAt: m.createdAt });
        itemsByUser.set(m.userId, list);
      }

      const lists = usersRows
        .map((u) => ({
          userId: u.id,
          username: u.username,
          isSelf: u.id === ctx.user.id,
          solvedCount: solvedCountByUser.get(u.id) ?? 0,
          items: itemsByUser.get(u.id) ?? [],
        }))
        .filter((u) => u.isSelf || u.items.length > 0)
        .sort((a, b) => {
          if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
          return b.items.length - a.items.length;
        });

      const dailyGiftsUsed = Number(giftsTodayRows[0]?.cnt ?? 0);
      return {
        lists,
        dailyGiftsUsed,
        dailyGiftsRemaining: Math.max(0, MAX_DAILY_GIFTS - dailyGiftsUsed),
      };
    }),

    giftSticker: protectedProcedure
      .input(
        z.object({
          recipientUserId: z.number().int().positive(),
          playerId: z.string().min(1).max(64),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        if (input.recipientUserId === ctx.user.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Non puoi sbloccare figurine nella tua stessa mancolista.",
          });
        }

        const player = getPlayerById(input.playerId);
        if (!player) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Giocatore non trovato.",
          });
        }

        // Il mittente deve aver già trovato il giocatore
        const senderSolved = await db
          .select({ id: figutriviaProgress.id })
          .from(figutriviaProgress)
          .where(
            and(
              eq(figutriviaProgress.userId, ctx.user.id),
              eq(figutriviaProgress.playerId, player.player_id),
              eq(figutriviaProgress.solved, 1)
            )
          )
          .limit(1);
        if (senderSolved.length === 0) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Puoi regalare/sbloccare solo giocatori che hai già trovato nel tuo album.",
          });
        }

        const today = getRomeDateString();
        const giftsTodayRows = await db
          .select({ cnt: sql<number>`COUNT(*)` })
          .from(figutriviaMancolistaGifts)
          .where(
            and(
              eq(figutriviaMancolistaGifts.senderUserId, ctx.user.id),
              eq(figutriviaMancolistaGifts.giftDate, today)
            )
          );
        const dailyGiftsUsed = Number(giftsTodayRows[0]?.cnt ?? 0);
        if (dailyGiftsUsed >= MAX_DAILY_GIFTS) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Hai già raggiunto il limite di ${MAX_DAILY_GIFTS} figurine regalate oggi.`,
          });
        }

        // Verifica che sia presente nella mancolista del destinatario
        const mancoEntry = await db
          .select()
          .from(figutriviaMancolista)
          .where(
            and(
              eq(figutriviaMancolista.userId, input.recipientUserId),
              eq(figutriviaMancolista.playerId, player.player_id)
            )
          )
          .limit(1);
        if (mancoEntry.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "Questa figurina non è più presente nella mancolista dell'utente.",
          });
        }

        // Verifica che il destinatario non l'abbia già risolta
        const recExisting = await db
          .select()
          .from(figutriviaProgress)
          .where(
            and(
              eq(figutriviaProgress.userId, input.recipientUserId),
              eq(figutriviaProgress.playerId, player.player_id)
            )
          )
          .limit(1);
        if (recExisting.length > 0 && recExisting[0].solved === 1) {
          await db
            .delete(figutriviaMancolista)
            .where(eq(figutriviaMancolista.id, mancoEntry[0].id));
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "L'utente ha già sbloccato questo giocatore.",
          });
        }

        if (recExisting.length > 0) {
          await db
            .update(figutriviaProgress)
            .set({
              solved: 1,
              unlockedByUserId: ctx.user.id,
              solvedAt: new Date(),
            })
            .where(eq(figutriviaProgress.id, recExisting[0].id));
        } else {
          await db.insert(figutriviaProgress).values({
            userId: input.recipientUserId,
            playerId: player.player_id,
            solved: 1,
            hintsUsed: JSON.stringify([]),
            pointsAwarded: 0,
            unlockedByUserId: ctx.user.id,
            solvedAt: new Date(),
          });
        }

        await Promise.all([
          db
            .delete(figutriviaMancolista)
            .where(eq(figutriviaMancolista.id, mancoEntry[0].id)),
          db.insert(figutriviaMancolistaGifts).values({
            senderUserId: ctx.user.id,
            recipientUserId: input.recipientUserId,
            playerId: player.player_id,
            giftDate: today,
          }),
        ]);

        await evaluateAndUnlockTrophies(db, input.recipientUserId);

        const nextUsed = dailyGiftsUsed + 1;
        return {
          success: true,
          dailyGiftsUsed: nextUsed,
          dailyGiftsRemaining: Math.max(0, MAX_DAILY_GIFTS - nextUsed),
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
