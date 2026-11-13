# Paramount Trader — Bybit Spot Simulator

A standalone, browser-based BTCUSDT Spot research simulator. This is a separate application from the legacy Yellow Card monitor.

## Safety boundary

- Uses Bybit V5 **public market-data endpoints only**.
- Does not ask for or store API keys, API secrets, passwords, OTPs or wallet data.
- Contains no private-account endpoints and no order, trading, transfer, deposit or withdrawal execution.
- Simulated starting capital defaults to 50 USDT. It is not connected to the user's Bybit balance.
- Spot, long-only, no leverage, one position at a time.
- Risk is capped at 0.5% per trade, with a 1% Gaborone-day loss lock and a two-loss stop.
- Enforces a 5 USDT minimum order notional and skips trades if minimum size would breach the risk budget.

## Run locally

Open `index.html` in a modern browser with an internet connection. If the browser blocks direct cross-origin requests, serve the folder over a local static HTTP server and/or add a same-origin public-data proxy. No credentials are required.

## Run

1. Open `bybit-simulator/index.html` from the repository, or publish this folder using GitHub Pages.
2. Select a strategy variant A–D.
3. Select the fee and slippage assumptions.
4. Press **Load Bybit data & run tests**.
5. Compare the four variants and inspect selected-strategy trades.

## Strategy variants

- A: 1H EMA50 > EMA200; 15m EMA20 reclaim; RSI14 crosses above 50; volume above 20-bar SMA.
- B: A plus completed 4H close above 4H EMA200.
- C: 1H trend; 15m pullback into EMA20–EMA50 area and bullish recovery close above EMA20; RSI above 50 and rising; 4H regime filter.
- D: B-style reclaim plus volume at least 1.2× 20-bar average.

Stops use the latest confirmed 3-left/3-right 15m pivot low and at least 0.75 ATR14 distance. Entry is the next 15m bar open. Target is 2R. Same-bar stop/target collision is resolved stop-first. Fees and slippage are charged on both sides.

## Research limitations

The browser prototype fetches up to 1,000 candles per interval, which is not enough for a robust long-horizon or out-of-sample study. Results are preliminary and can be distorted by data-window selection, candle-based execution assumptions, fee tier differences, spread, liquidity, and unmodelled outages. Do not treat a positive result as proof of an edge. The simulator should be extended with paginated historical data, a dedicated test suite, walk-forward/out-of-sample splits, and independent review before any real-money use is even considered.

## Official API references

- [Bybit V5 Get Kline](https://bybit-exchange.github.io/docs/v5/market/kline)
- [Bybit V5 Get Instruments Info](https://bybit-exchange.github.io/docs/v5/market/instrument)
- [Bybit V5 Public Market Data overview](https://bybit-exchange.github.io/docs/v5/market/market)

This project intentionally does not integrate private Bybit APIs.
