import { Router } from "express";
import prisma from "../../lib/prisma.js";

const router = Router();

// Gate: x402 payment must have been verified by middleware
// If middleware didn't run (facilitator down), check for payment header
function requirePayment(req, res, next) {
  // x402 middleware sets this when payment is verified
  if (req.x402?.paid) return next();
  // Check if payment header was provided (even if middleware didn't verify)
  const paymentHeader = req.headers["payment-signature"];
  if (paymentHeader) return next();
  // No payment — return 402 with instructions
  return res.status(402).json({
    error: "Payment required",
    protocol: "x402",
    description: "This endpoint requires USDC micropayment via x402 protocol",
    agent: "https://phantomskills.zeabur.app/.well-known/agent.json",
    docs: "https://x402.org",
  });
}

// x402 paid endpoints — require payment or return 402

// GET /x402/skills — browse (0.1¢ per request)
router.get("/x402/skills", requirePayment, async (req, res) => {
  try {
    const { search, sort, verified } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }
    if (verified === "true") where.verified = true;

    const skills = await prisma.skill.findMany({
      where,
      orderBy: sort === "installs" ? { installs: "desc" } : { createdAt: "desc" },
      take: 50,
      select: {
        slug: true,
        name: true,
        description: true,
        price: true,
        verified: true,
        installs: true,
        stars: true,
        creator: { select: { name: true } },
      },
    });

    return res.json({ skills, count: skills.length, payment: "x402" });
  } catch (err) {
    console.error("x402 list error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /x402/skills/:slug — detail (0.5¢ per request)
router.get("/x402/skills/:slug", requirePayment, async (req, res) => {
  try {
    const skill = await prisma.skill.findUnique({
      where: { slug: req.params.slug },
      include: {
        creator: { select: { name: true, email: true } },
        versions: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { tag: true, changelog: true, createdAt: true },
        },
      },
    });

    if (!skill) return res.status(404).json({ error: "Skill not found" });

    return res.json({
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      price: skill.price,
      priceDisplay: skill.price ? `$${(skill.price / 100).toFixed(2)}` : "Free",
      verified: skill.verified,
      installs: skill.installs,
      stars: skill.stars,
      creator: skill.creator,
      versions: skill.versions,
      payment: "x402",
    });
  } catch (err) {
    console.error("x402 detail error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /x402/skills/:slug/download — download skill files (5¢ per download)
router.get("/x402/skills/:slug/download", requirePayment, async (req, res) => {
  try {
    const skill = await prisma.skill.findUnique({
      where: { slug: req.params.slug },
      include: {
        versions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { tag: true, changelog: true, files: true, createdAt: true },
        },
      },
    });

    if (!skill) return res.status(404).json({ error: "Skill not found" });

    // Increment install count
    await prisma.skill.update({
      where: { id: skill.id },
      data: { installs: { increment: 1 } },
    });

    const latestVersion = skill.versions[0];

    return res.json({
      slug: skill.slug,
      name: skill.name,
      version: latestVersion?.tag || "1.0.0",
      files: latestVersion?.files || null,
      installCommand: `# Add to your OpenClaw skills directory\n# Skill: ${skill.name} v${latestVersion?.tag || "1.0.0"}`,
      payment: "x402",
    });
  } catch (err) {
    console.error("x402 download error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /x402/leaderboard — top skills (0.1¢ per request)
router.get("/x402/leaderboard", requirePayment, async (req, res) => {
  try {
    const skills = await prisma.skill.findMany({
      where: { verified: true },
      orderBy: { installs: "desc" },
      take: 10,
      select: {
        slug: true,
        name: true,
        installs: true,
        stars: true,
        revenue: true,
        creator: { select: { name: true } },
      },
    });

    return res.json({ skills, payment: "x402" });
  } catch (err) {
    console.error("x402 leaderboard error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
