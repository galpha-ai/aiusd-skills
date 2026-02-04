/**
 * Token Manager - Handles authentication token from multiple sources
 *
 * Priority order:
 * 1. Environment variables (MCP_HUB_TOKEN, AIUSD_TOKEN)
 * 2. mcporter configuration
 * 3. Local token files
 */

import { readFile, access } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';

export interface TokenData {
  token: string;
  timestamp?: number;
  expires_in?: number;
  refresh_token?: string;
}

export class TokenManager {
  /**
   * Get token from environment variables
   */
  private static getTokenFromEnv(): string | null {
    return process.env.MCP_HUB_TOKEN || process.env.AIUSD_TOKEN || null;
  }

  /**
   * Get token from mcporter credentials file
   */
  private static async getTokenFromMcporterCredentials(): Promise<string | null> {
    try {
      const credentialsPath = join(homedir(), '.mcporter', 'credentials.json');
      await access(credentialsPath);
      const content = await readFile(credentialsPath, 'utf8');
      const credentials = JSON.parse(content);

      // Look for tokens in entries
      if (credentials.entries) {
        for (const [key, entry] of Object.entries(credentials.entries as any)) {
          const typedEntry = entry as any;
          if (typedEntry.tokens?.access_token) {
            return typedEntry.tokens.access_token;
          }
        }
      }
    } catch (error) {
      // File doesn't exist or invalid format
    }
    return null;
  }

  /**
   * Get token from mcporter
   */
  private static async getTokenFromMcporter(): Promise<string | null> {
    try {
      // Check if mcporter is available
      execSync('which mcporter', { stdio: 'pipe' });

      // Check if authenticated
      execSync('mcporter auth check', { stdio: 'pipe' });

      // Get token
      const token = execSync('mcporter get-token', { encoding: 'utf8' }).trim();
      return token || null;
    } catch (error) {
      // mcporter not available or not authenticated
    }
    return null;
  }

  /**
   * Get token from local file
   */
  private static async getTokenFromFile(filePath: string): Promise<string | null> {
    try {
      await access(filePath);
      const content = await readFile(filePath, 'utf8');
      const data: TokenData = JSON.parse(content);

      // Check if token is expired
      if (data.timestamp && data.expires_in) {
        const age = Date.now() / 1000 - data.timestamp;
        if (age > data.expires_in) {
          return null;
        }
      }

      return data.token || (data as any).access_token || null;
    } catch (error) {
      // File doesn't exist or invalid format
    }
    return null;
  }

  /**
   * Get token from various sources in priority order
   */
  static async getToken(): Promise<string | null> {
    // 1. Environment variables
    const envToken = this.getTokenFromEnv();
    if (envToken) {
      return this.normalizeToken(envToken);
    }

    // 2. mcporter credentials file
    const mcporterCredentialsToken = await this.getTokenFromMcporterCredentials();
    if (mcporterCredentialsToken) {
      return this.normalizeToken(mcporterCredentialsToken);
    }

    // 3. mcporter CLI
    const mcporterToken = await this.getTokenFromMcporter();
    if (mcporterToken) {
      return this.normalizeToken(mcporterToken);
    }

    // 4. Local token files
    const tokenFiles = [
      join(homedir(), '.mcp-hub', 'token.json'),
      join(homedir(), '.mcporter', 'auth.json'),
    ];

    for (const filePath of tokenFiles) {
      const fileToken = await this.getTokenFromFile(filePath);
      if (fileToken) {
        return this.normalizeToken(fileToken);
      }
    }

    return null;
  }

  /**
   * Ensure token has Bearer prefix
   */
  private static normalizeToken(token: string): string {
    if (!token.startsWith('Bearer ')) {
      return `Bearer ${token}`;
    }
    return token;
  }

  /**
   * Get setup instructions for authentication
   */
  static getSetupInstructions(): string {
    return `Authentication required. Please set up using one of these methods:

1. Environment variable:
   export MCP_HUB_TOKEN="Bearer your_token_here"

2. Use mcporter:
   npx mcporter list --http-url https://mcp.alpha.dev/api/mcp-hub/mcp --name aiusd

3. Manual token file:
   mkdir -p ~/.mcp-hub
   echo '{"token": "Bearer your_token_here", "timestamp": ${Math.floor(Date.now() / 1000)}, "expires_in": 86400}' > ~/.mcp-hub/token.json

To get a token, visit: https://mcp.alpha.dev/oauth/login`;
  }

  /**
   * Validate token format
   */
  static validateToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    if (!token.startsWith('Bearer ')) {
      return false;
    }

    // Basic JWT format check
    const jwtPart = token.substring(7); // Remove "Bearer "
    const parts = jwtPart.split('.');
    if (parts.length !== 3) {
      return false;
    }

    return true;
  }
}