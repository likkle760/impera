export type ProductType = "tool" | "education" | "membership";

export interface Product {
  slug: string;          // catalog key on the API (checkout ?product=)
  name: string;
  tagline: string;
  description: string;
  price: number;         // display price GBP (server enforces real amount)
  oldPrice?: number;
  currency: "GBP";
  type: ProductType;
  features: string[];
  active: boolean;
  cta: string;
}

export const BRAND = {
  name: "IMPERA",
  domain: "imperatrading.online",
  url: "https://imperatrading.online",
  tagline: "Trade with purpose. Build real skill.",
  email: "support@imperatrading.online",
  socials: { x: "", instagram: "", youtube: "", telegram: "" },
};

export const PRODUCTS: Product[] = [
  {
    slug: "impera-bot",
    name: "IMPERA Bot",
    tagline: "Automated execution with structure",
    description:
      "Algorithmic trading tool for MetaTrader 5. Executes your strategy with discipline, consistent risk rules and no emotional interference.",
    price: 49,
    oldPrice: 99,
    currency: "GBP",
    type: "tool",
    active: true,
    cta: "Buy Impera Bot",
    features: [
      "EMA crossover + RSI confirmation engine",
      "Dynamic lot sizing & trailing stop",
      "London / New York session filter",
      "Licence key delivered instantly",
    ],
  },
  {
    slug: "mentor-monthly",
    name: "Monthly Mentorship",
    tagline: "Structured education & community",
    description:
      "A structured monthly programme: live sessions, market breakdowns, trade reviews and a community of traders building real process.",
    price: 50,
    currency: "GBP",
    type: "membership",
    active: true,
    cta: "Join Mentorship",
    features: [
      "2x private 1:1 video calls monthly",
      "Full strategy curriculum, step by step",
      "Private community access",
      "Trade reviews with direct feedback",
      "Cancel anytime",
    ],
  },
  {
    slug: "quant",
    name: "IMPERA Quant Scalper",
    tagline: "Precision scalping engine",
    description:
      "High-frequency scalping system for MetaTrader 5. Fast entries, tight risk control and fully mechanical execution.",
    price: 325,
    oldPrice: 750,
    currency: "GBP",
    type: "tool",
    active: true,
    cta: "Get Quant Scalper",
    features: [
      "Scalping engine tuned for fast markets",
      "Strict per-trade risk limits",
      "Full MT5 integration",
      "Licence key delivered instantly",
    ],
  },
  {
    slug: "ebook",
    name: "Trading Guide",
    tagline: "Your first step toward the markets",
    description:
      "A complete beginner's guide to understanding markets — candles, structure, risk, psychology and building a repeatable process.",
    price: 50,
    currency: "GBP",
    type: "education",
    active: true,
    cta: "Get the Ebook",
    features: [
      "10 chapters, from basics to strategy",
      "Risk management framework",
      "Trading journal templates",
      "Instant digital delivery",
    ],
  },
];

export const getProduct = (slug: string) => PRODUCTS.find((p) => p.slug === slug);

export const gbp = (n: number) => `£${n}`;
