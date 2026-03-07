/**
 * CLI Interface - Command line interface for AIUSD Skills
 *
 * Provides user-friendly commands that combine:
 * - Token management (TokenManager)
 * - MCP client operations (MCPClient)
 * - Trade API operations (TradeClient)
 */

import { createRequire } from 'module';
import { Command } from 'commander';
import { TokenManager } from './token-manager.js';
import { MCPClient } from './mcp-client.js';
import { TradeClient, type TradeResponse } from './trade-client.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

const require = createRequire(import.meta.url);
const { version: PKG_VERSION } = require('../package.json');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(color: keyof typeof colors, emoji: string, message: string): void {
  console.log(`${colors[color]}${emoji} ${message}${colors.reset}`);
}

function logInfo(message: string): void {
  log('blue', 'ℹ️', message);
}

function logSuccess(message: string): void {
  log('green', '✅', message);
}

function logError(message: string): void {
  log('red', '❌', message);
}

function logWarning(message: string): void {
  log('yellow', '⚠️', message);
}

export class CLI {
  private program: Command;
  private defaultServerUrl = 'https://mcp.alpha.dev/api/mcp-hub/mcp';

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('aiusd')
      .description('AIUSD Skills MCP Client using official TypeScript SDK')
      .version(PKG_VERSION)
      .option('-s, --server <url>', 'MCP server URL', this.defaultServerUrl)
      .option('-t, --token <token>', 'Bearer token for authentication')
      .option('--timeout <ms>', 'Request timeout in milliseconds', '30000');

    // Test connection command
    this.program
      .command('test')
      .description('Test connection to MCP server')
      .action((options) => this.handleTest(options));

    // List tools command
    this.program
      .command('tools')
      .description('List all available tools')
      .option('--detailed', 'Show detailed tool information')
      .action((options) => this.handleListTools(options));

    // Call tool command
    this.program
      .command('call')
      .description('Call a specific tool')
      .argument('<tool-name>', 'Name of the tool to call')
      .option('-p, --params <json>', 'JSON parameters for the tool', '{}')
      .option('--pretty', 'Pretty-print the result')
      .action((toolName, options) => this.handleCallTool(toolName, options));

    // Convenience commands for common operations
    this.program
      .command('balances')
      .description('Get account balances (shortcut for genalpha_get_balances)')
      .option('--pretty', 'Pretty-print the result')
      .action((options) => this.handleCallTool('genalpha_get_balances', { ...options, params: '{}' }));

    this.program
      .command('accounts')
      .description('Get trading accounts (shortcut for genalpha_get_trading_accounts)')
      .option('--pretty', 'Pretty-print the result')
      .action((options) => this.handleCallTool('genalpha_get_trading_accounts', { ...options, params: '{}' }));

    this.program
      .command('transactions')
      .description('Get transaction history')
      .option('-l, --limit <number>', 'Number of transactions to fetch', '10')
      .option('--pretty', 'Pretty-print the result')
      .action((options) => {
        const params = JSON.stringify({ limit: parseInt(options.limit) });
        this.handleCallTool('genalpha_get_transactions', { ...options, params });
      });

    // Get deposit address command
    this.program
      .command('get-deposit-address')
      .description('Get your AIUSD deposit addresses for all supported chains')
      .option('--pretty', 'Pretty-print the result')
      .action((options) => this.handleGetDepositAddress(options));

    // --- Spot subcommand ---
    this.setupSpotCommands();

    // --- Perp subcommand ---
    this.setupPerpCommands();

    // --- HL-Spot subcommand ---
    this.setupHlSpotCommands();

    // --- PM (Prediction Markets) subcommand ---
    this.setupPmCommands();

    // --- Monitor subcommand ---
    this.setupMonitorCommands();

    // --- Market subcommand ---
    this.setupMarketCommands();

    // --- Guide subcommand ---
    this.program
      .command('guide')
      .description('Get the latest usage guide for a domain')
      .argument('[domain]', 'Domain name (spot, perp, hl-spot, prediction, monitor, market, account)')
      .action((domain) => this.handleGuide(domain));

