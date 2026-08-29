// https://docs.expo.dev/guides/using-eslint/
//
// This file must stay committed. `expo lint` bootstraps a config and installs
// ESLint on the fly when none is present, then exits 0 WITHOUT linting - which
// made the CI lint step a false green for two runs. With this file tracked,
// `expo lint` skips the bootstrap and actually lints.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // dist/ is the web build output. .expo/ holds generated router types and
    // scaffolding that CI recreates via `expo customize tsconfig.json` - both
    // are machine-written, so a rule violation in them would fail the build
    // over code nobody can edit.
    ignores: ['dist/*', '.expo/*'],
  },
]);
