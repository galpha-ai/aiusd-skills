/**
 * Token Manager - Handles authentication token retrieval
 *
 * Priority order:
 * 1. Environment variables (MCP_HUB_TOKEN, AIUSD_TOKEN)
 * 2. Local token file (~/.mcp-hub/token.json)
 */

import { readFile, access } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

export interface TokenData {
  token: string;
  timestamp?: number;
  expires_in?: number;
}

export class TokenManager {
  private static getTokenFromEnv(): string | null {
    return process.env.MCP_HUB_TOKEN || process.env.AIUSD_TOKEN || null;
  }

  private static async getTokenFromFile(): Promise<string | null> {
    const filePath = join(homedir(), '.mcp-hub', 'token.json');
    try {
      await access(filePath);
      const content = await readFile(filePath, 'utf8');
      const data: TokenData = JSON.parse(content);

      if (data.timestamp && data.expires_in) {
        const age = Date.now() / 1000 - data.timestamp;
        if (age > data.expires_in) {
          return null;
        }
      }

      return data.token || null;
    } catch {
      // File doesn't exist or invalid format
    }
    return null;
  }

  static async getToken(): Promise<string | null> {
    // 1. Environment variables
    const envToken = this.getTokenFromEnv();
    if (envToken) {
      return this.normalizeToken(envToken);
    }

    // 2. Local token file
    const fileToken = await this.getTokenFromFile();
    if (fileToken) {
      return this.normalizeToken(fileToken);
    }

    return null;
  }

  private static normalizeToken(token: string): string {
    if (!token.startsWith('Bearer ')) {
      return `Bearer ${token}`;
    }
    return token;
  }

  static getSetupInstructions(): string {
    return `Authentication required. Please set up using one of these methods:

1. Run OAuth login (recommended):
   npm run oauth

2. Environment variable:
   export MCP_HUB_TOKEN="Bearer your_token_here"

3. Manual token file:
   mkdir -p ~/.mcp-hub
   echo '{"token": "Bearer your_token_here", "timestamp": ${Math.floor(Date.now() / 1000)}, "expires_in": 86400}' > ~/.mcp-hub/token.json`;
  }

  static validateToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    if (!token.startsWith('Bearer ')) {
      return false;
    }

    const jwtPart = token.substring(7);
    const parts = jwtPart.split('.');
    if (parts.length !== 3) {
      return false;
    }

    return true;
  }
}
