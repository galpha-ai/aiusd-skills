/**
 * Token Manager - Handles authentication token retrieval
 *
 * Priority order:
 * 1. CLI argument
 * 2. Environment variables (MCP_HUB_TOKEN, AIUSD_TOKEN)
 * 3. Local token file (~/.mcp-hub/token.json)
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
    const token = process.env.MCP_HUB_TOKEN || process.env.AIUSD_TOKEN;
    if (token) {
      console.log(`Loaded token from environment: ${token.slice(0, 50)}...`);
      return token;
    }
    return null;
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
          console.log('Token expired. Run: aiusd login');
          return null;
        }
      }

      const token = data.token;
      if (token) {
        console.log(`Loaded token from ${filePath}: ${token.slice(0, 50)}...`);
        return token;
      }
    } catch {
      // File doesn't exist or invalid format
    }
    return null;
  }

  static async getToken(cliToken?: string): Promise<string | null> {
    // 1. CLI argument
    if (cliToken) {
      console.log(`Using token from CLI argument: ${cliToken.slice(0, 50)}...`);
      return this.normalizeToken(cliToken);
    }

    // 2. Environment variables
    const envToken = this.getTokenFromEnv();
    if (envToken) {
      return this.normalizeToken(envToken);
    }

    // 3. Local token file
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

  static printTokenInstructions(): void {
    console.log('No authentication token found');
    console.log('');
    console.log('Please set up authentication using one of these methods:');
    console.log('');
    console.log('1. Run OAuth login (recommended):');
    console.log('   npm run oauth');
    console.log('');
    console.log('2. Environment variable:');
    console.log('   export MCP_HUB_TOKEN="Bearer your_token_here"');
    console.log('');
    console.log('3. CLI argument:');
    console.log('   aiusd --token "Bearer your_token_here" <command>');
  }

  static validateToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    if (!token.startsWith('Bearer ')) {
      console.log('Token should start with "Bearer "');
      return false;
    }

    const jwtPart = token.substring(7);
    const parts = jwtPart.split('.');
    if (parts.length !== 3) {
      console.log('Token does not appear to be a valid JWT');
      return false;
    }

    return true;
  }
}
