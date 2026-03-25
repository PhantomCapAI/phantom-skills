import { Router } from "express";
import crypto from "crypto";
import prisma from "../../../lib/prisma.js";
import stripe from "../../../lib/stripe.js";
import { authenticate } from "../../../lib/auth.js";

const router = Router();

const PLATFORM_CUT_RATE = 0.5;
const MAX_ATTEMPTS = 3;

// POST /creator/payout/execute
router.post("/creator/payout/execute", authenticate, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    const creator = await prisma.user.findUnique({
      where: { id: req.userId },
    });
    if (!creator) return res.status(404).json({ error: "User not found" });
    if (!creator.stripeConnectId) {
      return res
        .status(400)
        .json({ error: "No Stripe Connect account linked" });
    }

    const purchases = await prisma.purchase.findMany({
      where: {
        skill: { creatorId: req.userId },
        status: "completed",
        createdAt: { gte: start, lte: end },
      },
    });

    const totalRevenue = purchases.reduce((sum, p) => sum + p.amountPaid, 0);
    if (totalRevenue === 0) {
      return res.status(400).json({ error: "No revenue in this period" });
    }

    const platformCut = Math.round(totalRevenue * PLATFORM_CUT_RATE);
    const creatorAmount = totalRevenue - platformCut;

    const idempotencyKey = crypto
      .createHash("sha256")
      .update(`${req.userId}:${start.toISOString()}:${end.toISOString()}`)
      .digest("hex");

    const existing = await prisma.payout.findUnique({
      where: { idempotencyKey },
    });
    if (existing && existing.status === "succeeded") {
      return res.json({ ok: true, payout: existing, duplicate: true });
    }

    const payout = existing
      ? await prisma.payout.update({
          where: { id: existing.id },
          data: { attempts: { increment: 1 }, status: "pending" },
        })
      : await prisma.payout.create({
          data: {
            creatorId: req.userId,
            startDate: start,
            endDate: end,
            totalRevenue,
            platformCut,
            creatorAmount,
            idempotencyKey,
            status: "pending",
            attempts: 1,
          },
        });

    try {
      const transfer = await stripe.transfers.create(
        {
          amount: creatorAmount,
          currency: "usd",
          destination: creator.stripeConnectId,
          metadata: { payoutId: payout.id },
        },
        { idempotencyKey }
      );

      const updated = await prisma.payout.update({
        where: { id: payout.id },
        data: { stripeTransferId: transfer.id, status: "succeeded" },
      });

      return res.json({ ok: true, payout: updated });
    } catch (stripeErr) {
      const attempts = payout.attempts;
      const status =
        attempts >= MAX_ATTEMPTS ? "permanently_failed" : "retrying";

      const updated = await prisma.payout.update({
        where: { id: payout.id },
        data: {
          status,
          failureReason: stripeErr.type || "stripe_error",
          errorMessage: stripeErr.message,
        },
      });

      return res.status(502).json({
        ok: false,
        payout: updated,
        error: "Transfer failed",
      });
    }
  } catch (err) {
    console.error("payout execute error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
