# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This repo analyzes personal Walmart order history. It has two parts:

- **Root**: raw data exports (in `sample_data/`) and a (currently empty) Jupyter notebook (`shoppping.ipynb`) intended for data collection and categorization work — see `README.md`'s two-step outline (data collection, then categorization).
- **`frontend/`**: an Angular application (project name `shopping-analysis`) scaffolded for building an analysis/visualization UI on top of the exported data. It's a fresh `ng new` scaffold with no app-specific code yet.

## Data files (`sample_data/`)

These are Walmart order-items exports, re-generated/overwritten as new exports are pulled — treat them as data, not source of truth for schema (check the CSV header row instead of assuming columns):

- `Walmart_Orders_Items.csv` — one row per line item within an order (order number, order date, product name, quantity, price, delivery status, product link).
- `Walmart_Orders_Items_partial.csv` — a partial/in-progress export of the same shape as `Walmart_Orders_Items.csv`; a subset, not a distinct schema.

There is no code in this repo yet that generates or consumes these CSVs (`shoppping.ipynb` is empty) — the pipeline referenced by the README ("collection" → "categorization") has not been implemented.

Ignore `extra_files/` — it holds older exports (including an orders-level file and a generic-name mapping) that are incomplete, incorrect, or otherwise irrelevant; don't treat it as documentation of the current schema or pipeline.

## Frontend (`frontend/`)

Standard Angular CLI 22 app (standalone components, `@angular/build` builder, Vitest for unit tests). Run all commands from `frontend/`:

- `npm start` — dev server (`ng serve`)
- `npm run build` — production build, output to `frontend/dist/shopping-analysis`
- `npm run watch` — dev build in watch mode
- `npm test` — unit tests (Vitest via `ng test`)
- `npx ng generate component <name>` — scaffold a new component

The Angular project is registered as `shopping-analysis` in `angular.json`/`package.json` even though the directory is `frontend`. There's no routing/state/data-loading code yet — `app.routes.ts` is empty and there's no HTTP client or service wired up to read the CSV data.
