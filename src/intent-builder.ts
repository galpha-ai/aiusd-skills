/**
 * Intent Builder — Deterministic XML construction for trading intents.
 *
 * Converts structured parameters into valid intent XML that the MCP Hub / TIM
 * backend expects.  No LLM involved — pure code.
 *
 * Why this exists:
 *   The TIM execute_intent API requires a deeply nested XML string.  Letting an
 *   LLM construct that XML from documentation is fragile (missing <entry>,
 *   <condition>, wrong nesting, etc.).  This module guarantees correct XML
 *   every time.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TradeParams {
  /** buy or sell */
  action: 'buy' | 'sell';
  /** Token to buy (for buy) or token to sell (for sell). Symbol or address. */
  base: string;
  /** Token to pay with (buy) or receive (sell). Defaults to USDC. */
  quote?: string;
  /** Amount — numeric string, or "all" (sell only). */
  amount: string;
  /** Blockchain name: solana, ethereum, base, arbitrum, bsc, polygon */
  chain: string;
  /** Take-profit percentage (optional exit strategy) */
  takeProfit?: number;
  /** Stop-loss percentage (optional exit strategy) */
  stopLoss?: number;
}

export interface BuildResult {
  xml: string;
  /** Human-readable summary of what the intent will do */
  summary: string;
}

// ---------------------------------------------------------------------------
// Chain ID mapping (CAIP-2)
// ---------------------------------------------------------------------------

const CHAIN_MAP: Record<string, string> = {
  solana: 'solana:mainnet-beta',
  ethereum: 'eip155:1',
  eth: 'eip155:1',
  base: 'eip155:8453',
  arbitrum: 'eip155:42161',
  arb: 'eip155:42161',
  bsc: 'eip155:56',
  polygon: 'eip155:137',
  matic: 'eip155:137',
};

// ---------------------------------------------------------------------------
// Known token addresses per chain
// For unknown symbols the builder passes the symbol as-is — TIM resolves it.
// ---------------------------------------------------------------------------

