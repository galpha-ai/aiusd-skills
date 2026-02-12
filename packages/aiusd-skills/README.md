# aiusd-skills

Install the AIUSD skill for OpenClaude / MCP with one command.

## Install the skill

```bash
npx aiusd-skills install
```

This will:

1. Fetch the latest `aiusd-skill` package from npm
2. Extract it to `./aiusd-skill`
3. Run `npm install` in that directory (including patches)

## After install

```bash
cd aiusd-skill
npm run reauth    # complete authentication in browser
npm start -- balances
npm start -- tools --detailed
```

## Publish (maintainers)

1. Publish the skill first: from repo root, `npm publish` (publishes `aiusd-skill`).
2. Publish this CLI: `cd packages/aiusd-skills && npm publish`.

Users can then run `npx aiusd-skills install` without having published this package to npm first—they need `aiusd-skill` on npm.
