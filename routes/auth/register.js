import { Router } from "express";
import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma.js";
import crypto from "crypto";

const router = Router();

// POST /auth/register — create account
router.post("/auth/register", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) return res.status(400).json({ error: "email is required" });

    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Existing user — issue token (simple email-based auth)
      const token = jwt.sign({ sub: user.id, email }, process.env.JWT_SECRET, {
        expiresIn: "30d",
      });
      return res.json({ ok: true, token, user: { id: user.id, email: user.email, name: user.name }, existing: true });
    }

    const referralCode = crypto.randomBytes(6).toString("hex");

    user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        referralCode,
      },
    });

    const token = jwt.sign({ sub: user.id, email }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    return res.status(201).json({
      ok: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, referralCode },
    });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /auth/me — get current user
router.get("/auth/me", async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        referralCode: true,
        referralBalance: true,
        stripeConnectId: true,
        _count: { select: { skills: true, purchases: true } },
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(user);
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
