import prisma from "../lib/prisma.js";
import stripe from "../lib/stripe.js";

const MAX_ATTEMPTS = 3;

export async function retryFailedPayouts() {
  console.log("[cron] Retrying failed payouts...");

  const payouts = await prisma.payout.findMany({
    where: {
      status: { in: ["failed", "retrying"] },
      attempts: { lt: MAX_ATTEMPTS },
    },
    include: { creator: true },
  });

  for (const payout of payouts) {
    if (!payout.creator.stripeConnectId) {
      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: "permanently_failed",
          failureReason: "no_stripe_connect",
          errorMessage: "Creator has no Stripe Connect account",
        },
      });
      continue;
    }

    try {
      const transfer = await stripe.transfers.create(
        {
          amount: payout.creatorAmount,
          currency: "usd",
          destination: payout.creator.stripeConnectId,
          metadata: { payoutId: payout.id },
        },
        { idempotencyKey: `${payout.idempotencyKey}-retry-${payout.attempts}` }
      );

      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: "succeeded",
          stripeTransferId: transfer.id,
          attempts: { increment: 1 },
        },
      });

      console.log(`[cron] Payout ${payout.id} succeeded on retry`);
    } catch (err) {
      const newAttempts = payout.attempts + 1;
      const status =
        newAttempts >= MAX_ATTEMPTS ? "permanently_failed" : "retrying";

      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          status,
          attempts: newAttempts,
          failureReason: err.type || "stripe_error",
          errorMessage: err.message,
        },
      });

      console.error(`[cron] Payout ${payout.id} retry failed:`, err.message);
    }
  }

  console.log(`[cron] Processed ${payouts.length} payouts`);
}
