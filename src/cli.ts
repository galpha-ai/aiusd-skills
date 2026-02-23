/**
 * CLI Interface - Command line interface for AIUSD Skills
 *
 * Provides user-friendly commands that combine:
 * - Token management (TokenManager)
 * - MCP client operations (MCPClient)
 */

import { Command } from 'commander';
import { TokenManager } from './token-manager.js';
import { MCPClient } from './mcp-client.js';
import { buildIntentXml } from './intent-builder.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

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
      .name('aiusd-client')
      .description('AIUSD Skills MCP Client using official TypeScript SDK')
      .version('1.0.0')
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

    // Trade command — structured parameters, deterministic XML construction
    this.program
      .command('trade')
      .description('Execute a trade (builds intent XML automatically)')
      .requiredOption('-a, --action <action>', 'buy or sell')
      .requiredOption('-b, --base <token>', 'Token to buy/sell (symbol or address)')
      .option('-q, --quote <token>', 'Token to pay with (default: USDC)', 'USDC')
      .requiredOption('--amount <amount>', 'Amount (number or "all" for sell)')
      .requiredOption('-c, --chain <chain>', 'Blockchain: solana, ethereum, base, arbitrum, bsc, polygon')
      .option('--take-profit <percent>', 'Take-profit percentage')
      .option('--stop-loss <percent>', 'Stop-loss percentage')
      .option('--dry-run', 'Print the generated XML without executing')
      .option('--pretty', 'Pretty-print the result')
      .action((options) => this.handleTrade(options));

    // Get deposit address command
    this.program
      .command('get-deposit-address')
      .description('Get your AIUSD deposit addresses for all supported chains')
      .option('--pretty', 'Pretty-print the result')
      .action((options) => this.handleGetDepositAddress(options));
  }

  private async createClient(options: any): Promise<MCPClient> {
    // Get authentication token
    const globalOptions = this.program.opts();
    const token = await TokenManager.getToken(globalOptions.token || options.token);

    if (!token) {
      TokenManager.printTokenInstructions();
      process.exit(1);
    }

    if (!TokenManager.validateToken(token)) {
      logError('Invalid token format');
      process.exit(1);
    }

    // Create and connect MCP client
    const serverUrl = globalOptions.server || options.server || this.defaultServerUrl;
    const timeout = parseInt(globalOptions.timeout || options.timeout || '30000');

    logSuccess('Authentication token found');

    return await MCPClient.create({
      serverUrl,
      authToken: token,
      timeout,
    });
  }

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

  private async handleTrade(options: any): Promise<void> {
    try {
      // Build intent XML from structured params
      const { xml, summary } = buildIntentXml({
        action: options.action,
        base: options.base,
        quote: options.quote,
        amount: options.amount,
        chain: options.chain,
        takeProfit: options.takeProfit ? parseFloat(options.takeProfit) : undefined,
        stopLoss: options.stopLoss ? parseFloat(options.stopLoss) : undefined,
      });

      logInfo(`Trade: ${summary}`);

      if (options.dryRun) {
        console.log('');
        console.log('📋 Generated Intent XML (dry run):');
        console.log(xml);
        return;
      }

      // Execute via MCP
      const client = await this.createClient(options);
      const result = await client.callTool('genalpha_execute_intent', { intent: xml });

      console.log('');
      console.log('📋 Trade Result:');
      console.log('');

      const formattedResult = MCPClient.formatToolResult(result);

      if (options.pretty) {
        try {
          const jsonResult = JSON.parse(formattedResult);
          console.log(JSON.stringify(jsonResult, null, 2));
        } catch {
          console.log(formattedResult);
        }
      } else {
        console.log(formattedResult);
      }

      await client.disconnect();
    } catch (error) {
      logError(`Trade failed: ${error instanceof Error ? error.message : error}`);
      process.exit(1);
    }
  }

  private async handleGetDepositAddress(options: any): Promise<void> {
    try {
      // Get authentication token
      const globalOptions = this.program.opts();
      const token = await TokenManager.getToken(globalOptions.token || options.token);

      if (!token) {
        TokenManager.printTokenInstructions();
        process.exit(1);
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