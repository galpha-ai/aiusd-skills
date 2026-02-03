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