#!/usr/bin/env node
/**
 * AIUSD Skills - MCP Client Entry Point
 *
 * Command line interface for interacting with AIUSD MCP services
 * using the official MCP TypeScript SDK
 */

import { CLI } from './cli.js';

async function main(): Promise<void> {
  const cli = new CLI();
  await cli.run(process.argv);
}

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

main().catch((error) => {
  console.error('❌ Fatal error:', error instanceof Error ? error.message : error);
  process.exit(1);
});