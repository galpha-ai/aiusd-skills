# aiusd-skills

Install the AIUSD skill with one command.

## Install

```bash
npx aiusd-skills install
```

This will:

1. Fetch the latest `aiusd-skill` package from npm
2. Extract it to `./aiusd-skill`
3. Run `npm install` in that directory

## After install

```bash
cd aiusd-skill
npm install -g .    # make "aiusd" command available globally
aiusd login         # authenticate (create account or browser login)
aiusd balances      # check balance
aiusd guide spot    # spot trading guide
```

## Publish (maintainers)

1. Publish the skill first: from repo root, `npm publish` (publishes `aiusd-skill`).
2. Publish this CLI: `cd packages/aiusd-skills && npm publish`.
