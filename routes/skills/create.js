import { Router } from "express";
import prisma from "../../lib/prisma.js";
import { authenticate } from "../../lib/auth.js";

const router = Router();

// POST /skills — create a new skill
router.post("/skills", authenticate, async (req, res) => {
  try {
    const { slug, name, description, price, tag, changelog, files } = req.body;

    if (!slug || !name || !description) {
      return res.status(400).json({ error: "slug, name, and description are required" });
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: "slug must be lowercase alphanumeric with hyphens" });
    }

    const existing = await prisma.skill.findUnique({ where: { slug } });
    if (existing) {
      return res.status(409).json({ error: "Skill with this slug already exists" });
    }

    const skill = await prisma.skill.create({
      data: {
        slug,
        name,
        description,
        price: price ? Number(price) : null,
        creatorId: req.userId,
        versions: {
          create: {
            tag: tag || "1.0.0",
            changelog: changelog || "Initial release",
            files: files || null,
          },
        },
      },
      include: {
        versions: true,
        creator: { select: { name: true, email: true } },
      },
    });

    return res.status(201).json({ ok: true, skill });
  } catch (err) {
    console.error("create skill error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /skills/:slug — update a skill
router.put("/skills/:slug", authenticate, async (req, res) => {
  try {
    const skill = await prisma.skill.findUnique({
      where: { slug: req.params.slug },
    });
    if (!skill) return res.status(404).json({ error: "Skill not found" });
    if (skill.creatorId !== req.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { name, description, price } = req.body;
    const updated = await prisma.skill.update({
      where: { slug: req.params.slug },
      data: {
        ...(name && { name }),
        ...(description && { description }),
        ...(price !== undefined && { price: price ? Number(price) : null }),
      },
    });

    return res.json({ ok: true, skill: updated });
  } catch (err) {
    console.error("update skill error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /skills/:slug/versions — publish new version
router.post("/skills/:slug/versions", authenticate, async (req, res) => {
  try {
    const skill = await prisma.skill.findUnique({
      where: { slug: req.params.slug },
    });
    if (!skill) return res.status(404).json({ error: "Skill not found" });
    if (skill.creatorId !== req.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { tag, changelog, files } = req.body;
    if (!tag) return res.status(400).json({ error: "tag is required" });

    const version = await prisma.version.create({
      data: {
        skillId: skill.id,
        tag,
        changelog: changelog || null,
        files: files || null,
      },
    });

    return res.status(201).json({ ok: true, version });
  } catch (err) {
    console.error("create version error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
