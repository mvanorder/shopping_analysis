# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This repo analyzes personal Walmart order history. It has two parts:

- **Root**: raw data exports (in `sample_data/`) and a (currently empty) Jupyter notebook (`shoppping.ipynb`) intended for data collection and categorization work — see `README.md`'s two-step outline (data collection, then categorization).
- **`frontend/`**: an Expo (React Native) app scaffolded for building an analysis/visualization UI on top of the exported data, targeting iOS, Android, and web from one codebase. It's a fresh `create-expo-app` scaffold (default tabs template) with no app-specific code yet.

## Data files (`sample_data/`)

These are Walmart order-items exports, re-generated/overwritten as new exports are pulled — treat them as data, not source of truth for schema (check the CSV header row instead of assuming columns):

- `Walmart_Orders_Items.csv` — one row per line item within an order (order number, order date, product name, quantity, price, delivery status, product link).
- `Walmart_Orders_Items_partial.csv` — a partial/in-progress export of the same shape as `Walmart_Orders_Items.csv`; a subset, not a distinct schema.

There is no code in this repo yet that generates or consumes these CSVs (`shoppping.ipynb` is empty) — the pipeline referenced by the README ("collection" → "categorization") has not been implemented.

Ignore `extra_files/` — it holds older exports (including an orders-level file and a generic-name mapping) that are incomplete, incorrect, or otherwise irrelevant; don't treat it as documentation of the current schema or pipeline.

## Frontend (`frontend/`)

Expo (React Native + TypeScript) app using Expo Router for file-based navigation (`src/app/`), so the same codebase runs as a native iOS/Android app and as a web build. Run all commands from `frontend/`:

- `npm start` — Expo dev server (Metro); scan the QR code with Expo Go, or press `i`/`a`/`w` for iOS/Android/web
- `npm run ios` / `npm run android` / `npm run web` — start dev server targeting a specific platform
- `npm run lint` — `expo lint`

Note: `frontend/AGENTS.md` warns that Expo's API has changed since training data cutoffs and points at the versioned docs (`https://docs.expo.dev/versions/v57.0.0/`) — check those before relying on remembered Expo APIs.

There's no routing/state/data-loading code yet beyond the template's default tabs (`src/app/index.tsx`, `src/app/explore.tsx`) — no HTTP client or service wired up to read the CSV data.
