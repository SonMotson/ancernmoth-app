# Paramount Trader v2.0 — Yellow Card Monitor

A standalone, read-only account-monitoring service. Live trading, orders, transfers, settlements, refunds and withdrawals are not implemented.

## Important product boundary
Yellow Card's documented API is a business-partner payment and stablecoin infrastructure API, not a general-purpose retail BTC exchange account API. A personal retail Yellow Card account may not be accessible through it. This integration can retrieve only partner resources that Yellow Card authorizes for the issued API key. It does not infer BTC holdings from USDT/USDC balances or fiat payment records.

## Safety
- GET-only allowlist enforced server-side.
- API credentials remain in server environment variables.
- No trading, order, send, receive, settlement, refund, wallet creation or withdrawal route exists.
- Production mode is locked until partner approval and deployment review.
- Sandbox first; API read permission only.

## Official references
- https://docs.yellowcard.engineering/docs/authentication-api
- https://docs.yellowcard.engineering/docs/getting-started-api
- https://docs.yellowcard.engineering/docs/integration-security-guide
- https://docs.yellowcard.engineering/reference/get-channels
- https://docs.yellowcard.engineering/reference/list-sends
- https://docs.yellowcard.engineering/docs/list-collections-guide-api

## Setup
See `docs/SETUP.md`. Never paste API secrets into chat or commit them to Git.