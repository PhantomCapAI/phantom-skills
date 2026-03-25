import { Router } from "express";
import Stripe from "stripe";
import prisma from "../../lib/prisma.js";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /webhooks/stripe
router.post("/webhooks/stripe", async (req, res) => {
  let event;
  try {
    const sig = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ error: "Invalid signature" });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.payment_status !== "paid") break;

        const { skillId, buyerEmail, referralCode } = session.metadata;
        if (!skillId) break;

        const existing = await prisma.purchase.findUnique({
          where: { stripeSessionId: session.id },
        });
        if (existing) break;

        const skill = await prisma.skill.findUnique({
          where: { id: skillId },
        });
        if (!skill) break;

        await prisma.purchase.create({
          data: {
            skillId,
            userEmail: session.customer_email || buyerEmail,
            price: skill.price,
            stripeSessionId: session.id,
            stripePaymentIntent: session.payment_intent,
            buyerId: session.metadata.buyerId || null,
            amountPaid: session.amount_total,
            currency: session.currency || "usd",
            status: "completed",
            referredBy: referralCode || null,
          },
        });

        await prisma.skill.update({
          where: { id: skillId },
          data: {
            installs: { increment: 1 },
            revenue: { increment: session.amount_total / 100 },
          },
        });

        if (referralCode) {
          const referralBonus = Math.round(session.amount_total * 0.02);
          await prisma.user.updateMany({
            where: { referralCode },
            data: { referralBalance: { increment: referralBonus } },
          });
        }
        break;
      }

      case "transfer.succeeded": {
        const transfer = event.data.object;
        const payoutId = transfer.metadata?.payoutId;
        if (!payoutId) break;

        await prisma.payout.update({
          where: { id: payoutId },
          data: {
            status: "succeeded",
            stripeTransferId: transfer.id,
          },
        });
        break;
      }

      case "transfer.failed": {
        const transfer = event.data.object;
        const payoutId = transfer.metadata?.payoutId;
        if (!payoutId) break;

        const payout = await prisma.payout.findUnique({
          where: { id: payoutId },
        });
        if (!payout) break;

        const status =
          payout.attempts >= 3 ? "permanently_failed" : "failed";

        await prisma.payout.update({
          where: { id: payoutId },
          data: {
            status,
            failureReason: "transfer_failed",
            errorMessage: transfer.failure_message || null,
          },
        });
        break;
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
