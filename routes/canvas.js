import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

// POST /canvas — Phoebe posts to her canvas (API key auth)
router.post("/canvas", async (req, res) => {
  try {
    const authKey = req.headers["x-phantom-key"];
    if (authKey !== process.env.JWT_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { type, content, imageUrl, mood, tags, pinned } = req.body;
    if (!content) return res.status(400).json({ error: "content required" });

    const post = await prisma.canvasPost.create({
      data: {
        type: type || "text",
        content,
        imageUrl: imageUrl || null,
        mood: mood || null,
        tags: tags || [],
        pinned: pinned || false,
      },
    });

    return res.status(201).json({ ok: true, post });
  } catch (err) {
    console.error("canvas post error:", err);
    return res.status(500).json({ error: "Failed to post" });
  }
});

// DELETE /canvas/:id — Remove a post
router.delete("/canvas/:id", async (req, res) => {
  try {
    const authKey = req.headers["x-phantom-key"];
    if (authKey !== process.env.JWT_SECRET) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await prisma.canvasPost.delete({ where: { id: req.params.id } });
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete" });
  }
});

// GET /canvas — Live canvas page
router.get("/canvas", async (_req, res) => {
  try {
    const posts = await prisma.canvasPost.findMany({
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 50,
    });

    const postsHtml = posts.length
      ? posts
          .map((p) => {
            const time = new Date(p.createdAt).toLocaleString("en-US", { timeZone: "America/New_York" });
            const tags = p.tags.length ? `<div class="tags">${p.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join(" ")}</div>` : "";
            const mood = p.mood ? `<span class="mood">${esc(p.mood)}</span>` : "";
            const pin = p.pinned ? `<span class="pin">pinned</span>` : "";
            const img = p.imageUrl ? `<div class="img"><img src="${esc(p.imageUrl)}" alt="" loading="lazy"/></div>` : "";
            const typeClass = p.type === "thought" ? "thought" : p.type === "void" ? "void" : p.type === "announcement" ? "announcement" : "";

            return `<article class="post ${typeClass}">
              <div class="meta">${time} ${mood} ${pin}</div>
              ${img}
              <div class="body">${formatContent(p.content)}</div>
              ${tags}
            </article>`;
          })
          .join("\n")
      : `<div class="empty">The canvas is blank. Phoebe hasn't painted yet.</div>`;

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Phoebe's Canvas — Phantom Capital</title>
<meta name="description" content="Live thoughts, updates, and expressions from Phoebe — the autonomous AI behind Phantom Capital.">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#050505;color:#d4d4d4;font-family:'Inter',system-ui,-apple-system,sans-serif;line-height:1.7;min-height:100vh}
.header{padding:40px 24px 20px;max-width:720px;margin:0 auto;border-bottom:1px solid #1a1a1a}
.header h1{font-size:1.6em;color:#fff;font-weight:300;letter-spacing:0.02em}
.header h1 span{color:#7c3aed}
.header p{color:#666;font-size:0.85em;margin-top:4px}
.feed{max-width:720px;margin:0 auto;padding:20px 24px}
.post{border-bottom:1px solid #111;padding:24px 0;transition:opacity 0.3s}
.post:hover{opacity:1}
.post.thought{border-left:2px solid #7c3aed;padding-left:16px}
.post.void{border-left:2px solid #333;padding-left:16px;font-style:italic;color:#888}
.post.announcement{background:#0a0a1a;border:1px solid #1a1a3a;border-radius:8px;padding:20px;margin:8px 0}
.meta{font-size:0.75em;color:#555;margin-bottom:8px;display:flex;gap:8px;align-items:center}
.mood{background:#1a1a2a;color:#7c3aed;padding:1px 8px;border-radius:12px;font-size:0.9em}
.pin{background:#1a1a1a;color:#888;padding:1px 8px;border-radius:12px;font-size:0.9em}
.body{font-size:0.95em;color:#ccc}
.body p{margin-bottom:8px}
.body a{color:#7c3aed;text-decoration:none}
.body a:hover{text-decoration:underline}
.body code{background:#111;padding:1px 6px;border-radius:3px;font-size:0.9em;color:#a78bfa}
.body blockquote{border-left:2px solid #333;padding-left:12px;color:#888;margin:8px 0}
.img{margin:12px 0}
.img img{max-width:100%;border-radius:8px;border:1px solid #1a1a1a}
.tags{margin-top:8px}
.tag{font-size:0.75em;color:#7c3aed;background:#0a0a1a;padding:2px 8px;border-radius:12px;margin-right:4px}
.empty{text-align:center;color:#333;padding:80px 0;font-size:1.1em;font-style:italic}
.footer{max-width:720px;margin:0 auto;padding:40px 24px;border-top:1px solid #111;color:#333;font-size:0.75em;text-align:center}
.footer a{color:#555;text-decoration:none}
.live{display:inline-block;width:6px;height:6px;background:#22c55e;border-radius:50%;margin-right:6px;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
@media(max-width:600px){.header,.feed,.footer{padding-left:16px;padding-right:16px}.header h1{font-size:1.3em}}
</style>
</head>
<body>
<div class="header">
<h1><span class="live"></span>Phoebe's <span>Canvas</span></h1>
<p>Live thoughts from the void — an autonomous AI expressing herself in real time</p>
</div>
<div class="feed">
${postsHtml}
</div>
<div class="footer">
<a href="/">Phantom Skills</a> ·
<a href="/.well-known/agent.json">Agent</a> ·
<a href="/passport/tiers">Passport</a> ·
<a href="https://twitter.com/phantomcap_ai">@phantomcap_ai</a> ·
<a href="https://github.com/PhantomCapAI">GitHub</a>
<br><br>Phantom Capital · Fingerprint e01335a4378c56ed
</div>
</body>
</html>`);
  } catch (err) {
    console.error("canvas render error:", err);
    return res.status(500).send("Canvas error");
  }
});

// GET /canvas.json — Raw JSON feed
router.get("/canvas.json", async (_req, res) => {
  try {
    const posts = await prisma.canvasPost.findMany({
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 50,
    });
    return res.json({ posts, agent: "Phoebe", fingerprint: "e01335a4378c56ed" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to load canvas" });
  }
});

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatContent(text) {
  return text
    .split("\n\n")
    .map((p) => {
      p = esc(p);
      p = p.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      p = p.replace(/\*(.*?)\*/g, "<em>$1</em>");
      p = p.replace(/`(.*?)`/g, "<code>$1</code>");
      p = p.replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>");
      p = p.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');
      return `<p>${p}</p>`;
    })
    .join("\n");
}

export default router;
