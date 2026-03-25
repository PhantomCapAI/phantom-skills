import { Router } from "express";
import prisma from "../../lib/prisma.js";

const router = Router();

// GET /skills — browse all published skills
router.get("/skills", async (req, res) => {
  try {
    const { search, minPrice, maxPrice, sort, verified } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ];
    }
    if (verified === "true") where.verified = true;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = Number(minPrice);
      if (maxPrice) where.price.lte = Number(maxPrice);
    }

    let orderBy = { createdAt: "desc" };
    if (sort === "installs") orderBy = { installs: "desc" };
    if (sort === "price") orderBy = { price: "asc" };
    if (sort === "stars") orderBy = { stars: "desc" };
    if (sort === "revenue") orderBy = { revenue: "desc" };

    const skills = await prisma.skill.findMany({
      where,
      orderBy,
      take: 50,
      select: {
        slug: true,
        name: true,
        description: true,
        price: true,
        verified: true,
        installs: true,
        stars: true,
        createdAt: true,
        creator: { select: { name: true, email: true } },
      },
    });

    return res.json({ skills, count: skills.length });
  } catch (err) {
    console.error("list skills error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /skills/:slug — single skill detail
router.get("/skills/:slug", async (req, res) => {
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
        _count: { select: { purchases: true } },
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
      verifiedAt: skill.verifiedAt,
      installs: skill.installs,
      stars: skill.stars,
      revenue: skill.revenue,
      creator: skill.creator,
      versions: skill.versions,
      purchases: skill._count.purchases,
      createdAt: skill.createdAt,
      checkoutUrl: skill.price ? `/skills/${skill.slug}/checkout` : null,
    });
  } catch (err) {
    console.error("get skill error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
