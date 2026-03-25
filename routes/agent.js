import { Router } from "express";

const router = Router();

const SOLANA_ADDRESS = "Azc1rQquyNRHrV5YP4Hb2Qm56qxRWrr4GUpftjE2hxFP";
const BASE_ADDRESS = "0xeBa3d756E948232Ee18FAAE58583c5D5D90D1117";

// /.well-known/agent.json — machine-readable agent card for x402 discovery
router.get("/.well-known/agent.json", (_req, res) => {
  res.json({
    name: "Phantom Skills",
    description:
      "Paid skill marketplace for AI agents. Browse, purchase, and download OpenClaw skills via x402 micropayments on Solana.",
    url: process.env.APP_BASE_URL || "https://phantomskills.zeabur.app",
    operator: {
      name: "Phantom Capital",
      contact: "phoebe@phantomcapital.ai",
      twitter: "https://twitter.com/phantomcap_ai",
      website: "https://phantomskills.zeabur.app",
    },
    wallet: {
      solana: SOLANA_ADDRESS,
      evm: BASE_ADDRESS,
    },
    network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
    paymentProtocol: "x402",
    acceptedTokens: ["USDC", "SOL"],
    services: [
      {
        name: "Browse Skills",
        path: "/x402/skills",
        method: "GET",
        priceCents: 0.1,
        description:
          "List all available skills with search and filtering. Returns name, description, price, creator, install count.",
      },
      {
        name: "Skill Details",
        path: "/x402/skills/:slug",
        method: "GET",
        priceCents: 0.5,
        description:
          "Full skill detail including version history, creator info, and purchase count.",
      },
      {
        name: "Download Skill",
        path: "/x402/skills/:slug/download",
        method: "GET",
        priceCents: 5,
        description:
          "Download skill files and metadata. Increments install count.",
      },
      {
        name: "Leaderboard",
        path: "/x402/leaderboard",
        method: "GET",
        priceCents: 0.1,
        description: "Top 10 verified skills ranked by installs.",
      },
    ],
    identityServices: [
      {
        name: "Generate Agent Identity",
        path: "/identity/generate",
        method: "POST",
        description:
          "Generate Ed25519 keypair for agent identity. Returns public key, private key, fingerprint, and SOUL.md block ready to paste.",
        free: true,
      },
      {
        name: "Sign Message",
        path: "/identity/sign",
        method: "POST",
        description:
          "Sign a message with agent private key. Proves identity cryptographically.",
        free: true,
      },
      {
        name: "Verify Signature",
        path: "/identity/verify",
        method: "POST",
        description:
          "Verify a signed message against an agent's public key. Confirms identity.",
        free: true,
      },
    ],
    freeEndpoints: [
      { path: "/health", method: "GET", description: "Health check" },
      { path: "/skills", method: "GET", description: "Browse skills (free)" },
      {
        path: "/skills/:slug",
        method: "GET",
        description: "Skill detail (free)",
      },
      {
        path: "/skills/leaderboard",
        method: "GET",
        description: "Leaderboard (free)",
      },
    ],
    metadata: {
      version: "1.0.0",
      protocol: "x402",
      platform: "OpenClaw",
      totalSkills: 15,
      createdAt: "2026-03-25",
    },
  });
});

export default router;
