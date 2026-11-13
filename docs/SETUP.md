# Setup and connection

## Product and account limitations

Yellow Card's current developer API is a partner/business payments and stablecoin infrastructure API. It is not a general-purpose personal retail BTC exchange API. The read endpoints implemented here are:
- GET /business/channels
- GET /business/sends/
- GET /business/receives/

They provide partner payment channels and partner receive/send records. They do **not** establish access to a personal retail account, nor do they expose a verified BTC spot-wallet balance endpoint. The monitor never infers BTC holdings from fiat, USDT or USDC records.

## Partner onboarding

Yellow Card requires an introductory call, pre-integration form, KYB documentation, AML review, legal agreement and then sandbox credentials. Ask Yellow Card to confirm whether your use case and entity are eligible.

Official onboarding: https://docs.yellowcard.engineering/docs/getting-started-api

## Credentials and protection

1. Complete partner onboarding and receive sandbox API credentials.
2. Configure Cloudflare Worker secrets YC_API_KEY and YC_API_SECRET. Never put secrets in Git, browser code, or chat.
3. Set DASHBOARD_TOKEN as a long random Cloudflare Worker secret. The dashboard asks for this token; it remains in page memory only and is not saved in browser storage.
4. Keep APP_MODE=demo until credentials and dashboard authentication are configured; then set APP_MODE=sandbox.
5. The Yellow Card API key must have API read permission only. Do not grant API write.
6. Production remains locked until Yellow Card signs off the sandbox integration, confirms the allowed scope, static IP allowlisting is completed, and the deployment receives an independent security review.

## Safety invariants

The Worker rejects every non-GET request. There are no endpoints for trading, orders, sending, receiving, refunds, settlement, transfers, wallet creation or withdrawals. No live trading code is present. BTC price comes from public market data and is explicitly separate from Yellow Card account records.

The dashboard displays only an allowlist of non-sensitive transaction fields. It strips recipient identity, phone numbers, bank account numbers and addresses. No Yellow Card records are stored.

## Authentication implementation

The implementation follows the current Yellow Card authentication documentation: X-YC-Timestamp is ISO-8601; Authorization uses YcHmacV1; the GET signature message is timestamp + path (excluding query string) + uppercase method. See https://docs.yellowcard.engineering/docs/authentication-api
