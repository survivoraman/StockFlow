# StockFlow

StockFlow is a static browser application whose production source of truth is two Google Sheets: one Sales sheet and one Stock sheet. The included Excel workbooks were inspected for schema only and are never read by the application.

## Run

Copy `.env.example` to `.env`, set the server-only Google OAuth values, then run `node server.js` and visit `http://localhost:8080`. In **Settings**, authorize read-only access, add each Google Sheet URL, choose its tab and sync.

The OAuth client must be configured in Google Cloud with `http://localhost:8080/api/auth/callback` as an authorized redirect URI. Enable both Google Sheets API and Google Drive API. The server uses Google Sheets write access only for an explicit, conflict-checked stock adjustment initiated by the user; normal sales syncing never deducts stock. It requests Drive metadata only to show the spreadsheet picker. The browser never receives the OAuth client ID, secret, or access token.

## Data and calculations

Sales headers: `Date`, `Order Id`, `Sku`, `Qty`, `Portal`, `Month`, `Year`, `Simplified`, `Quality`, `Colour`, `Size`.

Stock headers: `Uniware SKU`, `Simplified`, `Item`, `Color`, `Size`, `STOCK`, `IMAGE`, `EAN`, `ASIN`, `MRP`.

SKUs are matched after trim + case normalization only. Metrics sum valid quantities in calendar windows ending today. Average daily sales uses the actual available history period (up to six months); monthly is daily × 30.4375. Days of stock is sheet `STOCK` / daily sales, and is never a stock mutation. Duplicate stock SKUs stay as separate rows; unmatched sales stay in sales data.

IndexedDB holds a clearly labelled browser cache of config, raw rows and sync metadata. It is not a source of truth. Replenishment is a sortable attention view only; it intentionally does not calculate purchase quantities because the source lacks lead time, safety stock and target stock.

## Tests

`tests/calculations.test.mjs` contains portable Node assertion tests for the calculation engine. Run it with `node --test tests/calculations.test.mjs` once Node.js is installed.

## Oracle server deployment

1. Point a DNS name (for example `stockflow.example.com`) to the Oracle server and allow inbound TCP 80/443 in both the Oracle Cloud security list/security group and the server firewall.
2. Install Docker Engine and Docker Compose on the server, clone/copy this project, then create the secret configuration: `cp .env.example .env`. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, a long random `SESSION_SECRET`, and `GOOGLE_REDIRECT_URI=https://stockflow.example.com/api/auth/callback`.
3. In Google Cloud Console, enable Google Sheets API and Google Drive API. Add that exact HTTPS callback URI to the OAuth client’s authorized redirect URIs. Configure the consent screen for the two read-only scopes used by StockFlow.
4. Replace `YOUR_DOMAIN` in `deploy/nginx-stockflow.conf`, install it as an Nginx site, then obtain a TLS certificate with Certbot: `sudo certbot --nginx -d stockflow.example.com`.
5. Start the application: `docker compose up -d --build`. It listens only on `127.0.0.1:8080`; Nginx is the public HTTPS entry point.
6. Set `COOKIE_SECURE=true` in production `.env`. Confirm with `docker compose ps`, `docker compose logs -f stockflow`, and visit the HTTPS address. Back up the Docker volume `stockflow_sessions`; it contains `stockflow.db`, which holds encrypted sessions, the stock-action ledger and audit history. Never commit `.env` or `data/`.

## Production safeguards

The server creates an exactly-once ID for every explicit stock adjustment and rejects a replayed ID. Normal Sales Sheet sync remains read-only with respect to source `STOCK`, so it cannot double-deduct historical sales. Stock writes use an optimistic current-value check and undo refuses to overwrite a later Sheet change. Every Sheet cell rendered as text is HTML-escaped.
