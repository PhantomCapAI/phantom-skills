import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/http";

// Phoebe's wallets — payments go here
const SOLANA_ADDRESS = "Azc1rQquyNRHrV5YP4Hb2Qm56qxRWrr4GUpftjE2hxFP";
const BASE_ADDRESS = "0xeBa3d756E948232Ee18FAAE58583c5D5D90D1117";

// Base mainnet (USDC payments via x402)
const BASE_MAINNET = "eip155:8453";

// x402 facilitator
const facilitatorClient = new HTTPFacilitatorClient({
  url: "https://facilitator.payai.network",
});

const server = new x402ResourceServer(facilitatorClient);
server.register("eip155:*", new ExactEvmScheme());

// Define paid API routes with prices (USDC on Base)
const paidRoutes = {
  "GET /x402/skills": {
    accepts: [
      {
        scheme: "exact",
        price: "$0.001",
        network: BASE_MAINNET,
        payTo: BASE_ADDRESS,
      },
    ],
    description: "Browse all skills in the marketplace",
    mimeType: "application/json",
  },
  "GET /x402/skills/:slug": {
    accepts: [
      {
        scheme: "exact",
        price: "$0.005",
        network: BASE_MAINNET,
        payTo: BASE_ADDRESS,
      },
    ],
    description: "Get full skill details including versions and creator info",
    mimeType: "application/json",
  },
  "GET /x402/skills/:slug/download": {
    accepts: [
      {
        scheme: "exact",
        price: "$0.05",
        network: BASE_MAINNET,
        payTo: BASE_ADDRESS,
      },
    ],
    description: "Download skill files (SKILL.md + metadata)",
    mimeType: "application/json",
  },
  "GET /x402/leaderboard": {
    accepts: [
      {
        scheme: "exact",
        price: "$0.001",
        network: BASE_MAINNET,
        payTo: BASE_ADDRESS,
      },
    ],
    description: "Top 10 verified skills by installs",
    mimeType: "application/json",
  },
};

export async function setupX402(app) {
  app.use(paymentMiddleware(paidRoutes, server));
}

export { paidRoutes, SOLANA_ADDRESS, BASE_ADDRESS, BASE_MAINNET };
