import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

/**
 * Search for a company and return matching equity tickers.
 * Useful for resolving a company name to a symbol before fetching data.
 *
 * @param query - Company name or partial name (e.g. "Equinor", "Mowi")
 * @returns Array of matching equities with symbol, name, and exchange
 */
export async function findTicker(query: string) {
  const results = await yf.search(query);
  return results.quotes.filter((q) => q.quoteType === "EQUITY");
}

/**
 * Get the current market quote for a stock.
 * Norwegian stocks use the .OL suffix (e.g. "EQNR.OL", "DNB.OL").
 *
 * @param symbol - Yahoo Finance ticker symbol
 * @returns Current price, change, market cap, and currency
 */
export async function getQuote(symbol: string) {
  const quote = await yf.quote(symbol);
  return {
    symbol: quote.symbol,
    name: quote.shortName,
    price: quote.regularMarketPrice,
    change: quote.regularMarketChange,
    changePct: quote.regularMarketChangePercent,
    currency: quote.currency,
    marketCap: quote.marketCap,
  };
}

/**
 * Get daily OHLCV (open, high, low, close, volume) history for a stock.
 *
 * @param symbol - Yahoo Finance ticker symbol
 * @param period - Lookback period: '1mo', '3mo', or '1y' (default: '1mo')
 * @returns Array of daily bars sorted oldest to newest
 */
export async function getHistory(
  symbol: string,
  period: "1mo" | "3mo" | "1y" = "1mo",
) {
  const result = await yf.chart(symbol, {
    period1: getPeriodStart(period),
    period2: new Date(),
    interval: "1d",
  });
  return result.quotes;
}

/**
 * Resolves a period string to a start Date relative to today.
 * @internal
 */
function getPeriodStart(period: "1mo" | "3mo" | "1y"): Date {
  const d = new Date();
  if (period === "1mo") d.setMonth(d.getMonth() - 1);
  if (period === "3mo") d.setMonth(d.getMonth() - 3);
  if (period === "1y") d.setFullYear(d.getFullYear() - 1);
  return d;
}
