import { Router } from "express";
import prisma from "../../lib/prisma.js";

const router = Router();

let cache = null;
let cacheTimestamp = 0;

// GET /skills/leaderboard
router.get("/skills/leaderboard", async (_req, res) => {
  try {
    const ttl = Number(process.env.LEADERBOARD_CACHE_TTL_MS) || 60000;
    const now = Date.now();

    if (cache && now - cacheTimestamp < ttl) {
      return res.json(cache);
    }

    const skills = await prisma.skill.findMany({
      where: { verified: true },
      orderBy: { installs: "desc" },
      take: 10,
      select: {
        slug: true,
        name: true,
        description: true,
        installs: true,
        stars: true,
        revenue: true,
        creator: { select: { name: true, email: true } },
        verifiedAt: true,
      },
    });

    cache = { skills, cachedAt: new Date().toISOString() };
    cacheTimestamp = now;

    return res.json(cache);
  } catch (err) {
    console.error("leaderboard error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