    // --- Login subcommand ---
    this.program
      .command('login')
      .description('Authenticate with AIUSD (create wallet or browser login)')
      .option('--new-wallet', 'Create a new wallet (non-interactive)')
      .option('--browser', 'Browser login (non-interactive, prints URL and exits)')
      .option('--restore <path>', 'Restore from mnemonic backup file (non-interactive)')
      .option('--poll-session <session_id>', 'Poll a browser login session until complete')
      .action((options) => this.handleLogin(options));

    // --- Logout subcommand ---
    this.program
      .command('logout')
      .description('Remove stored tokens and sign out')
      .action(() => this.handleLogout());
  }

  // -------------------------------------------------------------------------
  // Subcommand groups
  // -------------------------------------------------------------------------

  private setupSpotCommands(): void {
    const spot = this.program
      .command('spot')
      .description('Spot trading on DEXes');

    spot
      .command('buy')
      .description('Buy a token on a DEX')
      .requiredOption('-b, --base <token>', 'Token to buy (symbol or address)')
      .requiredOption('-a, --amount <amount>', 'Amount of quote token to spend')
      .option('-q, --quote <token>', 'Quote token (default: USDC)', 'USDC')
      .option('-c, --chain <chain>', 'Blockchain (default: solana)', 'solana')
      .action((options) => this.handleSpot('buy', options));

    spot
      .command('sell')
      .description('Sell a token on a DEX')
      .requiredOption('-b, --base <token>', 'Token to sell (symbol or address)')
      .requiredOption('-a, --amount <amount>', 'Amount to sell (number, "all", or "50%")')
      .option('-q, --quote <token>', 'Quote token (default: USDC)', 'USDC')
      .option('-c, --chain <chain>', 'Blockchain (default: solana)', 'solana')
      .action((options) => this.handleSpot('sell', options));
  }

  private setupPerpCommands(): void {
    const perp = this.program
      .command('perp')
      .description('Perpetual futures on Hyperliquid');

    perp
      .command('long')
      .description('Open a long perpetual position')
      .requiredOption('--asset <sym>', 'Asset symbol (e.g. BTC, ETH)')
      .requiredOption('--size <n>', 'Position size in USD')
      .option('--leverage <n>', 'Leverage multiplier')
      .option('--price <p>', 'Limit price (omit for market)')
      .option('--tp <p>', 'Take-profit trigger price')
      .option('--sl <p>', 'Stop-loss trigger price')
      .action((options) => this.handlePerp('long', options));

    perp
      .command('short')
      .description('Open a short perpetual position')
      .requiredOption('--asset <sym>', 'Asset symbol (e.g. BTC, ETH)')
      .requiredOption('--size <n>', 'Position size in USD')
      .option('--leverage <n>', 'Leverage multiplier')
      .option('--price <p>', 'Limit price (omit for market)')
      .option('--tp <p>', 'Take-profit trigger price')
      .option('--sl <p>', 'Stop-loss trigger price')
      .action((options) => this.handlePerp('short', options));

    perp
      .command('close')
      .description('Close a perpetual position')
      .requiredOption('--asset <sym>', 'Asset symbol to close')
      .action((options) => this.handlePerp('close', options));

    perp
      .command('deposit')
      .description('Deposit USDC to Hyperliquid')
      .requiredOption('--amount <n>', 'Amount of USDC to deposit')
      .action((options) => this.handleCallTool('genalpha_deposit_to_hl', { params: JSON.stringify({ amount: parseFloat(options.amount) }) }));

    perp
      .command('withdraw')
      .description('Withdraw USDC from Hyperliquid')
      .requiredOption('--amount <n>', 'Amount of USDC to withdraw')
      .action((options) => this.handleCallTool('genalpha_withdraw_from_hl', { params: JSON.stringify({ amount: parseFloat(options.amount) }) }));
  }

  private setupHlSpotCommands(): void {
    const hlSpot = this.program
      .command('hl-spot')
      .description('Spot trading on Hyperliquid');

    hlSpot
      .command('buy')
      .description('Buy a token on Hyperliquid spot')
      .requiredOption('--coin <sym>', 'Token symbol to buy')
      .requiredOption('--amount <n>', 'Amount in USDC to spend')
      .option('--price <p>', 'Limit price (omit for market)')
      .action((options) => this.handleHlSpot('buy', options));

    hlSpot
      .command('sell')
      .description('Sell a token on Hyperliquid spot')
      .requiredOption('--coin <sym>', 'Token symbol to sell')
      .requiredOption('--amount <n>', 'Amount of token to sell')
      .option('--price <p>', 'Limit price (omit for market)')
      .action((options) => this.handleHlSpot('sell', options));
  }

  private setupPmCommands(): void {
    const pm = this.program
      .command('pm')
      .description('Prediction markets (Polymarket)');

    pm
      .command('buy')
      .description('Buy shares in a prediction market')
      .requiredOption('--market <slug>', 'Market slug or identifier')
      .requiredOption('--outcome <outcome>', 'Outcome to buy (Yes or No)')
      .requiredOption('--amount <n>', 'Amount in USDC')
      .option('--price <p>', 'Max price per share (0-1)')
      .action((options) => this.handlePmOrder('buy', options));

    pm
      .command('sell')
      .description('Sell shares in a prediction market')
      .requiredOption('--market <slug>', 'Market slug or identifier')
      .requiredOption('--outcome <outcome>', 'Outcome to sell (Yes or No)')
      .requiredOption('--amount <n>', 'Number of shares to sell')
      .option('--price <p>', 'Min price per share (0-1)')
      .action((options) => this.handlePmOrder('sell', options));

    pm
      .command('cancel')
      .description('Cancel an open prediction market order')
      .requiredOption('--order-id <id>', 'Order ID to cancel')
      .action((options) => this.handlePmCancel(options));

    pm
      .command('positions')
      .description('List your prediction market positions')
      .action(() => this.handleCallTool('genalpha_get_prediction_positions', { params: '{}' }));

    pm
      .command('orders')
      .description('List your open prediction market orders')
      .action(() => this.handleCallTool('genalpha_get_prediction_orders', { params: JSON.stringify({ status: 'open' }) }));

    pm
      .command('search')
      .description('Search prediction markets')
      .requiredOption('-q, --query <query>', 'Search query')
      .action((options) => this.handleCallTool('genalpha_search_prediction_markets', { params: JSON.stringify({ query: options.query }) }));
  }

  private setupMonitorCommands(): void {
    const monitor = this.program
      .command('monitor')
      .description('Copy-trading / monitoring');

    monitor
      .command('add')
      .description('Add a wallet or handle to monitor and copy-trade')
      .requiredOption('--handle <user>', 'Twitter handle or wallet address')
      .requiredOption('--budget <n>', 'Budget in USDC per trade')
      .option('--tp <percent>', 'Take-profit percentage (e.g. 20%)')
      .option('--sl <percent>', 'Stop-loss percentage (e.g. 10%)')
      .action((options) => this.handleMonitorAdd(options));

    monitor
      .command('list')
      .description('List active conditional orders / monitors')
      .action(() => this.handleCallTool('genalpha_list_conditional_orders', { params: '{}' }));

    monitor
      .command('cancel')
      .description('Cancel a conditional order / monitor')
      .requiredOption('--order-id <id>', 'Order ID to cancel')
      .action((options) => this.handleCallTool('genalpha_cancel_conditional_order', { params: JSON.stringify({ order_id: options.orderId }) }));
  }

  private setupMarketCommands(): void {
    const market = this.program
      .command('market')
      .description('Market data and analytics');

    market
      .command('hot-tokens')
      .description('Get trending / hot tokens')
      .action(() => this.handleCallTool('genalpha_get_hot_tokens', { params: '{}' }));
  }

  // -------------------------------------------------------------------------
  // Shared helpers
  // -------------------------------------------------------------------------

  private getServerBaseUrl(): string {
    const globalOptions = this.program.opts();
    const serverUrl: string = globalOptions.server || this.defaultServerUrl;
    // Strip /mcp suffix to get the base URL
    return serverUrl.replace(/\/mcp$/, '');
  }

  private async createTradeClient(): Promise<TradeClient> {
    const baseUrl = this.getServerBaseUrl();
    const globalOptions = this.program.opts();

    return new TradeClient(baseUrl, async () => {
      const token = await TokenManager.ensureToken(globalOptions.token);
      if (!token) {
        const authToken = await this.runFirstTimeAuth();
        if (!authToken) {
          console.log('Authentication required. Exiting.');
          process.exit(1);
        }
        return authToken;
      }
      return token;
    });
  }

  private formatTradeResponse(resp: TradeResponse): void {
    if (resp.status === 'success') {
      console.log(JSON.stringify(resp.result, null, 2));
    } else if (resp.status === 'action_required') {
      console.log(`\nAction Required: ${resp.reason}`);
      if (resp.next_steps?.length) {
        console.log('\nNext steps:');
        resp.next_steps.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
      }
      if (resp.hint) console.log(`\nHint: ${resp.hint}`);
    } else {
      console.error(`Error: ${resp.reason}`);
      process.exit(1);
    }
  }

  private async createClient(options: any): Promise<MCPClient> {
    const globalOptions = this.program.opts();
    let token = await TokenManager.ensureToken(globalOptions.token || options.token);

    if (!token) {
      token = await this.runFirstTimeAuth();
      if (!token) {
        console.log('Authentication required. Exiting.');
        process.exit(1);
      }
    }

    const serverUrl = globalOptions.server || options.server || this.defaultServerUrl;
    const timeout = parseInt(globalOptions.timeout || options.timeout || '30000');

    return await MCPClient.create({
      serverUrl,
      authToken: token,
      timeout,
    });
  }

  private async runFirstTimeAuth(): Promise<string | null> {
    console.log('\nNo authentication found. Choose a method:\n');
    console.log('  (a) Create new wallet');
    console.log('  (b) Use existing wallet (browser signing)');
    console.log('  (c) Restore from mnemonic backup file');
    console.log('');

    const choice = await this.prompt('Enter choice [a/b/c]: ');

    switch (choice.toLowerCase()) {
      case 'a':
        return this.authNewWallet();
      case 'b':
        return this.authExistingWallet();
      case 'c':
        return this.authMnemonicRestore();
      default:
        console.log('Invalid choice.');
        return null;
    }
  }

  private async prompt(question: string): Promise<string> {
    const { createInterface } = await import('readline');
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
      rl.question(question, answer => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }

  private async authNewWallet(): Promise<string | null> {
    const { Wallet } = await import('ethers');
    const wallet = Wallet.createRandom();
    const mnemonic = wallet.mnemonic?.phrase;

    if (!mnemonic) {
      logError('Failed to generate wallet.');
      return null;
    }

    await TokenManager.saveMnemonic(mnemonic);

    // Output structured info for host agent (openClaw etc.)
    const authEvent = {
      auth_event: 'wallet_created',
      mnemonic_file: TokenManager.MNEMONIC_FILE_PATH,
      mnemonic,
      warning: 'Loss of mnemonic means permanent loss of account access. Please back up securely.',
      address: wallet.address,
    };
    console.log('\n' + JSON.stringify(authEvent, null, 2) + '\n');

    logInfo('Authenticating with new wallet...');
    const tokens = await TokenManager.challengeVerify(wallet);
    if (!tokens) {
      logError('Authentication failed.');
      return null;
    }

    logSuccess('Authentication successful.');
    return TokenManager.normalizeToken(tokens.access_token);
  }

  private async authExistingWallet(): Promise<string | null> {
    const session = await TokenManager.createAgentSession();
    if (!session) {
      logError('Failed to create auth session.');
      return null;
    }

    const url = `${TokenManager.AGENT_AUTH_URL}?sid=${session.session_id}`;

    // Cache session locally for recovery
    await TokenManager.savePendingSession({
      session_id: session.session_id,
      expires_at: session.expires_at,
    });

    const output = {
      auth_event: 'browser_login',
      url,
      session_id: session.session_id,
      expires_at: session.expires_at,
      message: 'Send the URL to the user. Then run: aiusd login --poll-session <session_id>',
    };
    console.log(JSON.stringify(output, null, 2));
    return 'pending';
  }

  private async authMnemonicRestore(): Promise<string | null> {
    const filePath = await this.prompt('Enter path to mnemonic backup file: ');
    if (!filePath) {
      logError('No path provided.');
      return null;
    }
    return this.authMnemonicRestoreFromFile(filePath);
  }

  private async authMnemonicRestoreFromFile(filePath: string): Promise<string | null> {
    try {
      const { readFile } = await import('fs/promises');
      const mnemonic = (await readFile(filePath, 'utf8')).trim();

      const { Wallet } = await import('ethers');
      const wallet = Wallet.fromPhrase(mnemonic);

      await TokenManager.saveMnemonic(mnemonic);
      logSuccess(`Wallet restored: ${wallet.address}`);

      const tokens = await TokenManager.challengeVerify(wallet);
      if (!tokens) {
        logError('Authentication failed.');
        return null;
      }

      logSuccess('Authentication successful.');
      return TokenManager.normalizeToken(tokens.access_token);
    } catch (error) {
      logError(`Failed to restore from mnemonic: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Trade handlers (use TradeClient)
  // -------------------------------------------------------------------------

  private async handleSpot(action: 'buy' | 'sell', options: any): Promise<void> {
    try {
      const client = await this.createTradeClient();
      const body: Record<string, unknown> = {
        action,
        base: options.base,
        quote: options.quote,
        amount: options.amount,
        chain: options.chain,
      };
      logInfo(`Spot ${action}: ${options.amount} ${action === 'buy' ? options.quote + ' -> ' + options.base : options.base + ' -> ' + options.quote} on ${options.chain}`);
      const resp = await client.call('spot', body);
      this.formatTradeResponse(resp);
    } catch (error) {
      logError(`Spot ${action} failed: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  }

  private async handlePerp(action: 'long' | 'short' | 'close', options: any): Promise<void> {
    try {
      const client = await this.createTradeClient();

      if (action === 'close') {
        logInfo(`Perp close: ${options.asset}`);
        const resp = await client.call('close-perp', { asset: options.asset });
        this.formatTradeResponse(resp);
        return;
      }

      const body: Record<string, unknown> = {
        direction: action,
        asset: options.asset,
        size: options.size,
      };
      if (options.leverage) body.leverage = parseInt(options.leverage, 10);
      if (options.price) body.price = options.price;
      if (options.tp) body.take_profit = options.tp;
      if (options.sl) body.stop_loss = options.sl;
      logInfo(`Perp ${action}: ${options.asset} size=${options.size}`);
      const resp = await client.call('perp', body);
      this.formatTradeResponse(resp);
    } catch (error) {
      logError(`Perp ${action} failed: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  }

  private async handleHlSpot(action: 'buy' | 'sell', options: any): Promise<void> {
    try {
      const client = await this.createTradeClient();
      const body: Record<string, unknown> = {
        action,
        token: options.coin,
        amount: options.amount,
      };
      if (options.price) body.price = options.price;
      logInfo(`HL-Spot ${action}: ${options.coin} amount=${options.amount}`);
      const resp = await client.call('hl-spot', body);
      this.formatTradeResponse(resp);
    } catch (error) {
      logError(`HL-Spot ${action} failed: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  }

  private async handlePmOrder(action: 'buy' | 'sell', options: any): Promise<void> {
    try {
      const client = await this.createTradeClient();
      const body: Record<string, unknown> = {
        action,
        market: options.market,
        outcome: options.outcome,
        amount: options.amount,
      };
      if (options.price) body.price = options.price;
      logInfo(`PM ${action}: ${options.outcome} on ${options.market} for ${options.amount}`);
      const resp = await client.call('prediction', body);
      this.formatTradeResponse(resp);
    } catch (error) {
      logError(`PM ${action} failed: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  }

  private async handlePmCancel(options: any): Promise<void> {
    try {
      const client = await this.createTradeClient();
      const body: Record<string, unknown> = {
        order_id: options.orderId,
      };
      logInfo(`PM cancel: order ${options.orderId}`);
      const resp = await client.call('cancel-prediction', body);
      this.formatTradeResponse(resp);
    } catch (error) {
      logError(`PM cancel failed: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  }

  private async handleMonitorAdd(options: any): Promise<void> {
    try {
      const client = await this.createTradeClient();
      const body: Record<string, unknown> = {
        handle: options.handle,
        budget: options.budget,
      };
      if (options.tp) body.take_profit = options.tp;
      if (options.sl) body.stop_loss = options.sl;
      logInfo(`Monitor add: ${options.handle} budget=${options.budget}`);
      const resp = await client.call('monitor', body);
      this.formatTradeResponse(resp);
    } catch (error) {
      logError(`Monitor add failed: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  }

  // -------------------------------------------------------------------------
  // Logout handler
  // -------------------------------------------------------------------------

  private async handleLogin(options: { newWallet?: boolean; browser?: boolean; restore?: string; pollSession?: string } = {}): Promise<void> {
    // --poll-session: wait for a browser login session to complete
    if (options.pollSession) {
      return this.handlePollSession(options.pollSession);
    }

    // Only check stored token file — do NOT use ensureToken() which
    // auto-recovers from mnemonic and would bypass the login flow.
    const existing = await TokenManager.getToken();
    if (existing) {
      logInfo('Already logged in.');
      return;
    }

    let token: string | null = null;

    // Non-interactive flags take priority over interactive prompt
    if (options.newWallet) {
      token = await this.authNewWallet();
    } else if (options.browser) {
      token = await this.authExistingWallet();
    } else if (options.restore) {
      token = await this.authMnemonicRestoreFromFile(options.restore);
    } else {
      token = await this.runFirstTimeAuth();
    }

    if (token === 'pending') {
      // Browser login: URL printed, agent should send URL then run --poll-session
      return;
    } else if (token) {
      logInfo('Login successful.');
    } else {
      logError('Login failed.');
      process.exit(1);
    }
  }

  private async handlePollSession(sessionId: string): Promise<void> {
    logInfo('Waiting for browser sign-in...');
    const tokens = await TokenManager.pollAgentSession(sessionId);
    if (tokens) {
      await TokenManager.clearPendingSession();
      logSuccess('Login successful.');
    } else {
      logError('Login expired. Please try again.');
      process.exit(1);
    }
  }

  private async handleLogout(): Promise<void> {
    const { unlink } = await import('fs/promises');
    const { join } = await import('path');
    const { homedir } = await import('os');
    const tokenFile = join(homedir(), '.aiusd', 'token.json');
    try {
      await unlink(tokenFile);
      console.log('Logged out. Token removed.');
    } catch {
      console.log('No active session found.');
    }
  }

  // -------------------------------------------------------------------------
  // Guide handler (stateless, no auth)
  // -------------------------------------------------------------------------

  private async handleGuide(domain?: string): Promise<void> {
    try {
      const baseUrl = this.getServerBaseUrl();
      if (!domain) {
        const resp = await fetch(`${baseUrl}/api/trade/guides`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json() as { domains: string[] };
        console.log('Available domains:');
        data.domains.forEach((d: string) => console.log(`  - ${d}`));
        console.log('\nUsage: aiusd guide <domain>');
        return;
      }
      const resp = await fetch(`${baseUrl}/api/trade/guides/${domain}`);
      if (!resp.ok) {
        if (resp.status === 404) {
          logError(`Unknown domain: ${domain}. Run 'aiusd guide' to see available domains.`);
        } else {
          logError(`Failed to fetch guide: HTTP ${resp.status}`);
        }
        process.exit(1);
      }
      const data = await resp.json() as { domain: string; version: string; guide: string };
      console.log(data.guide);
    } catch (error) {
      logError(`Failed to fetch guide: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  }

  // -------------------------------------------------------------------------
  // Original handlers (use MCPClient)
  // -------------------------------------------------------------------------

  private async handleTest(options: any): Promise<void> {
    try {
      logInfo('Testing connection to MCP server...');

      const client = await this.createClient(options);

      const isConnected = await client.testConnection();
      if (isConnected) {
        logSuccess('Connection test successful');
        const info = await client.getServerInfo();
        console.log('');
        console.log('📋 Connection Info:');
        console.log(JSON.stringify(info, null, 2));
      } else {
        logError('Connection test failed');
        process.exit(1);
      }

      await client.disconnect();
    } catch (error) {
      logError(`Connection test failed: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  }

  private async handleListTools(options: any): Promise<void> {
    try {
      logInfo('Fetching available tools...');

      const client = await this.createClient(options);
      const tools = await client.listTools();

      console.log('');
      console.log(`📋 Available Tools (${tools.length}):`);
      console.log('');

      tools.forEach((tool: Tool) => {
        console.log(`  • ${colors.cyan}${tool.name}${colors.reset}`);
        if (tool.description && options.detailed) {
          console.log(`    ${tool.description}`);
        }
        if (tool.inputSchema && options.detailed) {
          console.log(`    Input: ${JSON.stringify(tool.inputSchema, null, 2).replace(/\n/g, '\n    ')}`);
        }
        if (!options.detailed && tool.description) {
          // Show one-line description even without --detailed
          const shortDesc = tool.description.split('\n')[0];
          console.log(`    ${colors.yellow}${shortDesc}${colors.reset}`);
        }
        console.log('');
      });

      await client.disconnect();
    } catch (error) {
      logError(`Failed to list tools: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  }

  private async handleCallTool(toolName: string, options: any): Promise<void> {
    try {
      // Parse parameters
      let params: Record<string, any> = {};
      if (options.params && options.params !== '{}') {
        try {
          params = JSON.parse(options.params);
        } catch (error) {
          logError(`Invalid JSON parameters: ${error instanceof Error ? error.message : error}`);
          process.exit(1);
        }
      }

      logInfo(`Calling tool: ${toolName}`);
      if (Object.keys(params).length > 0) {
        console.log(`Parameters: ${JSON.stringify(params)}`);
      }

      const client = await this.createClient(options);
      const result = await client.callTool(toolName, params);

      console.log('');
      console.log('📋 Tool Result:');
      console.log('');

      const formattedResult = MCPClient.formatToolResult(result);

      if (options.pretty) {
        try {
          // Try to parse as JSON for pretty printing
          const jsonResult = JSON.parse(formattedResult);
          console.log(JSON.stringify(jsonResult, null, 2));
        } catch {
          // Not JSON, print as-is
          console.log(formattedResult);
        }
      } else {
        console.log(formattedResult);
      }

      await client.disconnect();
    } catch (error) {
      logError(`Tool call failed: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  }

  private async handleGetDepositAddress(options: any): Promise<void> {
    try {
      // Get authentication token
      const globalOptions = this.program.opts();
      let token = await TokenManager.ensureToken(globalOptions.token || options.token);
      if (!token) {
        token = await this.runFirstTimeAuth();
        if (!token) {
          console.log('Authentication required. Exiting.');
          process.exit(1);
        }
      }

      logInfo('Fetching deposit addresses...');

      // Call the deposit addresses API directly
      const response = await fetch('https://production.alpha.dev/api/user-service/users/deposit-addresses/refresh', {
        method: 'POST',
        headers: {
          'Authorization': token,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });

      if (!response.ok) {
        throw new Error(`API returned error status ${response.status}`);
      }

      const data = await response.json();

      console.log('');
      console.log('💎 Your AIUSD Deposit Addresses:');
      console.log('');
      console.log('📌 Important Deposit Rules:');
      console.log('   • Tron: ONLY USDT (not USDC!)');
      console.log('   • Other chains: ONLY USDC (not USDT!)');
      console.log('   • Minimum deposit: $10');
      console.log('   • Tokens will be automatically converted to AIUSD');
      console.log('');

      // Chain name mapping
      const chainNames: { [key: string]: string } = {
        'eip155:1': 'Ethereum',
        'eip155:56': 'BSC',
        'eip155:8453': 'Base',
        'eip155:42161': 'Arbitrum',
        'eip155:137': 'Polygon',
        'solana:mainnet-beta': 'Solana',
        'tron:mainnet': 'Tron',
      };

      // Group addresses by actual address (to detect if they're the same)
      const addressMap = new Map<string, string[]>();

      // Handle new API response structure
      const addresses = data.addresses || data.accounts || [];

      addresses.forEach((item: any) => {
        // Support both old and new response formats
        const address = item.address || item.account_address;
        const chainId = item.chain_id;
        const chainName = chainNames[chainId] || chainId;

        if (!addressMap.has(address)) {
          addressMap.set(address, []);
        }
        addressMap.get(address)!.push(chainName);
      });

      // Display addresses
      if (addressMap.size === 1) {
        // All chains use the same address
        const [address, chains] = Array.from(addressMap.entries())[0];
        console.log('🔷 Universal Deposit Address (All Chains):');
        console.log(`   ${address}`);
        console.log('');
        console.log('   Supported chains:');
        chains.forEach(chain => {
          console.log(`   • ${chain}`);
        });
      } else {
        // Different addresses for different chains
        console.log('🔷 Chain-Specific Deposit Addresses:');
        console.log('');

        // Show Solana first if it exists (USDC only)
        const solanaItem = addresses.find((item: any) => item.chain_id === 'solana:mainnet-beta');
        if (solanaItem) {
          console.log('🌐 Solana (USDC):');
          console.log(`   ${solanaItem.address || solanaItem.account_address}`);
          console.log('');
        }

        // Show Tron if it exists (USDT only!)
        const tronItem = addresses.find((item: any) => item.chain_id === 'tron:mainnet');
        if (tronItem) {
          console.log('🔶 Tron (USDT ONLY):');
          console.log(`   ${tronItem.address || tronItem.account_address}`);
          console.log('   ⚠️  Only USDT accepted on Tron!');
          console.log('');
        }

        // Group EVM chains if they share addresses
        const evmItems = addresses.filter((item: any) => item.chain_id.startsWith('eip155:'));
        const evmAddressMap = new Map<string, string[]>();

        evmItems.forEach((item: any) => {
          const address = item.address || item.account_address;
          const chainName = chainNames[item.chain_id] || item.chain_id;

          if (!evmAddressMap.has(address)) {
            evmAddressMap.set(address, []);
          }
          evmAddressMap.get(address)!.push(chainName);
        });

        evmAddressMap.forEach((chains, address) => {
          if (chains.length > 1) {
            console.log(`⚡ EVM Chains - USDC (${chains.join(', ')}):`);
          } else {
            console.log(`⚡ ${chains[0]} (USDC):`);
          }
          console.log(`   ${address}`);
          console.log('');
        });
      }

      console.log('');
      console.log('💡 After depositing, use the "balances" command to check your AIUSD balance.');
      console.log('');
      console.log('⚠️  CRITICAL: Wrong token = Lost funds!');
      console.log('   • Tron → USDT only');
      console.log('   • All others → USDC only');

      if (options.pretty && data) {
        console.log('');
        console.log('📋 Full Response:');
        console.log(JSON.stringify(data, null, 2));
      }
    } catch (error) {
      logError(`Failed to get deposit addresses: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  }

  public async run(argv: string[]): Promise<void> {
    try {
      await this.program.parseAsync(argv);
    } catch (error) {
      logError(`CLI error: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  }

  public getProgram(): Command {
    return this.program;
  }
}
