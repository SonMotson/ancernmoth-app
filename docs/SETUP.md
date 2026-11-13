# Setup and connection

## What this integration can and cannot read

Yellow Card's current developer API is primarily a partner/business payment and stablecoin infrastructure API. The documented read endpoints implemented here are:
- GET /business/channels
- GET /business/sends/
- GET /business/receives/

These return partner payment rails and partner transaction records. They do **not** establish that a personal Yellow Card retail account can be connected, and they do not provide a verified BTC spot wallet balance endpoint. Do not interpret USDT/USDC or fiat payment records as BTC holdings.

## Partner access

Yellow Card's official onboarding process requires an introductory call, pre-integration form, KYB documentation, AML review, legal agreement and then sandbox credentials. Ask Yellow Card whether your intended use case and account are eligible.

Official onboarding: https://docs.yellowcard.engineering/docs/getting-started-api

## Credentials

1. Complete partner onboarding.
2. Obtain sandbox API key and secret.
3. Configure the Worker secrets YC_API_KEY and YC_API_SECRET in Cloudflare. Never put them in Git, browser code, or chat.
4. Keep APP_MODE=demo until credentials are configured; then set APP_MODE=sandbox for sandbox calls.
5. The API key must have API read permission only. Do not grant API write.
6. Production remains locked in code until partner sign-off, static IP allowlisting, and an independent security review.

## Safety invariants

This Worker rejects every non-GET request. There are no endpoints for trading, orders, sending, receiving, refunds, settlement, transfers, wallet creation or withdrawals. No live trading code is present. BTC price is retrieved from public market data and is explicitly separate from Yellow Card account records.

## Authentication

The implementation follows Yellow Card's current authentication documentation: X-YC-Timestamp is ISO-8601; Authorization uses YcHmacV1; signature message is timestamp + path (without query string) + uppercase method. For GET, no body hash is appended. See https://docs.yellowcard.engineering/docs/authentication-api
