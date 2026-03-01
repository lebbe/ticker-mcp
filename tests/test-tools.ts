#!/usr/bin/env node
/**
 * CLI test runner for ticker-mcp Yahoo Finance tools.
 *
 * Usage:
 *   node --experimental-strip-types tests/test-tools.ts <tool> [args...]
 *
 * Tools:
 *   search <query>             Search for a ticker by company name
 *   quote  <symbol>            Get current price/market data
 *   history <symbol> [period]  Get daily OHLCV data (period: 1mo | 3mo | 1y)
 *
 * Examples:
 *   node --experimental-strip-types tests/test-tools.ts search "Thor Medical"
 *   node --experimental-strip-types tests/test-tools.ts quote TRMED.OL
 *   node --experimental-strip-types tests/test-tools.ts history AAPL 3mo
 */

import { findTicker, getQuote, getHistory } from "../src/yahooFinance.ts";

const [tool, ...rest] = process.argv.slice(2);

if (!tool) {
  console.error(
    `Usage: node --experimental-strip-types tests/test-tools.ts <tool> [args...]

Tools:
  search <query>             Search for a ticker by company name
  quote  <symbol>            Get current price/market data
  history <symbol> [period]  Get daily OHLCV data (period: 1mo | 3mo | 1y)`,
  );
  process.exit(1);
}

async function run() {
  switch (tool) {
    case "search": {
      const query = rest.join(" ");
      if (!query) {
        console.error("Error: search requires a query argument");
        process.exit(1);
      }
      console.log(`Searching for "${query}"...\n`);
      const results = await findTicker(query);
      if (results.length === 0) {
        console.log("No equity results found.");
      } else {
        for (const r of results) {
          console.log(
            `  ${r.symbol}  —  ${r.shortname ?? r.longname ?? "Unknown"}  (${r.exchange})`,
          );
        }
      }
      break;
    }

    case "quote": {
      const symbol = rest[0];
      if (!symbol) {
        console.error("Error: quote requires a symbol argument");
        process.exit(1);
      }
      console.log(`Fetching quote for ${symbol}...\n`);
      const quote = await getQuote(symbol);
      console.log(`  ${quote.name} (${quote.symbol})`);
      console.log(`  Price:      ${quote.price} ${quote.currency}`);
      console.log(
        `  Change:     ${quote.change} (${quote.changePct?.toFixed(2)}%)`,
      );
      if (quote.marketCap) {
        console.log(
          `  Market Cap: ${quote.marketCap.toLocaleString()} ${quote.currency}`,
        );
      }
      break;
    }

    case "history": {
      const symbol = rest[0];
      const period = (rest[1] as "1mo" | "3mo" | "1y") ?? "1mo";
      if (!symbol) {
        console.error("Error: history requires a symbol argument");
        process.exit(1);
      }
      if (!["1mo", "3mo", "1y"].includes(period)) {
        console.error(
          `Error: invalid period "${period}" (use 1mo, 3mo, or 1y)`,
        );
        process.exit(1);
      }
      console.log(`Fetching ${period} history for ${symbol}...\n`);
      const history = await getHistory(symbol, period);
      if (!history || history.length === 0) {
        console.log("No history data found.");
      } else {
        console.log(
          "  Date       | Open     | High     | Low      | Close    | Volume",
        );
        console.log(
          "  -----------|----------|----------|----------|----------|----------",
        );
        for (const d of history) {
          const date =
            d.date instanceof Date
              ? d.date.toISOString().slice(0, 10)
              : String(d.date).slice(0, 10);
          const fmt = (n: number | null | undefined) =>
            n != null ? n.toFixed(2).padStart(8) : "     N/A";
          console.log(
            `  ${date} | ${fmt(d.open)} | ${fmt(d.high)} | ${fmt(d.low)} | ${fmt(d.close)} | ${d.volume ?? "N/A"}`,
          );
        }
        console.log(`\n  ${history.length} rows`);
      }
      break;
    }

    default:
      console.error(`Unknown tool: "${tool}". Use search, quote, or history.`);
      process.exit(1);
  }
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
