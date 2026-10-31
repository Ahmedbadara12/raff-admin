# رَف / Raff

A complete bilingual Angular store administration demo. Arabic is the default, with persistent English/LTR switching. Angular standalone components, signals, reactive forms, Router, Tailwind CSS and Chart.js. All business data stays in the browser.

## Run

Requires Node.js 24+ and npm.

```sh
cd raff-admin
npm ci
npm start
```

Open http://localhost:4200. Production output: `dist/raff-admin/browser`.

```sh
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

The browser tests start the development server automatically, or reuse the existing server at http://127.0.0.1:4200.

## Features

- `/dashboard`: shared-data KPIs, line/doughnut charts, keyboard-accessible sales table, recent orders, best sellers and current inventory links.
- `/orders`: debounced search, combined status/date filters, sorting, pagination and URL state; mobile order cards.
- `/orders/:id`: historical item/customer snapshots, totals, status history and service-enforced status transitions with cancellation confirmation.
- `/products`: bilingual/SKU search, category/activity/stock filters, sorting, pagination and URL state.
- `/products/new` and `/products/:id/edit`: a reusable reactive form, case-insensitive unique SKUs, Arabic/Persian numeral normalization, HTTPS image validation and unsaved-change protection.
- Invalid IDs and routes have useful recovery pages.
- Accessible mobile drawer with focus containment, Escape, inert background and focus restoration.

## Metric and date definitions

The selected range is the last 7, 30 or 90 calendar days, including today, in the browser's timezone. Orders are assigned by **creation date**, never by status-change date. The comparison uses the immediately preceding equal number of calendar days.

- Sales: total value of delivered orders created within that period, including shipping and discounts.
- Order count: all orders created within that period.
- Average order value: delivered sales divided by the number of delivered orders, rounded to integer minor units for display.
- Pending: pending orders created within that period. Increases indicate more workload, not a positive business judgment.
- A zero previous value displays “No previous data”. Other percentage changes are presented neutrally.
- Daily sales buckets for 7/30 days; weekly buckets for 90 days, with a final partial week. Buckets reconcile exactly to the sales KPI. Charts are chronological left to right in either language. Tooltips and the accessible table show complete dates/bucket ranges and exact EGP amounts.
- Recent orders and best sellers follow the selected period. Best sellers rank delivered quantities only.
- Status counts use the same filtered orders; percentages use largest-remainder rounding so nonempty distributions total 100%.
- Current inventory is independent of the sales range and includes active and inactive products. Low stock means `0 < stock <= lowStockThreshold`; out of stock means `stock === 0`. Sidebar links use exactly these filters.

## Persistence and imagery

`raff-data` stores schema version 1, stable products, orders and history. `raff-language` stores the selected language. Valid saved business data is read without rewriting it. Invalid JSON, invalid schemas or unavailable storage produce an in-memory demo and a visible recovery notice; corrupted saved data is preserved until an explicit confirmed reset. Reset touches only Raff's dataset and preserves language.

Product edits do not change order snapshots. Status changes do not adjust inventory or send notifications. All amounts use integer minor units and locale-aware `Intl.NumberFormat` EGP formatting with bidi isolation.

The 24 seeded products have distinct local SVG catalog illustrations matching their named objects. Rendering replaces legacy generic demo images without changing saved records; custom image URLs remain intact. Reusable images have translated alt text, lazy loading, fixed dimensions and a stable fallback. Optional user-supplied image URLs and Google Fonts require network access; system fonts remain available as fallbacks. Regenerate illustrations with `node scripts/create-catalog-assets.mjs`.

## Verification

Seven unit tests cover transitions, metrics, numeral normalization, SKU uniqueness, composed filtering, schema recovery validation, period boundaries, bucket reconciliation and percentage rounding. Seven Chromium scenarios cover the main CRUD flows, validation, filters, navigation, persistence/recovery, mobile navigation, locale formatting and data reconciliation. Arabic and English dashboard layouts are checked at 360, 390, 768, 1280 and 1536px, including rendered text sizes and page overflow. Local image assets are requested and decoded during browser tests.

This is a frontend portfolio demo with no backend, authentication, payments or cross-device synchronization. Verification uses Chromium; Safari, Firefox and real-device assistive technology were not tested.
