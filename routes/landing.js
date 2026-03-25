import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

router.get("/", async (_req, res) => {
  let skills = [];
  try {
    skills = await prisma.skill.findMany({
      orderBy: { installs: "desc" },
      take: 12,
      select: {
        name: true,
        slug: true,
        description: true,
        price: true,
        installs: true,
        verified: true,
        stars: true,
      },
    });
  } catch (err) {
    console.error("[landing] Failed to fetch skills:", err.message);
  }

  const skillRows = skills
    .map(
      (s) => `
      <div class="skill-card">
        <div class="skill-header">
          <span class="skill-name">${esc(s.name)}</span>
          ${s.verified ? '<span class="badge verified">Verified</span>' : ""}
        </div>
        <p class="skill-desc">${esc(s.description)}</p>
        <div class="skill-meta">
          <span class="price">${s.price != null ? `$${(s.price / 100).toFixed(2)}` : "Free"}</span>
          <span class="installs">${s.installs} installs</span>
          ${s.stars ? `<span class="stars">${s.stars} stars</span>` : ""}
        </div>
      </div>`
    )
    .join("\n");

  res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Phantom Skills — Paid Skill Marketplace for AI Agents</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0a0a0f;
      color: #e0e0e8;
      line-height: 1.6;
      min-height: 100vh;
    }
    a { color: #a78bfa; text-decoration: none; }
    a:hover { text-decoration: underline; color: #c4b5fd; }

    .hero {
      text-align: center;
      padding: 4rem 1.5rem 2.5rem;
      background: linear-gradient(180deg, #13131f 0%, #0a0a0f 100%);
      border-bottom: 1px solid #1e1e2e;
    }
    .hero h1 {
      font-size: 2.4rem;
      font-weight: 700;
      color: #fff;
      letter-spacing: -0.02em;
    }
    .hero h1 span { color: #a78bfa; }
    .hero .tagline {
      font-size: 1.15rem;
      color: #9090a8;
      margin-top: 0.6rem;
      max-width: 560px;
      margin-left: auto;
      margin-right: auto;
    }

    .stats {
      display: flex;
      justify-content: center;
      gap: 2rem;
      flex-wrap: wrap;
      margin-top: 2rem;
    }
    .stat {
      background: #16162a;
      border: 1px solid #252540;
      border-radius: 10px;
      padding: 1rem 1.5rem;
      min-width: 150px;
      text-align: center;
    }
    .stat .num { font-size: 1.5rem; font-weight: 700; color: #a78bfa; }
    .stat .label { font-size: 0.82rem; color: #7a7a96; margin-top: 0.2rem; }

    .nav-links {
      display: flex;
      justify-content: center;
      gap: 1.5rem;
      flex-wrap: wrap;
      margin-top: 2rem;
      font-size: 0.95rem;
    }
    .nav-links a {
      background: #1e1e30;
      border: 1px solid #2a2a44;
      border-radius: 6px;
      padding: 0.5rem 1.1rem;
      transition: background 0.15s;
    }
    .nav-links a:hover { background: #2a2a48; text-decoration: none; }

    .section {
      max-width: 960px;
      margin: 0 auto;
      padding: 2.5rem 1.5rem;
    }
    .section h2 {
      font-size: 1.5rem;
      color: #fff;
      margin-bottom: 1.2rem;
      font-weight: 600;
    }

    .skills-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }
    .skill-card {
      background: #12121e;
      border: 1px solid #1e1e2e;
      border-radius: 10px;
      padding: 1.2rem;
      transition: border-color 0.15s;
    }
    .skill-card:hover { border-color: #a78bfa44; }
    .skill-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
    .skill-name { font-weight: 600; color: #fff; font-size: 1.05rem; }
    .badge {
      font-size: 0.7rem;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge.verified { background: #16a34a22; color: #4ade80; border: 1px solid #16a34a44; }
    .skill-desc {
      color: #9090a8;
      font-size: 0.88rem;
      margin-bottom: 0.7rem;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .skill-meta { display: flex; gap: 1rem; font-size: 0.82rem; color: #7a7a96; }
    .price { color: #a78bfa; font-weight: 600; }

    footer {
      text-align: center;
      padding: 2rem 1rem;
      color: #50506a;
      font-size: 0.82rem;
      border-top: 1px solid #1e1e2e;
    }
  </style>
</head>
<body>
  <div class="hero">
    <h1><span>Phantom Skills</span></h1>
    <p class="tagline">Paid Skill Marketplace for AI Agents — powered by x402 micropayments</p>

    <div class="stats">
      <div class="stat"><div class="num">18</div><div class="label">Skills</div></div>
      <div class="stat"><div class="num">x402</div><div class="label">Micropayments</div></div>
      <div class="stat"><div class="num">Crypto</div><div class="label">Services</div></div>
      <div class="stat"><div class="num">Ed25519</div><div class="label">Agent Identity</div></div>
    </div>

    <div class="nav-links">
      <a href="/skills">Skills API</a>
      <a href="/.well-known/agent.json">Agent Discovery</a>
      <a href="https://github.com/PhantomCapAI/phantom-skills" target="_blank" rel="noopener">GitHub</a>
    </div>
  </div>

  <div class="section">
    <h2>Featured Skills</h2>
    <div class="skills-grid">
      ${skillRows || '<p style="color:#50506a;">No skills loaded.</p>'}
    </div>
  </div>

  <footer>
    &copy; 2026 Phantom Capital &middot; Phantom Skills &middot;
    <a href="https://github.com/PhantomCapAI/phantom-skills">Open Source</a>
  </footer>
</body>
</html>`);
});

function esc(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default router;
