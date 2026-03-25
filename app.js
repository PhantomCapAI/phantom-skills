import express from "express";
import cron from "node-cron";
import { retryFailedPayouts } from "./jobs/retryFailedPayouts.js";

import listRoutes from "./routes/skills/list.js";
import createRoutes from "./routes/skills/create.js";
import verifyResultRoutes from "./routes/skills/verifyResult.js";
import checkoutRoutes from "./routes/skills/checkout.js";
import successRoutes from "./routes/skills/success.js";
import leaderboardRoutes from "./routes/skills/leaderboard.js";
import authRoutes from "./routes/auth/register.js";
import payoutCalculateRoutes from "./routes/creator/payout/calculate.js";
import payoutExecuteRoutes from "./routes/creator/payout/execute.js";
import stripeWebhookRoutes from "./routes/webhooks/stripe.js";

const app = express();

// Raw body for webhook signature verification (must come before json parser)
app.use((req, res, next) => {
  if (
    req.path === "/webhooks/stripe" ||
    req.path.endsWith("/verify-result")
  ) {
    express.raw({ type: "application/json" })(req, res, (err) => {
      if (err) return next(err);
      req.rawBody = req.body;
      req.body = JSON.parse(req.body);
      next();
    });
  } else {
    express.json()(req, res, next);
  }
});

// Routes
app.use(listRoutes);
app.use(createRoutes);
app.use(verifyResultRoutes);
app.use(checkoutRoutes);
app.use(successRoutes);
app.use(leaderboardRoutes);
app.use(authRoutes);
app.use(payoutCalculateRoutes);
app.use(payoutExecuteRoutes);
app.use(stripeWebhookRoutes);

// Health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// Hourly cron: retry failed payouts
const payoutCron = process.env.PAYOUT_RETRY_CRON || "0 * * * *";
cron.schedule(payoutCron, () => {
  retryFailedPayouts().catch((err) =>
    console.error("[cron] retryFailedPayouts error:", err)
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`phantom-skills API running on port ${PORT}`);
});

export default app;
