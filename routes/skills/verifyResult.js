import { Router } from "express";
import crypto from "crypto";
import prisma from "../../lib/prisma.js";

const router = Router();

function verifyGithubSignature(req) {
  const sig = req.headers["x-hub-signature-256"];
  if (!sig) return false;
  const hmac = crypto.createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET);
  hmac.update(req.rawBody);
  const expected = `sha256=${hmac.digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

// POST /skills/:slug/verify-result
router.post("/skills/:slug/verify-result", async (req, res) => {
  try {
    if (!verifyGithubSignature(req)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const { slug } = req.params;
    const payload = req.body;

    const skill = await prisma.skill.findUnique({
      where: { slug },
      include: { versions: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    if (!skill) return res.status(404).json({ error: "Skill not found" });
    if (!skill.versions.length) {
      return res.status(400).json({ error: "No versions found" });
    }

    const latestVersion = skill.versions[0];
    const runId = String(payload.run_id || payload.id);
    const conclusion = payload.conclusion || "unknown";
    const passed = conclusion === "success";
    const status = passed ? "passed" : "failed";

    const result = await prisma.verificationResult.upsert({
      where: { uniqueRunPerSkill: { skillId: skill.id, runId } },
      create: {
        versionId: latestVersion.id,
        skillId: skill.id,
        runId,
        status,
        passed,
        conclusion,
        commitHash: payload.head_sha || null,
        runUrl: payload.html_url || null,
        logsUrl: payload.logs_url || null,
        output: payload.output || null,
        rawPayload: payload,
      },
      update: {
        status,
        passed,
        conclusion,
        output: payload.output || null,
        rawPayload: payload,
      },
    });

    if (passed && !skill.verified) {
      await prisma.skill.update({
        where: { id: skill.id },
        data: { verified: true, verifiedAt: new Date() },
      });
    }

    return res.json({ ok: true, verificationId: result.id, status });
  } catch (err) {
    console.error("verify-result error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
