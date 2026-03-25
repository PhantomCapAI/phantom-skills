import { Router } from "express";
import prisma from "../../lib/prisma.js";
import stripe from "../../lib/stripe.js";
import { sendMail } from "../../lib/mail.js";

const router = Router();

// GET /skills/:slug/success
router.get("/skills/:slug/success", async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ error: "Missing session_id" });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid") {
      return res.status(402).json({ error: "Payment not completed" });
    }

    const skill = await prisma.skill.findUnique({
      where: { slug: req.params.slug },
    });
    if (!skill) return res.status(404).json({ error: "Skill not found" });

    const existing = await prisma.purchase.findUnique({
      where: { stripeSessionId: session.id },
    });

    if (!existing) {
      await prisma.purchase.create({
        data: {
          skillId: skill.id,
          userEmail: session.customer_email || session.metadata.buyerEmail,
          price: skill.price,
          stripeSessionId: session.id,
          stripePaymentIntent: session.payment_intent,
          buyerId: session.metadata.buyerId || null,
          amountPaid: session.amount_total,
          currency: session.currency || "usd",
          status: "completed",
          referredBy: session.metadata.referralCode || null,
        },
      });

      await prisma.skill.update({
        where: { id: skill.id },
        data: {
          installs: { increment: 1 },
          revenue: { increment: session.amount_total / 100 },
        },
      });

      if (session.metadata.referralCode) {
        const referralBonus = Math.round(session.amount_total * 0.02);
        await prisma.user.updateMany({
          where: { referralCode: session.metadata.referralCode },
          data: { referralBalance: { increment: referralBonus } },
        });
      }

      try {
        await sendMail({
          to: session.customer_email || session.metadata.buyerEmail,
          subject: `Purchase confirmed: ${skill.name}`,
          html: `<p>Thanks for purchasing <strong>${skill.name}</strong>! You can now install it from the marketplace.</p>`,
        });
      } catch (mailErr) {
        console.error("Failed to send purchase email:", mailErr);
      }
    }

    return res.json({
      ok: true,
      skill: { slug: skill.slug, name: skill.name },
      amountPaid: session.amount_total,
    });
  } catch (err) {
    console.error("success error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
