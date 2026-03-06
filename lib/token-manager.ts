/**
 * Token Manager (library version)
 *
 * Priority: env var -> ~/.aiusd/token.json
 * Supports refresh but not interactive auth.
 */

import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

const AIUSD_DIR = join(homedir(), '.aiusd');
const TOKEN_FILE = join(AIUSD_DIR, 'token.json');
const REFRESH_URL = 'https://production.alpha.dev/api/user-service/v1/auth/refresh';

export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  timestamp: number;
}

export class TokenManager {
  private static getTokenFromEnv(): string | null {
    return process.env.AIUSD_TOKEN || null;
  }

  private static async readStoredTokens(): Promise<StoredTokens | null> {
    try {
      await access(TOKEN_FILE);
      const content = await readFile(TOKEN_FILE, 'utf8');
      const data = JSON.parse(content) as StoredTokens;
      if (data.access_token && data.refresh_token && data.expires_in && data.timestamp) {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  }

  private static isExpired(tokens: StoredTokens): boolean {
    const nowSeconds = Math.floor(Date.now() / 1000);
    return nowSeconds >= tokens.timestamp + tokens.expires_in;
  }

  private static async saveTokens(tokens: StoredTokens): Promise<void> {
    await mkdir(AIUSD_DIR, { recursive: true });
    await writeFile(TOKEN_FILE, JSON.stringify(tokens, null, 2), { encoding: 'utf8', mode: 0o600 });
  }

  private static async refreshAccessToken(refreshToken: string): Promise<StoredTokens | null> {
    try {
      const res = await fetch(REFRESH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json() as {
        access_token: string;
        refresh_token: string;
        expires_in: number;
      };

      const tokens: StoredTokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        timestamp: Math.floor(Date.now() / 1000),
      };
      await this.saveTokens(tokens);
      return tokens;
    } catch {
      return null;
    }
  }

  private static normalizeToken(token: string): string {
    return token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }

  static async getToken(): Promise<string | null> {
    const envToken = this.getTokenFromEnv();
    if (envToken) return this.normalizeToken(envToken);

    const stored = await this.readStoredTokens();
    if (stored && !this.isExpired(stored)) {
      return this.normalizeToken(stored.access_token);
    }

    // Try refresh
    if (stored?.refresh_token) {
      const refreshed = await this.refreshAccessToken(stored.refresh_token);
      if (refreshed) return this.normalizeToken(refreshed.access_token);
    }

    return null;
  }

  static getSetupInstructions(): string {
    return 'Authentication required. Run: npm run login';
  }

  static validateToken(token: string): boolean {
    if (!token?.startsWith('Bearer ')) return false;
    return token.substring(7).split('.').length === 3;
  }
}
