# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This repo analyzes personal Walmart order history. It has two parts:

- **Root**: raw data exports and a (currently empty) Jupyter notebook (`shoppping.ipynb`) intended for data collection and categorization work — see `README.md`'s two-step outline (data collection, then categorization).
- **`frontend/`**: an Angular application (project name `shopping-analysis`) scaffolded for building an analysis/visualization UI on top of the exported data. It's a fresh `ng new` scaffold with no app-specific code yet.

## Data files (root)

These are Walmart order exports, re-generated/overwritten as new exports are pulled — treat them as data, not source of truth for schema (check the CSV header row instead of assuming columns):

- `Walmart_Orders.csv` / `Walmart_Orders_2.csv` — one row per order (order number, date, address, payment, subtotal/savings/tax/tip, order total, fulfillment, tracking).
- `Walmart_Orders_Items.csv` / `Walmart_Orders_Items_2.csv` — one row per line item within an order (order number, product name, quantity, price, delivery status, product link). Joins to the orders files on `Order Number`.
- `Walmart_Orders_Items_With_Generic_Names.csv` — same as the items file, plus a `Generic Name` column that normalizes verbose Walmart product titles (e.g. "Fairfield Cushion Wrap for Crafts and Projects, 30\" x 10 Feet") down to a short generic label (e.g. "Fairfield Cushion Wrap for Crafts and Projects") — this is the categorization step referenced in the README.
- `Walmart_Orders.xlsx` — Excel version of the orders export.

There is no code in this repo yet that generates or consumes these CSVs (`shoppping.ipynb` is empty) — the pipeline referenced by the README ("collection" → "categorization") has not been implemented.

## Frontend (`frontend/`)

Standard Angular CLI 22 app (standalone components, `@angular/build` builder, Vitest for unit tests). Run all commands from `frontend/`:

- `npm start` — dev server (`ng serve`)
- `npm run build` — production build, output to `frontend/dist/shopping-analysis`
- `npm run watch` — dev build in watch mode
- `npm test` — unit tests (Vitest via `ng test`)
- `npx ng generate component <name>` — scaffold a new component

The Angular project is registered as `shopping-analysis` in `angular.json`/`package.json` even though the directory is `frontend`. There's no routing/state/data-loading code yet — `app.routes.ts` is empty and there's no HTTP client or service wired up to read the CSV data.
