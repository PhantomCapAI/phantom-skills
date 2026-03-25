import jwt from "jsonwebtoken";
import prisma from "./prisma.js";

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid token" });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export async function requireCreatorOf(req, res, next) {
  const skill = await prisma.skill.findUnique({
    where: { slug: req.params.slug },
    select: { creatorId: true },
  });
  if (!skill) return res.status(404).json({ error: "Skill not found" });
  if (skill.creatorId !== req.userId) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}
