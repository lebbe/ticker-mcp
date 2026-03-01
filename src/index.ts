#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { findTicker, getQuote, getHistory } from "./yahooFinance.js";

const server = new McpServer({
  name: "ticker-mcp",
  version: "1.0.0",
});

// --- Cache layer (10-minute TTL) ---
const cache = new Map<string, { data: unknown; expires: number }>();
const CACHE_TTL = 10 * 60 * 1000;

function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const entry = cache.get(key);
  if (entry && entry.expires > Date.now()) {
    return Promise.resolve(entry.data as T);
  }
  return fn().then((data) => {
    cache.set(key, { data, expires: Date.now() + CACHE_TTL });
    return data;
  });
}

// --- Tools ---

server.registerTool(
  "search_ticker",
  {
    description: "Search for a stock ticker symbol by company name or keyword",
    inputSchema: {
      query: z
        .string()
        .describe("Company name or search keyword, e.g. 'Tesla' or 'AAPL'"),
    },
  },
  async ({ query }) => {
    const results = await cached(`search:${query}`, () => findTicker(query));
    if (results.length === 0) {
      return {
        content: [
          { type: "text", text: `No equity results found for "${query}".` },
        ],
      };
    }
    const text = results
      .map(
        (r) =>
          `${r.symbol} — ${r.shortname ?? r.longname ?? "Unknown"} (${r.exchange})`,
      )
      .join("\n");
    return { content: [{ type: "text", text }] };
  },
);

server.registerTool(
  "get_quote",
  {
    description: "Get the current price and key market data for a stock symbol",
    inputSchema: {
      symbol: z.string().describe("Ticker symbol, e.g. 'AAPL' or 'TRMED.OL'"),
    },
  },
  async ({ symbol }) => {
    const quote = await cached(`quote:${symbol}`, () => getQuote(symbol));
    const lines = [
      `${quote.name} (${quote.symbol})`,
      `Price: ${quote.price} ${quote.currency}`,
      `Change: ${quote.change} (${quote.changePct?.toFixed(2)}%)`,
      quote.marketCap
        ? `Market Cap: ${formatMarketCap(quote.marketCap)} ${quote.currency}`
        : null,
    ].filter(Boolean);
    return { content: [{ type: "text", text: lines.join("\n") }] };
  },
);

server.registerTool(
  "get_history",
  {
    description: "Get historical daily price data for a stock symbol",
    inputSchema: {
      symbol: z.string().describe("Ticker symbol, e.g. 'AAPL' or 'TRMED.OL'"),
      period: z
        .enum(["1mo", "3mo", "1y"])
        .default("1mo")
        .describe("How far back to look: 1mo, 3mo, or 1y"),
    },
  },
  async ({ symbol, period }) => {
    const history = await cached(`history:${symbol}:${period}`, () =>
      getHistory(symbol, period),
    );
    if (!history || history.length === 0) {
      return {
        content: [{ type: "text", text: `No history found for ${symbol}.` }],
      };
    }

    const header = `Date       | Open     | High     | Low      | Close    | Volume`;
    const sep = `-----------|----------|----------|----------|----------|----------`;
    const rows = history.map((d) => {
      const date =
        d.date instanceof Date
          ? d.date.toISOString().slice(0, 10)
          : String(d.date).slice(0, 10);
      return `${date} | ${fmt(d.open)} | ${fmt(d.high)} | ${fmt(d.low)} | ${fmt(d.close)} | ${d.volume ?? "N/A"}`;
    });

    return {
      content: [{ type: "text", text: [header, sep, ...rows].join("\n") }],
    };
  },
);

// --- Helpers ---

function fmt(n: number | null | undefined): string {
  return n != null ? n.toFixed(2).padStart(8) : "     N/A";
}

function formatMarketCap(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  return n.toLocaleString();
}

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ticker-mcp server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
