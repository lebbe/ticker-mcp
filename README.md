# ticker-mcp

An MCP (Model Context Protocol) server that provides stock market data via [Yahoo Finance](https://finance.yahoo.com/). Search for tickers, get live quotes, and pull historical price data — all from your AI assistant.

## Requirements

- **Node.js 22+** (uses native TypeScript strip-types)

## Installation

```bash
git clone https://github.com/lebbe/ticker-mcp.git
cd ticker-mcp
npm install
```

## MCP Configuration

Add to your MCP client config (e.g. Claude Desktop, VS Code, claude.io):

```json
{
  "mcpServers": {
    "ticker-mcp": {
      "command": "node",
      "args": ["--experimental-strip-types", "src/index.ts"],
      "cwd": "C:\\Users\\<you>\\code\\ticker-mcp"
    }
  }
}
```

Adjust the `cwd` path to where you cloned the repo.

## Tools

### `search_ticker`

Search for a stock ticker symbol by company name or keyword.

| Parameter | Type   | Description                                      |
|-----------|--------|--------------------------------------------------|
| `query`   | string | Company name or keyword, e.g. `"Tesla"`, `"AAPL"` |

**Example:** Searching `"Equinor"` returns:

```
EQNR    — Equinor ASA (NYQ)
EQNR.OL — EQUINOR (OSL)
```

### `get_quote`

Get the current price and key market data for a stock symbol.

| Parameter | Type   | Description                                    |
|-----------|--------|------------------------------------------------|
| `symbol`  | string | Ticker symbol, e.g. `"AAPL"` or `"EQNR.OL"` |

**Example output:**

```
EQUINOR (EQNR.OL)
Price: 281.6 NOK
Change: 2.6 (0.93%)
Market Cap: 702.74B NOK
```

### `get_history`

Get historical daily OHLCV price data for a stock symbol.

| Parameter | Type   | Default | Description                           |
|-----------|--------|---------|---------------------------------------|
| `symbol`  | string |         | Ticker symbol, e.g. `"AAPL"`         |
| `period`  | enum   | `1mo`   | Lookback period: `1mo`, `3mo`, or `1y` |

**Example output:**

```
Date       | Open     | High     | Low      | Close    | Volume
-----------|----------|----------|----------|----------|----------
2025-02-03 |   281.20 |   283.50 |   279.80 |   281.60 | 1234567
...
```

## Caching

All data is cached in memory for **10 minutes** to avoid unnecessary API calls. Each unique combination of tool + arguments gets its own cache entry.

## Development

```bash
# Type-check
npm run check

# Run the server directly
npm start

# Test individual tools from the CLI
npm run test-tool -- search "Mowi"
npm run test-tool -- quote DNB.OL
npm run test-tool -- history AAPL 3mo
```

## Ticker Symbols

Yahoo Finance uses exchange suffixes for non-US stocks:

| Exchange       | Suffix  | Example     |
|----------------|---------|-------------|
| Oslo (OSE)     | `.OL`   | `EQNR.OL`  |
| Stockholm      | `.ST`   | `VOLV-B.ST` |
| Copenhagen     | `.CO`   | `NOVO-B.CO` |
| Helsinki       | `.HE`   | `NOKIA.HE`  |
| US (NYSE/NASDAQ) | *(none)* | `AAPL`    |

Use `search_ticker` to find the correct symbol for any company.

## License

ISC
