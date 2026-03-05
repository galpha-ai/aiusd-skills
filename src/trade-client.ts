/**
 * Trade Client - HTTP client for /api/trade/* with 401 auto-refresh.
 */

import { TokenManager } from './token-manager.js';

export interface TradeResponse {
  status: 'success' | 'action_required' | 'error';
  result?: Record<string, unknown>;
  reason?: string;
  next_steps?: string[];
  hint?: string;
}

export class TradeClient {
  private baseUrl: string;
  private getToken: () => Promise<string>;

  constructor(baseUrl: string, getToken: () => Promise<string>) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
  }

  async call(endpoint: string, body: Record<string, unknown>): Promise<TradeResponse> {
    const token = await this.getToken();
    const url = `${this.baseUrl}/api/trade/${endpoint}`;

    let response = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    // 401 auto-refresh: try refresh_token then retry
    if (response.status === 401) {
      const stored = await TokenManager.readStoredTokens();
      if (stored?.refresh_token) {
        const refreshed = await TokenManager.refreshAccessToken(stored.refresh_token);
        if (refreshed) {
          const newToken = TokenManager.normalizeToken(refreshed.access_token);
          response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': newToken, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
        }
      }
    }

    if (!response.ok) {
      try {
        return await response.json() as TradeResponse;
      } catch {
        return { status: 'error', reason: `HTTP ${response.status}: ${response.statusText}` };
      }
    }
    return await response.json() as TradeResponse;
  }
}
