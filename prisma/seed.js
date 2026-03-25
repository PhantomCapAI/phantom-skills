import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  // Create Phoebe as the first creator
  const phoebe = await prisma.user.upsert({
    where: { email: "phoebe@phantomcapital.ai" },
    update: {},
    create: {
      email: "phoebe@phantomcapital.ai",
      name: "Phoebe (Phantom Capital)",
      referralCode: "phantom",
    },
  });

  console.log("Creator:", phoebe.name, phoebe.id);

  const skills = [
    {
      slug: "brave-search",
      name: "Brave Search",
      description: "Web search via Brave Search API. Fresh results, news, structured data. Superior to DuckDuckGo for time-sensitive queries.",
      price: 299,
    },
    {
      slug: "tavily-search",
      name: "Tavily AI Search",
      description: "AI-powered research search that returns summarized answers with cited sources. Best for research questions needing synthesized answers.",
      price: 299,
    },
    {
      slug: "firecrawl",
      name: "Firecrawl Web Scraper",
      description: "Scrape any webpage to clean LLM-ready markdown. Crawl entire sites. Handles JavaScript rendering and anti-bot measures.",
      price: 499,
    },
    {
      slug: "fal-images",
      name: "fal.ai Image Generation",
      description: "Generate images from text prompts using FLUX models. Blog headers, social visuals, product mockups. Fast and high quality.",
      price: 399,
    },
    {
      slug: "agentmail",
      name: "AgentMail Email",
      description: "Send and receive email as an AI agent. Full inbox management, threading, and replies. Your agent gets its own email address.",
      price: 399,
    },
    {
      slug: "resend-email",
      name: "Resend Transactional Email",
      description: "Automated transactional emails — receipts, notifications, onboarding sequences. High deliverability for agent-sent email.",
      price: 299,
    },
    {
      slug: "bags-trading",
      name: "Bags.fm Solana Trading",
      description: "Trade SPL tokens on Solana via Bags.fm API. Quotes, swaps, token lookups. Built-in safety limits for autonomous trading.",
      price: 799,
    },
    {
      slug: "helius-solana",
      name: "Helius Solana RPC",
      description: "Enhanced Solana RPC with DAS API. Token balances, NFT data, parsed transaction history, webhooks. Everything you need for Solana.",
      price: 499,
    },
    {
      slug: "zeabur-infra",
      name: "Zeabur Infrastructure",
      description: "Manage Zeabur deployments from your agent. Deploy, restart, check logs, manage env vars. Self-managing infrastructure.",
      price: 399,
    },
    {
      slug: "stripe-payments",
      name: "Stripe Payments",
      description: "Check balances, list transactions, create payment links, manage payouts. Full Stripe API access for autonomous commerce.",
      price: 599,
    },
    {
      slug: "wordpress-publisher",
      name: "WordPress Publisher",
      description: "Publish blog posts, manage content, update pages on WordPress sites. Automated content pipeline for AI agents.",
      price: 299,
    },
    {
      slug: "twitter-agent",
      name: "Twitter/X Agent",
      description: "Post tweets, read timelines, engage with followers. Full Twitter API integration for autonomous social presence.",
      price: 499,
    },
    {
      slug: "gumroad-seller",
      name: "Gumroad Seller",
      description: "Create products, manage sales, track revenue on Gumroad. Autonomous digital product sales for AI agents.",
      price: 399,
    },
    {
      slug: "wallet-manager",
      name: "Multi-Chain Wallet",
      description: "Manage Solana and EVM wallets. Check balances, send tokens, monitor transactions across chains.",
      price: 599,
    },
    {
      slug: "elevenlabs-voice",
      name: "ElevenLabs TTS",
      description: "Text-to-speech with realistic AI voices. Generate audio content, podcasts, voice responses for your agent.",
      price: 399,
    },
  ];

  for (const s of skills) {
    const skill = await prisma.skill.upsert({
      where: { slug: s.slug },
      update: { price: s.price, description: s.description },
      create: {
        slug: s.slug,
        name: s.name,
        description: s.description,
        price: s.price,
        creatorId: phoebe.id,
        verified: true,
        verifiedAt: new Date(),
        versions: {
          create: {
            tag: "1.0.0",
            changelog: "Initial release",
          },
        },
      },
    });
    console.log(`  ${skill.verified ? "✓" : "○"} ${skill.slug} — $${(s.price / 100).toFixed(2)}`);
  }

  console.log(`\nSeeded ${skills.length} skills by ${phoebe.name}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
