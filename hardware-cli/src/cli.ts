#!/usr/bin/env node

/**
 * SMC Hardware CLI Tool
 * Command-line interface for DS12/DS16 hardware control
 * 
 * This tool provides independent hardware control capabilities
 * for DS12/DS16 medication dispensing devices.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { listPortsCommand } from './commands/list-ports';
import { checkStateCommand } from './commands/check-state';
import { unlockCommand } from './commands/unlock';

const program = new Command();

// CLI metadata
program
  .name('smc-hardware-cli')
  .description('SMC Hardware CLI Tool for DS12/DS16 control')
  .version('1.0.0');

// Global options
program
  .option('-v, --verbose', 'enable verbose output')
  .option('-t, --timeout <ms>', 'communication timeout in milliseconds', '3000');

// List Ports Command
program
  .command('list-ports')
  .alias('lp')
  .description('list available serial ports')
  .option('-a, --all', 'show all ports (not just DS12/DS16 candidates)')
  .option('-v, --verbose', 'show detailed port information')
  .action(async (options) => {
    try {
      await listPortsCommand({
        all: options.all,
        verbose: options.verbose || program.opts().verbose
      });
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

// Check State Command
program
  .command('check-state')
  .alias('cs')
  .description('check DS12/DS16 slot states (0x80 command)')
  .option('-p, --port <path>', 'specify serial port path')
  .option('-t, --timeout <ms>', 'communication timeout in milliseconds')
  .option('-v, --verbose', 'show detailed response information')
  .action(async (options) => {
    try {
      await checkStateCommand({
        port: options.port,
        timeout: parseInt(options.timeout || program.opts().timeout),
        verbose: options.verbose || program.opts().verbose
      });
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

// Unlock Command
program
  .command('unlock <slot>')
  .alias('ul')
  .description('unlock specific slot (0x81 command)')
  .option('-p, --port <path>', 'specify serial port path')
  .option('-t, --timeout <ms>', 'communication timeout in milliseconds')
  .option('-v, --verbose', 'show detailed response information')
  .option('-f, --force', 'skip safety warnings')
  .action(async (slot, options) => {
    try {
      await unlockCommand(slot, {
        port: options.port,
        timeout: parseInt(options.timeout || program.opts().timeout),
        verbose: options.verbose || program.opts().verbose,
        force: options.force
      });
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
      process.exit(1);
    }
  });

// Help and examples
program.on('--help', () => {
  console.log('');
  console.log(chalk.cyan('Examples:'));
  console.log('  $ smc-hardware-cli list-ports');
  console.log('  $ smc-hardware-cli list-ports --all --verbose');
  console.log('  $ smc-hardware-cli check-state');
  console.log('  $ smc-hardware-cli check-state --port COM3');
  console.log('  $ smc-hardware-cli unlock 5');
  console.log('  $ smc-hardware-cli unlock 12 --port COM3 --force');
  console.log('');
  console.log(chalk.yellow('Medical Device Notice:'));
  console.log('  This tool controls medical device hardware.');
  console.log('  Ensure proper authorization before use.');
  console.log('');
});

// Error handling
program.exitOverride();

try {
  program.parse();
} catch (err: any) {
  if (err.code === 'commander.help') {
    process.exit(0);
  } else if (err.code === 'commander.version') {
    process.exit(0);
  } else {
    console.error(chalk.red(`CLI Error: ${err.message}`));
    process.exit(1);
  }
}

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}