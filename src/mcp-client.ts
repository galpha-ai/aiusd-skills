/**
 * MCP Client - Official SDK implementation for AIUSD Skills
 *
 * Uses the official MCP TypeScript SDK to handle:
 * - Session management and initialization
 * - Tool listing and calling
 * - Error handling and retries
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { CallToolResult, ListToolsResult, Tool } from '@modelcontextprotocol/sdk/types.js';

export interface MCPClientOptions {
  serverUrl: string;
  authToken: string;
  timeout?: number;
  retries?: number;
}

export class MCPClient {
  private client: Client | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private connected: boolean = false;

  constructor(private options: MCPClientOptions) {
    this.options.timeout = this.options.timeout || 30000;
    this.options.retries = this.options.retries || 3;
  }

  /**
   * Initialize connection to MCP server
   */
  async connect(): Promise<void> {
    try {
      console.log(`🔄 Connecting to MCP server: ${this.options.serverUrl}`);

      // Create custom fetch function with Bearer token
      const authFetch = async (url: string | URL | Request, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        headers.set('Authorization', this.options.authToken);

        return fetch(url, {
          ...init,
          headers,
        });
      };

      // Create HTTP transport with Bearer token
      this.transport = new StreamableHTTPClientTransport(
        new URL(this.options.serverUrl),
        {
          fetch: authFetch,
        }
      );

      // Create MCP client with capabilities
      this.client = new Client(
        {
          name: 'aiusd-skills',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      // Connect to server (this handles initialize automatically)
      await this.client.connect(this.transport);

      this.connected = true;
      console.log('✅ Successfully connected to MCP server');
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to MCP server: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Disconnect from server
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        console.log('✅ Disconnected from MCP server');
      } catch (error) {
        console.log('⚠️  Error during disconnect:', error);
      }
    }
    this.client = null;
    this.transport = null;
    this.connected = false;
  }

  /**
   * Ensure connected before operations
   */
  private ensureConnected(): void {
    if (!this.connected || !this.client) {
      throw new Error('Not connected to MCP server. Call connect() first.');
    }
  }

  /**
   * List all available tools
   */
  async listTools(): Promise<Tool[]> {
    this.ensureConnected();

    try {
      console.log('🔄 Listing available tools...');
      const result: ListToolsResult = await this.client!.listTools();
      console.log(`✅ Found ${result.tools?.length || 0} tools`);
      return result.tools || [];
    } catch (error) {
      throw new Error(`Failed to list tools: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Call a specific tool
   */
  async callTool(name: string, arguments_: Record<string, any> = {}): Promise<any> {
    this.ensureConnected();

    try {
      console.log(`🔄 Calling tool: ${name}`);

      const result = await this.client!.callTool({
        name,
        arguments: arguments_,
      });

      console.log(`✅ Tool '${name}' executed successfully`);
      return result;
    } catch (error) {
      throw new Error(`Failed to call tool '${name}': ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Get server information
   */
  async getServerInfo(): Promise<any> {
    this.ensureConnected();

    try {
      // The connection process already exchanges server info
      // We can access it through the client
      console.log('📋 Server connection established with capabilities');
      return {
        connected: this.connected,
        serverUrl: this.options.serverUrl,
        client: 'aiusd-skills v1.0.0',
      };
    } catch (error) {
      throw new Error(`Failed to get server info: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Test connection by calling a simple operation
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.listTools();
      return true;
    } catch (error) {
      console.log('❌ Connection test failed:', error);
      return false;
    }
  }

  /**
   * Utility method to format tool results for display
   */
  static formatToolResult(result: any): string {
    if (!result.content || result.content.length === 0) {
      return 'No content returned';
    }

    return result.content
      .map((content: any) => {
        if (content.type === 'text') {
          return content.text;
        } else if (content.type === 'resource') {
          return `Resource: ${content.resource?.uri || 'Unknown'}`;
        } else {
          return JSON.stringify(content, null, 2);
        }
      })
      .join('\n\n');
  }

  /**
   * Create a client instance with automatic connection
   */
  static async create(options: MCPClientOptions): Promise<MCPClient> {
    const client = new MCPClient(options);
    await client.connect();
    return client;
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.connected;
  }
}