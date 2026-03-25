import { Router } from "express";
import prisma from "../../../lib/prisma.js";
import { authenticate } from "../../../lib/auth.js";

const router = Router();

const PLATFORM_CUT_RATE = 0.5;

// POST /creator/payout/calculate
router.post("/creator/payout/calculate", authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const purchases = await prisma.purchase.findMany({
      where: {
        skill: { creatorId: req.userId },
        status: "completed",
        createdAt: { gte: start, lte: end },
      },
    });

    const totalRevenue = purchases.reduce((sum, p) => sum + p.amountPaid, 0);
    const platformCut = Math.round(totalRevenue * PLATFORM_CUT_RATE);
    const creatorAmount = totalRevenue - platformCut;

    return res.json({
      creatorId: req.userId,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      purchaseCount: purchases.length,
      totalRevenue,
      platformCut,
      creatorAmount,
      currency: "usd",
    });
  } catch (err) {
    console.error("payout calculate error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
