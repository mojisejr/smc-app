/**
 * SMC Hardware CLI - Main Module Exports
 * 
 * This module provides programmatic access to DS12/DS16 hardware
 * control functions for integration with other applications.
 */

// Protocol exports
export * from './protocol/constants';
export * from './protocol/packet-builder';
export * from './protocol/parser';

// Serial communication exports
export * from './serial/connection';
export * from './serial/port-detector';

// Command exports
export * from './commands/list-ports';
export * from './commands/check-state';
export * from './commands/unlock';

// Main CLI export (programmatic access)
export * from './cli';