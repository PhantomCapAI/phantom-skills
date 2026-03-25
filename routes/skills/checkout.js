import { Router } from "express";
import prisma from "../../lib/prisma.js";
import stripe from "../../lib/stripe.js";

const router = Router();

// POST /skills/:slug/checkout
router.post("/skills/:slug/checkout", async (req, res) => {
  try {
    const { slug } = req.params;
    const { email, referralCode } = req.body;

    if (!email) return res.status(400).json({ error: "Email is required" });

    const skill = await prisma.skill.findUnique({
      where: { slug },
      include: { creator: true },
    });

    if (!skill) return res.status(404).json({ error: "Skill not found" });
    if (!skill.price) return res.status(400).json({ error: "Skill is free" });

    const metadata = {
      skillId: skill.id,
      skillSlug: skill.slug,
      buyerEmail: email,
      creatorId: skill.creatorId,
    };

    if (referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode },
      });
      if (referrer) metadata.referralCode = referralCode;
    }

    const sessionParams = {
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: skill.price,
            product_data: {
              name: skill.name,
              description: skill.description,
            },
          },
          quantity: 1,
        },
      ],
      metadata,
      success_url: `${process.env.APP_BASE_URL}/skills/${slug}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_BASE_URL}/skills/${slug}`,
    };

    if (skill.creator.stripeConnectId) {
      const platformCut = Math.round(skill.price * 0.5);
      sessionParams.payment_intent_data = {
        application_fee_amount: platformCut,
        transfer_data: { destination: skill.creator.stripeConnectId },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("checkout error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