const KNOWN_TOKENS: Record<string, Record<string, string>> = {
  'solana:mainnet-beta': {
    SOL: 'So11111111111111111111111111111111111111112',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  },
  'eip155:1': {
    ETH: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
  'eip155:8453': {
    ETH: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  },
  'eip155:42161': {
    ETH: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  },
  'eip155:56': {
    BNB: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
  },
  'eip155:137': {
    MATIC: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  },
};

const STABLECOINS = new Set(['USDC', 'USDT', 'USD1', 'DAI', 'BUSD']);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a chain name to its CAIP-2 identifier.
 */
export function resolveChainId(chain: string): string {
  const normalized = chain.toLowerCase().trim();
  const chainId = CHAIN_MAP[normalized];
  if (!chainId) {
    // If the user already passed a CAIP-2 id (e.g. "eip155:1"), allow it.
    if (normalized.includes(':')) return normalized;
    const valid = Object.keys(CHAIN_MAP).join(', ');
    throw new Error(`Unknown chain "${chain}". Valid chains: ${valid}`);
  }
  return chainId;
}

/**
 * Resolve a token symbol or address to the value to put in XML.
 * - Known symbol on this chain → canonical address
 * - Raw address (starts with 0x or is 32+ chars for Solana) → pass through
 * - Unknown symbol → pass through (TIM resolves it)
 */
export function resolveToken(symbolOrAddress: string, chainId: string): string {
  const upper = symbolOrAddress.toUpperCase().trim();

  // Check known tokens for this chain
  const chainTokens = KNOWN_TOKENS[chainId];
  if (chainTokens && chainTokens[upper]) {
    return chainTokens[upper];
  }

  // Looks like a raw address — pass through
  if (symbolOrAddress.startsWith('0x') || symbolOrAddress.length >= 32) {
    return symbolOrAddress;
  }

  // Unknown symbol — TIM will resolve it
  return symbolOrAddress;
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

/**
 * Build a valid intent XML string from structured parameters.
 *
 * @throws Error on invalid input (bad chain, AIUSD constraint, etc.)
 */
export function buildIntentXml(params: TradeParams): BuildResult {
  const { action, base, amount, takeProfit, stopLoss } = params;
  const quote = params.quote || 'USDC';
  const chainId = resolveChainId(params.chain);

  // ---- Validate ----

  if (action !== 'buy' && action !== 'sell') {
    throw new Error(`Invalid action "${action}". Must be "buy" or "sell".`);
  }

  if (!base) {
    throw new Error('--base is required (token to buy or sell).');
  }

  if (!amount) {
    throw new Error('--amount is required (number or "all" for sell).');
  }

  if (amount === 'all' && action === 'buy') {
    throw new Error('"all" amount is only supported for sell orders.');
  }

  if (amount !== 'all' && isNaN(Number(amount))) {
    throw new Error(`Invalid amount "${amount}". Must be a number or "all".`);
  }

  // AIUSD constraint: can only trade to stablecoins
  const quoteUpper = quote.toUpperCase();
  const baseUpper = base.toUpperCase();
  if (quoteUpper === 'AIUSD' && !STABLECOINS.has(baseUpper)) {
    throw new Error(
      `AIUSD can only convert to stablecoins (USDC, USDT, USD1). ` +
      `To buy ${base} with AIUSD, do two steps:\n` +
      `  1. trade --action buy --base USDC --quote AIUSD --amount ${amount} --chain ${params.chain}\n` +
      `  2. trade --action buy --base ${base} --quote USDC --amount ${amount} --chain ${params.chain}`
    );
  }

  // ---- Resolve tokens ----

  const baseResolved = resolveToken(base, chainId);
  const quoteResolved = resolveToken(quote, chainId);

  // ---- Build XML ----

  let actionXml: string;
  if (action === 'buy') {
    actionXml =
      `<buy>` +
      `<amount>${amount}</amount>` +
      `<quote>${quoteResolved}</quote>` +
      `<base>${baseResolved}</base>` +
      `</buy>`;
  } else {
    // sell
    if (amount === 'all') {
      actionXml =
        `<sell>` +
        `<amount>all</amount>` +
        `<quote>${quoteResolved}</quote>` +
        `<base>${baseResolved}</base>` +
        `</sell>`;
    } else {
      actionXml =
        `<sell>` +
        `<amount>${amount}</amount>` +
        `<quote>${quoteResolved}</quote>` +
        `<base>${baseResolved}</base>` +
        `</sell>`;
    }
  }

  let exitXml = '';
  if (takeProfit !== undefined || stopLoss !== undefined) {
    let conditionsXml = '';
    if (takeProfit !== undefined) {
      conditionsXml += `<profit_percent>${takeProfit}</profit_percent>`;
    }
    if (stopLoss !== undefined) {
      conditionsXml += `<loss_percent>${stopLoss}</loss_percent>`;
    }
    exitXml = `<exit><conditions>${conditionsXml}</conditions><logic>OR</logic></exit>`;
  }

  const xml =
    `<intent>` +
    `<type>IMMEDIATE</type>` +
    `<chain_id>${chainId}</chain_id>` +
    `<entry>` +
    `<condition><immediate>true</immediate></condition>` +
    `<action>${actionXml}</action>` +
    `</entry>` +
    exitXml +
    `</intent>`;

  // ---- Build human summary ----

  const amountStr = amount === 'all' ? 'all' : amount;
  let summary: string;
  if (action === 'buy') {
    summary = `Buy ${base} with ${amountStr} ${quote} on ${params.chain}`;
  } else {
    summary = `Sell ${amountStr} ${base} for ${quote} on ${params.chain}`;
  }
  if (takeProfit !== undefined) summary += ` (TP: +${takeProfit}%)`;
  if (stopLoss !== undefined) summary += ` (SL: -${stopLoss}%)`;

  return { xml, summary };
}
