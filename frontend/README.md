# Frontend

Expo (React Native + TypeScript) app for visualizing personal shopping order history — the
analysis/visualization UI described in the [repo root README](../README.md). Built with
[Expo Router](https://docs.expo.dev/router/introduction) for file-based navigation, so the
same codebase targets iOS, Android, and web.

There's no data-loading or analysis UI wired up yet — this is still the default Expo Router
tabs template (`src/app/index.tsx`, `src/app/explore.tsx`).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npm start
   ```

   Or target a platform directly:

   ```bash
   npm run ios
   npm run android
   npm run web
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

Routes live in `src/app/`, using Expo's [file-based routing](https://docs.expo.dev/router/introduction).

## Other commands

- `npm run lint` — `expo lint`

## Notes for future work

- Expo's APIs have changed since older training data — check the versioned docs at
  [docs.expo.dev/versions/v57.0.0](https://docs.expo.dev/versions/v57.0.0/) before relying on
  remembered APIs (also called out in [`AGENTS.md`](AGENTS.md)).
- No HTTP client or service is wired up yet to read data from the backend
  (`POST /orders/upload`, see [`backend/CLAUDE.md`](../backend/CLAUDE.md)).

## Learn more

- [Expo documentation](https://docs.expo.dev/): fundamentals and [guides](https://docs.expo.dev/guides).
- [Expo Router documentation](https://docs.expo.dev/router/introduction/): file-based routing used by this app.
