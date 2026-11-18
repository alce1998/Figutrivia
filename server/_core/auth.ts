import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { createSessionToken } from "./sdk";

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,24}$/;

export function registerAuthRoutes(app: Express) {
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const username = String(req.body?.username || "").trim();
      const email = String(req.body?.email || "").trim().toLowerCase();
      const password = String(req.body?.password || "");

      if (!USERNAME_RE.test(username)) {
        res.status(400).json({
          error:
            "Username non valido (3-24 caratteri: lettere, numeri, . _ -).",
        });
        return;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: "Inserisci un indirizzo email valido." });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({
          error: "La password deve contenere almeno 6 caratteri.",
        });
        return;
      }

      const [existingEmail, existingUsername] = await Promise.all([
        db.getUserByEmail(email),
        db.getUserByUsername(username),
      ]);
      if (existingEmail) {
        res
          .status(409)
          .json({ error: "Esiste già un account con questa email." });
        return;
      }
      if (existingUsername) {
        res.status(409).json({ error: "Questo username è già occupato." });
        return;
      }

      const openId = `figu_${crypto.randomUUID().replace(/-/g, "")}`;
      const passwordHash = db.hashPassword(password);
      const user = await db.createFiguUser({
        openId,
        username,
        email,
        passwordHash,
        loginMethod: "email",
        role: "user",
        lastSignedIn: new Date(),
      });

      const token = await createSessionToken(user.openId, user.username);
      res.cookie(COOKIE_NAME, token, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS,
      });

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("[Auth] Register error:", error);
      res.status(500).json({ error: "Errore durante la registrazione." });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const identifier = String(req.body?.identifier || "").trim();
      const password = String(req.body?.password || "");

      if (!identifier || !password) {
        res
          .status(400)
          .json({ error: "Inserisci email/username e password." });
        return;
      }

      const user = identifier.includes("@")
        ? await db.getUserByEmail(identifier.toLowerCase())
        : await db.getUserByUsername(identifier);

      if (
        !user ||
        !user.passwordHash ||
        !db.verifyPassword(password, user.passwordHash)
      ) {
        res.status(401).json({ error: "Credenziali non valide." });
        return;
      }

      await db.touchUserSignIn(user.openId);
      const token = await createSessionToken(user.openId, user.username);
      res.cookie(COOKIE_NAME, token, {
        ...getSessionCookieOptions(req),
        maxAge: ONE_YEAR_MS,
      });

      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("[Auth] Login error:", error);
      res.status(500).json({ error: "Errore durante l'accesso." });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME, {
      ...getSessionCookieOptions(req),
      maxAge: -1,
    });
    res.json({ success: true });
  });
}
